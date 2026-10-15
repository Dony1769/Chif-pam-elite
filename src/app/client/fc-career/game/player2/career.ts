/**
 * FC CAREER 27 — Carrière Joueur v2 : la carrière autour des matchs (Lot J3).
 * Salaire et primes, offres de clubs, demande de transfert ou de prêt,
 * changement de club, prolongation, fin de contrat, sélection nationale,
 * récompenses de fin de saison. Fonctions pures et déterministes.
 */

import type { Club } from "../domain/club";
import { getLeaguePosition, getManagedClub, squadStrength } from "../manager/engine";
import { isWindowOpen } from "../manager/market";
import { aiTacticFor, autoPickLineup } from "../manager/tactics";
import type { LiveMatch } from "../manager/matchSim";
import { createRng, seedFromString } from "../utils/random";
import { overallOf } from "./attributes";
import type { Award, CareerExtras, ClubOffer, PlayerCareerState, SquadRole } from "./types";
import {
  avgRating, coachDecision, me, myClub, playPlayerWeek, pmsg, pushPlayerInbox, syncWorldPlayer,
} from "./engine";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const weekIndex = (s: PlayerCareerState) => s.shadow.world.season * 100 + s.shadow.world.currentWeek;
const money = (v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1).replace(".", ",")} M€` : v >= 1000 ? `${Math.round(v / 1000)} k€` : `${Math.round(v)} €`);

export interface CareerResult {
  ok: boolean;
  state: PlayerCareerState;
  message: string;
}
const fail = (state: PlayerCareerState, message: string): CareerResult => ({ ok: false, state, message });
const done = (state: PlayerCareerState, message: string): CareerResult => ({ ok: true, state, message });

// ─── Initialisation ──────────────────────────────────────────────────────────

export function ensureCareer(s: PlayerCareerState): PlayerCareerState {
  if (s.career) return s;
  const countries = s.shadow.world.countries.map(c => c.id);
  const countryId = countries.includes(s.profile.nationality) ? s.profile.nationality : myClub(s).countryId;
  const career: CareerExtras = {
    bank: 0, offers: [], transferRequested: false, loan: null,
    national: { countryId, called: false, caps: 0, goals: 0, lastWindow: 0 },
    awards: [], freeAgentSince: null,
  };
  return { ...s, career };
}
const C = (s: PlayerCareerState) => s.career!;
const withCareer = (s: PlayerCareerState, patch: Partial<CareerExtras>) => ({ ...s, career: { ...C(s), ...patch } });

// ─── Valeur du joueur ────────────────────────────────────────────────────────

/** Valeur marchande (même formule que les joueurs du monde) majorée par la réputation. */
export function marketValue(s: PlayerCareerState): number {
  const p = me(s);
  const base = Math.pow(Math.max(0, p.overall - 50), 2.3) * 1200;
  const ageF = p.age <= 22 ? 1.6 : p.age <= 27 ? 1.2 : p.age <= 31 ? 0.9 : 0.5;
  const potF = p.potential - p.overall >= 8 ? 1.3 : 1;
  const repF = 1 + s.profile.reputation / 200;
  return Math.max(50_000, Math.round((base * ageF * potF * repF) / 10_000) * 10_000);
}

/** Salaire qu'un club peut proposer : part de sa masse salariale selon le rôle. */
export function wageFor(club: Club, role: SquadRole, reputation: number): number {
  const share = role === "key" ? 0.09 : role === "starter" ? 0.06 : role === "rotation" ? 0.035 : 0.02;
  return Math.round((club.wagesBudget * share * (1 + reputation / 250)) / 50) * 50;
}

/**
 * Rôle que le joueur aurait dans un club : rang de sa note dans l'effectif,
 * plafonné par la concurrence à son poste (un gardien n'a qu'une place).
 */
export function roleAt(s: PlayerCareerState, clubId: string): SquadRole {
  const mine = me(s);
  const ovr = mine.overall;
  const mates = s.shadow.world.players.filter(p => p.clubId === clubId && p.id !== s.profile.id && p.clubId !== "retired");
  const better = mates.filter(p => p.overall > ovr).length;
  const places = mine.position === "GK" ? 1 : ["CB", "CM", "ST"].includes(mine.position) ? 2 : 1;
  const samePosBetter = mates.filter(p => p.position === mine.position && p.overall > ovr).length;
  let role: SquadRole = better < 3 ? "key" : better < 11 ? "starter" : better < 18 ? "rotation" : "prospect";
  if (samePosBetter >= places && (role === "key" || role === "starter")) role = "rotation";
  return role;
}

export const ROLE_LABEL: Record<SquadRole, string> = { key: "Joueur clé", starter: "Titulaire", rotation: "Rotation", prospect: "Espoir" };

// ─── Offres des clubs ────────────────────────────────────────────────────────

/** Forme récente : note moyenne de la saison (6,5 par défaut). */
function recentForm(s: PlayerCareerState): number {
  const line = s.seasons.find(l => l.season === s.shadow.world.season);
  return line && line.apps >= 3 ? avgRating(line) : 6.5;
}

/**
 * Offres de la semaine pendant le mercato : des clubs plus ambitieux quand le
 * joueur brille, des prêts quand il ne joue pas. Plus nombreuses si le joueur
 * a demandé à partir.
 */
export function generateOffers(s: PlayerCareerState): ClubOffer[] {
  if (!isWindowOpen(s.shadow) && C(s).freeAgentSince === null) return [];
  if (C(s).loan) return []; // en prêt : pas d'offre avant le retour au club
  const rng = createRng(seedFromString(`${s.shadow.world.seed}-p2offers-${weekIndex(s)}-${s.profile.id}`));
  const cur = myClub(s);
  const ovr = me(s).overall;
  const form = recentForm(s);
  const rep = s.profile.reputation;
  const out: ClubOffer[] = [];
  const free = C(s).freeAgentSince !== null;
  const askMore = C(s).transferRequested;
  const taken = new Set(C(s).offers.map(o => o.clubId));
  const pool = s.shadow.world.clubs.filter(c => c.id !== cur.id && !taken.has(c.id));

  // Transferts : clubs dont l'effectif est autour du niveau du joueur, plutôt meilleurs que le sien
  const shine = clamp((form - 6.4) * 0.25 + rep / 300 + (askMore ? 0.15 : 0) + (free ? 0.5 : 0), 0, 0.85);
  if (rng.chance(shine)) {
    // Plancher : un joueur au-dessus du niveau du monde intéresse les meilleurs clubs
    const best = Math.max(...pool.map(c => squadStrength(s.shadow.world, c.id)));
    const floor = Math.min(ovr - 9, best - 6);
    const fits = pool.filter(c => {
      const str = squadStrength(s.shadow.world, c.id);
      return str >= floor && str <= ovr + 3 && (c.reputation >= cur.reputation - 5 || askMore || free);
    }).sort((a, b) => b.reputation - a.reputation).slice(0, 6);
    if (fits.length) {
      const club = fits[rng.int(0, Math.min(fits.length - 1, 3))];
      const role = roleAt(s, club.id);
      out.push({
        id: `of-${club.id}-${weekIndex(s)}`, clubId: club.id, kind: free ? "free" : "transfer",
        fee: free ? 0 : Math.round(marketValue(s) * rng.float(0.9, 1.25) / 10_000) * 10_000,
        wage: Math.round(wageFor(club, role, rep) * rng.float(0.95, 1.15) / 50) * 50,
        seasons: rng.int(3, 5), role, expiresAt: weekIndex(s) + 2,
      });
    }
  }

  // Prêts : un joueur peu utilisé intéresse des clubs plus modestes
  const line = s.seasons.find(l => l.season === s.shadow.world.season);
  const unused = (line?.apps ?? 0) <= Math.max(1, Math.floor((s.shadow.world.currentWeek - 1) / 3));
  // Plus il reste sans jouer, plus les clubs modestes se manifestent
  const idleWeeks = Math.max(0, s.shadow.world.currentWeek - 1 - (line?.apps ?? 0) * 3);
  const loanChance = Math.min(0.9, (askMore ? 0.6 : 0.3) + idleWeeks * 0.08);
  if (!free && !C(s).loan && unused && s.shadow.world.currentWeek >= 2 && rng.chance(loanChance)) {
    const lower = pool.filter(c => squadStrength(s.shadow.world, c.id) <= ovr + 1 && squadStrength(s.shadow.world, c.id) >= ovr - 10)
      .sort((a, b) => squadStrength(s.shadow.world, b.id) - squadStrength(s.shadow.world, a.id));
    // Un prêt n'a de sens que là où le joueur sera titulaire à son poste
    const useful = lower.filter(c => { const r = roleAt(s, c.id); return r === "key" || r === "starter"; });
    if (useful.length) {
      const club = useful[rng.int(0, Math.min(useful.length - 1, 2))];
      out.push({ id: `loan-${club.id}-${weekIndex(s)}`, clubId: club.id, kind: "loan", fee: 0, wage: s.contract.wage, seasons: 1, role: roleAt(s, club.id), expiresAt: weekIndex(s) + 2 });
    }
  }
  return out;
}

/** Rejoint un club : met à jour le monde, le club piloté par le coach IA et le contrat. */
function moveTo(s: PlayerCareerState, club: Club, contract: { wage: number; seasons: number; role: SquadRole }): PlayerCareerState {
  const players = s.shadow.world.players.map(p => (p.id === s.profile.id ? { ...p, clubId: club.id, leagueId: club.leagueId, morale: clamp(p.morale + 10, 0, 100) } : p));
  const world = { ...s.shadow.world, players };
  const tactic = aiTacticFor(club.philosophy);
  const lineup = autoPickLineup(players.filter(p => p.clubId === club.id), tactic.formation);
  const shadow = { ...s.shadow, clubId: club.id, world, tactic, lineup, suspensions: {}, lastMatch: null };
  const trust = contract.role === "key" ? 65 : contract.role === "starter" ? 58 : 50;
  return coachDecision(syncWorldPlayer({
    ...s, shadow, coachTrust: trust,
    contract: { clubId: club.id, wage: contract.wage, seasonsLeft: contract.seasons, role: contract.role },
  }));
}

export function acceptOffer(s0: PlayerCareerState, offerId: string): CareerResult {
  const s = ensureCareer(s0);
  const o = C(s).offers.find(x => x.id === offerId);
  if (!o) return fail(s, "Cette offre n'est plus valable.");
  if (o.expiresAt < weekIndex(s)) return fail(s, "Cette offre a expiré.");
  const club = s.shadow.world.clubs.find(c => c.id === o.clubId);
  if (!club) return fail(s, "Club introuvable.");
  const from = myClub(s);
  if (C(s).loan) return fail(s, "Impossible de signer ailleurs pendant un prêt.");
  let next: PlayerCareerState;
  if (o.kind === "loan") {
    next = moveTo(s, club, { wage: o.wage, seasons: 1, role: o.role });
    next = withCareer(next, {
      offers: [], transferRequested: false,
      loan: { parentClubId: from.id, untilSeason: s.shadow.world.season, parentWage: s.contract.wage, parentSeasonsLeft: s.contract.seasonsLeft },
    });
  } else {
    next = moveTo(s, club, { wage: o.wage, seasons: o.seasons, role: o.role });
    next = withCareer(next, { offers: [], transferRequested: false, loan: null, freeAgentSince: null });
  }
  const txt = o.kind === "loan"
    ? `Prêté à ${club.name} jusqu'à la fin de la saison. Rôle annoncé : ${ROLE_LABEL[o.role].toLowerCase()}.`
    : `${o.kind === "free" ? "Libre" : `Transfert de ${money(o.fee)}`} de ${from.name} à ${club.name}. Contrat de ${o.seasons} saisons à ${money(o.wage)}/semaine, rôle : ${ROLE_LABEL[o.role].toLowerCase()}.`;
  next = pushPlayerInbox(next, pmsg(next, "squad", o.kind === "loan" ? `Prêt à ${club.name}` : `Signature à ${club.name}`, txt));
  return done(next, txt);
}

export function rejectOffer(s0: PlayerCareerState, offerId: string): PlayerCareerState {
  const s = ensureCareer(s0);
  return withCareer(s, { offers: C(s).offers.filter(o => o.id !== offerId) });
}

export function requestTransfer(s0: PlayerCareerState, on: boolean): CareerResult {
  const s = ensureCareer(s0);
  if (C(s).loan) return fail(s, "Impossible pendant un prêt.");
  const next = { ...withCareer(s, { transferRequested: on }), coachTrust: clamp(s.coachTrust - (on ? 6 : 0), 0, 100) };
  return done(next, on ? "Votre agent fait savoir que vous voulez partir. Le coach n'apprécie pas, mais les offres vont arriver." : "Vous restez concentré sur votre club.");
}

// ─── Contrat ─────────────────────────────────────────────────────────────────

/** Salaire demandé pour prolonger : rôle actuel, réputation, saisons restantes. */
export function renewalDemand(s: PlayerCareerState): number {
  const club = myClub(s);
  const role = roleAt(s, club.id);
  const base = wageFor(club, role, s.profile.reputation);
  return Math.max(s.contract.wage, Math.round((base * (s.contract.seasonsLeft <= 1 ? 1.1 : 1)) / 50) * 50);
}

/** Plafond que le club accepte de payer au joueur. */
export function clubWageCap(s: PlayerCareerState): number {
  return Math.round(wageFor(myClub(s), roleAt(s, myClub(s).id), s.profile.reputation) * 1.25 / 50) * 50;
}

export function negotiateRenewal(s0: PlayerCareerState, wage: number, seasons: number): CareerResult {
  const s = ensureCareer(s0);
  if (C(s).loan) return fail(s, "Prolongation impossible pendant un prêt.");
  if (seasons < 1 || seasons > 5) return fail(s, "Durée : 1 à 5 saisons.");
  const cap = clubWageCap(s);
  if (wage > cap) return fail(s, `Le club refuse : il ne peut pas dépasser ${money(cap)} par semaine.`);
  if (s.contract.seasonsLeft >= 3) return fail(s, "Le club ne prolonge pas un contrat qui court encore sur 3 saisons ou plus.");
  const role = roleAt(s, myClub(s).id);
  const next = withCareer({ ...s, contract: { ...s.contract, wage, seasonsLeft: seasons, role } }, { freeAgentSince: null });
  return done(next, `Prolongation signée : ${seasons} saison(s) à ${money(wage)} par semaine.`);
}

// ─── Sélection nationale ─────────────────────────────────────────────────────

/** Rang du joueur parmi ceux de son pays (note + réputation). Top 23 = convoqué. */
export function nationalRank(s: PlayerCareerState): number {
  const country = C(s).national.countryId;
  const score = (ovr: number, rep: number) => ovr + rep / 10;
  const mine = score(me(s).overall, s.profile.reputation);
  return 1 + s.shadow.world.players.filter(p => p.countryId === country && p.id !== s.profile.id && p.clubId !== "retired"
    && score(p.overall, (s.shadow.world.clubReputations[p.clubId] ?? 50) / 2) > mine).length;
}

/** Trêve internationale toutes les 5 semaines de championnat. */
const isInternationalWeek = (s: PlayerCareerState) => s.shadow.world.currentWeek % 5 === 0;

function nationalWindow(s: PlayerCareerState): PlayerCareerState {
  const nat = C(s).national;
  const now = weekIndex(s);
  if (!isInternationalWeek(s) || nat.lastWindow === now) return s;
  const rank = nationalRank(s);
  const called = rank <= 23 && me(s).age >= 18 && !me(s).injury;
  const country = s.shadow.world.countries.find(c => c.id === nat.countryId);
  if (!called) {
    return withCareer(s, { national: { ...nat, called: false, lastWindow: now } });
  }
  const rng = createRng(seedFromString(`${s.shadow.world.seed}-nat-${now}-${s.profile.id}`));
  const plays = rank <= 11 || rng.chance(0.4);
  const goals = plays && ["ST", "LW", "RW", "AM"].includes(s.profile.position) && rng.chance(0.3) ? 1 : 0;
  const nextNat = { ...nat, called: true, lastWindow: now, caps: nat.caps + (plays ? 1 : 0), goals: nat.goals + goals };
  const first = !nat.called && nat.caps === 0;
  const next = { ...withCareer(s, { national: nextNat }), profile: { ...s.profile, reputation: clamp(s.profile.reputation + (plays ? 1.5 : 0.5), 1, 100) } };
  return pushPlayerInbox(next, pmsg(next, "board", first ? `Première convocation : ${country?.name ?? "sélection"}` : `Sélection : ${country?.name ?? ""}`,
    plays ? `Vous jouez pour ${country?.name}${goals ? " et vous marquez" : ""}. ${nextNat.caps} sélection(s), ${nextNat.goals} but(s).` : `Convoqué mais resté sur le banc. ${nextNat.caps} sélection(s).`));
}

// ─── Récompenses ─────────────────────────────────────────────────────────────

/** Trophées de la saison qui vient de se terminer. */
export function seasonAwards(prev: PlayerCareerState): Award[] {
  const w = prev.shadow.world;
  const season = w.season;
  const line = prev.seasons.find(l => l.season === season);
  if (!line || line.apps === 0) return [];
  const club = myClub(prev);
  const awards: Award[] = [];
  const leagueStats = w.playerStats.filter(x => x.season === season && x.leagueId === club.leagueId);
  const maxGoals = Math.max(0, ...leagueStats.filter(x => x.playerId !== prev.profile.id).map(x => x.goals));
  const maxAssists = Math.max(0, ...leagueStats.filter(x => x.playerId !== prev.profile.id).map(x => x.assists));
  const league = w.leagues.find(l => l.id === club.leagueId)?.name ?? "championnat";
  if (line.goals > 0 && line.goals >= maxGoals) awards.push({ season, id: "top_scorer", label: `Meilleur buteur de ${league} (${line.goals} buts)` });
  if (line.assists > 0 && line.assists >= maxAssists) awards.push({ season, id: "assist_king", label: `Meilleur passeur de ${league} (${line.assists})` });
  if (me(prev).age <= 21 && line.apps >= 8 && avgRating(line) >= 6.9) awards.push({ season, id: "revelation", label: `Révélation de la saison en ${league}` });
  const rows = w.standings[club.leagueId] ?? [];
  if (rows[0]?.clubId === club.id && line.apps >= 5) awards.push({ season, id: club.tier === 1 ? "league_title" : "promotion", label: club.tier === 1 ? `Champion de ${league}` : `Champion de ${league} et promu` });
  // Étoile d'Or : saison exceptionnelle en première division
  const allD1 = w.playerStats.filter(x => x.season === season && w.clubs.find(c => c.id === x.clubId)?.tier === 1 && x.playerId !== prev.profile.id);
  const bestContrib = Math.max(0, ...allD1.map(x => x.goals + x.assists * 0.7));
  if (club.tier === 1 && line.goals + line.assists * 0.7 > bestContrib && avgRating(line) >= 7.2 && prev.profile.reputation >= 60) {
    awards.push({ season, id: "golden_star", label: "Étoile d'Or : meilleur joueur du monde" });
  }
  return awards;
}

// ─── Semaine complète ────────────────────────────────────────────────────────

/**
 * Semaine de carrière : match (via playPlayerWeek) puis salaire, offres,
 * sélection, fin de prêt / de contrat et récompenses.
 */
export function advancePlayerWeek(s0: PlayerCareerState, live?: LiveMatch | null): PlayerCareerState {
  const start = ensureCareer(s0);
  const season = start.shadow.world.season;
  let s = ensureCareer(playPlayerWeek(start, live));

  // Salaire + primes de match
  const sum = s.lastMatch !== start.lastMatch ? s.lastMatch : null;
  const bonus = sum ? sum.goals * Math.round(s.contract.wage * 0.15) + sum.assists * Math.round(s.contract.wage * 0.08) : 0;
  s = withCareer(s, { bank: C(s).bank + s.contract.wage + bonus });

  s = nationalWindow(s);

  if (s.shadow.world.season !== season) s = seasonChange(start, s);

  // Offres : expirées retirées, nouvelles ajoutées
  const now = weekIndex(s);
  const kept = C(s).offers.filter(o => o.expiresAt >= now);
  s = withCareer(s, { offers: kept });
  const fresh = generateOffers(s);
  if (fresh.length) {
    s = withCareer(s, { offers: [...kept, ...fresh] });
    s = pushPlayerInbox(s, ...fresh.map(o => {
      const c = s.shadow.world.clubs.find(x => x.id === o.clubId);
      return pmsg(s, "finance", o.kind === "loan" ? `Proposition de prêt : ${c?.name}` : `Offre de ${c?.name}`,
        o.kind === "loan"
          ? `${c?.name} veut vous accueillir en prêt jusqu'à la fin de la saison pour vous donner du temps de jeu.`
          : `${o.kind === "free" ? "Contrat libre" : `Indemnité ${money(o.fee)}`} · ${money(o.wage)}/sem · ${o.seasons} saisons · rôle ${ROLE_LABEL[o.role].toLowerCase()}. Valable 2 semaines.`);
    }));
  }

  // Joueur libre sans club après 3 semaines : son club lui propose une saison de plus
  if (C(s).freeAgentSince !== null && now - C(s).freeAgentSince! >= 3) {
    s = withCareer({ ...s, contract: { ...s.contract, seasonsLeft: 1 } }, { freeAgentSince: null });
    s = pushPlayerInbox(s, pmsg(s, "finance", "Contrat prolongé d'une saison", "Faute d'accord ailleurs, votre club vous garde une saison de plus aux mêmes conditions."));
  }
  return s;
}

function seasonChange(prev: PlayerCareerState, s0: PlayerCareerState): PlayerCareerState {
  let s = s0;
  const awards = seasonAwards(prev);
  if (awards.length) {
    const rep = clamp(s.profile.reputation + awards.length * 4, 1, 100);
    s = { ...withCareer(s, { awards: [...C(s).awards, ...awards] }), profile: { ...s.profile, reputation: rep } };
    s = pushPlayerInbox(s, ...awards.map(a => pmsg(s, "board", "Trophée", a.label)));
  }
  const loan = C(prev).loan;
  if (loan && loan.untilSeason < s.shadow.world.season) {
    const parent = s.shadow.world.clubs.find(c => c.id === loan.parentClubId)!;
    s = moveTo(s, parent, { wage: loan.parentWage, seasons: Math.max(0, loan.parentSeasonsLeft - 1), role: roleAt(s, parent.id) });
    s = withCareer(s, { loan: null });
    s = pushPlayerInbox(s, pmsg(s, "squad", `Retour à ${parent.name}`, `Fin du prêt. Note globale : ${overallOf(s.profile.attrs, s.profile.position)}. Le coach va juger vos progrès.`));
  }
  // Contrat échu (fin de la dernière saison, y compris pendant un prêt) : joueur libre 3 semaines
  if (!C(s).loan && s.contract.seasonsLeft <= 0 && C(s).freeAgentSince === null) {
    s = withCareer(s, { freeAgentSince: weekIndex(s), offers: [] });
    s = pushPlayerInbox(s, pmsg(s, "finance", "Fin de contrat", "Vous êtes libre. Les clubs peuvent vous recruter sans indemnité pendant 3 semaines ; sans accord, votre club vous garde une saison."));
  }
  return withCareer(s, { transferRequested: false });
}

/** Pilote automatique avec la carrière (tests, calibration) : accepte la meilleure offre utile. */
export function simulateCareerSeason(s0: PlayerCareerState, autoAccept = true, maxWeeks = 60): PlayerCareerState {
  let s = ensureCareer(s0);
  const season = s.shadow.world.season;
  for (let i = 0; i < maxWeeks && s.shadow.world.season === season; i++) {
    s = advancePlayerWeek(s);
    // Comme un vrai joueur : après une demi-saison sans jouer, il demande à partir
    const line = s.seasons.find(l => l.season === s.shadow.world.season);
    if (autoAccept && s.shadow.world.currentWeek === 7 && (line?.apps ?? 0) === 0 && !C(s).loan) s = requestTransfer(s, true).state;
    if (autoAccept && C(s).offers.length) {
      const cur = myClub(s);
      const best = [...C(s).offers].sort((a, b) => (s.shadow.world.clubs.find(c => c.id === b.clubId)!.reputation - s.shadow.world.clubs.find(c => c.id === a.clubId)!.reputation))[0];
      const target = s.shadow.world.clubs.find(c => c.id === best.clubId)!;
      if (best.kind === "loan" || target.reputation > cur.reputation + 3 || C(s).freeAgentSince !== null) s = acceptOffer(s, best.id).state;
    }
  }
  return s;
}

export { getLeaguePosition, getManagedClub };
