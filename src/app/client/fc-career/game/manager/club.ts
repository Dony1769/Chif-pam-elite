/**
 * FC CAREER 27 — Mode Manager : le club (Lot M3).
 * Stade (prix du billet, agrandissement), installations (entraînement,
 * formation, médical), staff (5 rôles), sponsor maillot, progression à
 * l'entraînement. Fonctions pures et déterministes.
 */

import type { WorldPlayer } from "../data/worldPlayers";
import { FIRST_NAMES, LAST_NAMES } from "../domain/playerProgression";
import { createRng, seedFromString } from "../utils/random";
import type { ClubInfra, FacilityId, ManagerState, SponsorOffer, StaffMember, StaffRole } from "./types";
import {
  addLedger, clamp, formatMoney, getLeaguePosition, getManagedClub, getNextFixture, msg, pushInbox,
} from "./engine";
import {
  EXPANSION_SEATS, FACILITY_LABEL, MAX_CAPACITY, MAX_FACILITY_LEVEL, STAFF_ROLE_LABEL, attendance,
  expansionCost, extraRecovery, facilityUpgradeCost, fasterHealChance, initialCapacity, referencePrice,
  staffWage, trainingGainChance,
} from "./clubMath";

export interface ClubResult {
  ok: boolean;
  state: ManagerState;
  message: string;
}
const fail = (state: ManagerState, message: string): ClubResult => ({ ok: false, state, message });
const done = (state: ManagerState, message: string): ClubResult => ({ ok: true, state, message });
const weekIndex = (s: ManagerState) => s.world.season * 100 + s.world.currentWeek;
const ROLES: StaffRole[] = ["coach", "fitness", "physio", "youth", "scout"];

// ─── Initialisation ──────────────────────────────────────────────────────────

/** Complète stade, installations, staff et sponsors. Idempotent. */
export function ensureInfra(s: ManagerState): ManagerState {
  if (s.infra && s.infra.generatedSeason === s.world.season) return s;
  const club = getManagedClub(s);
  const W = club.wagesBudget;
  const base: ClubInfra = s.infra ?? {
    stadium: {
      name: `Stade de ${club.name.replace(/^(FC|AS|SC)\s+|\s+(FC|SC)$/g, "")}`,
      capacity: initialCapacity(club.reputation),
      ticketPrice: referencePrice(W, initialCapacity(club.reputation)),
    },
    facilities: {
      training: club.tier === 1 ? 3 : 2,
      academy: clamp(club.academyLevel, 1, MAX_FACILITY_LEVEL),
      medical: club.tier === 1 ? 3 : 2,
    },
    staff: ROLES.map((role, i) => makeStaff(`${s.world.seed}-staff0-${club.id}-${i}`, role, 2, W)),
    staffMarket: [],
    projects: [],
    sponsor: null,
    sponsorOffers: [],
    generatedSeason: 0,
    lastAttendance: null,
  };
  return {
    ...s,
    infra: {
      ...base,
      sponsorOffers: base.sponsor ? [] : generateSponsorOffers(s),
      staffMarket: generateStaffMarket(s),
      generatedSeason: s.world.season,
    },
  };
}

function infra(s: ManagerState): ClubInfra {
  if (!s.infra) throw new Error("Infrastructures non initialisées : appeler ensureInfra()");
  return s.infra;
}
const withInfra = (s: ManagerState, patch: Partial<ClubInfra>): ManagerState => ({ ...s, infra: { ...infra(s), ...patch } });

function makeStaff(seed: string, role: StaffRole, quality: number, wagesBudget: number): StaffMember {
  const rng = createRng(seedFromString(seed));
  return { id: `staff-${seedFromString(seed).toString(36)}`, role, quality, name: `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`, wage: staffWage(wagesBudget, quality) };
}

/** Candidats au staff : un par rôle, de niveau 1 à 5. */
export function generateStaffMarket(s: ManagerState): StaffMember[] {
  const club = getManagedClub(s);
  const rng = createRng(seedFromString(`${s.world.seed}-staffmkt-s${s.world.season}`));
  const out: StaffMember[] = [];
  ROLES.forEach((role, i) => {
    for (let k = 0; k < 2; k++) {
      const q = clamp(rng.int(1, 5), 1, 5);
      out.push(makeStaff(`${s.world.seed}-cand-s${s.world.season}-${i}-${k}`, role, q, club.wagesBudget));
    }
  });
  return out;
}

const SPONSOR_NAMES = ["Novalis Énergie", "Kestrel Air", "Brightwave Télécom", "Orvane Assurances", "Halden Motors", "Lumen Banque", "Corvid Sport", "Atria Mobilité", "Sendai Électronique", "Verdane Eaux"];

/** Trois propositions de sponsor maillot : sûre, équilibrée, ambitieuse. */
export function generateSponsorOffers(s: ManagerState): SponsorOffer[] {
  const club = getManagedClub(s);
  const rep = s.world.clubReputations[club.id] ?? club.reputation;
  const W = club.wagesBudget * (rep / 80);
  const rng = createRng(seedFromString(`${s.world.seed}-sponsor-${club.id}-s${s.world.season}`));
  const names = rng.shuffle(SPONSOR_NAMES);
  const round = (v: number) => Math.round(v / 500) * 500;
  return [
    { id: `sp-s${s.world.season}-0`, name: names[0], style: "safe", weekly: round(W * 0.3), winBonus: 0, objectiveBonus: 0 },
    { id: `sp-s${s.world.season}-1`, name: names[1], style: "balanced", weekly: round(W * 0.22), winBonus: round(W * 0.07), objectiveBonus: round(W * 1.5) },
    { id: `sp-s${s.world.season}-2`, name: names[2], style: "ambitious", weekly: round(W * 0.14), winBonus: round(W * 0.1), objectiveBonus: round(W * 4.5) },
  ];
}

// ─── Stade ───────────────────────────────────────────────────────────────────

export function ticketPriceBounds(s: ManagerState): { min: number; max: number; ref: number } {
  const club = getManagedClub(s);
  const ref = referencePrice(club.wagesBudget, initialCapacity(club.reputation));
  return { min: Math.max(1, Math.round(ref * 0.3)), max: ref * 4, ref };
}

/** Affluence prévue au prochain match à domicile pour un prix donné. */
export function previewAttendance(s: ManagerState, price: number) {
  s = ensureInfra(s);
  const club = getManagedClub(s);
  const { ref } = ticketPriceBounds(s);
  const last = s.lastMatch;
  const lastWon = last ? (last.managedSide === "home" ? last.home.goals > last.away.goals : last.away.goals > last.home.goals) : null;
  return attendance({
    capacity: infra(s).stadium.capacity, price, refPrice: ref,
    reputation: s.world.clubReputations[club.id] ?? club.reputation,
    position: getLeaguePosition(s), leagueSize: (s.world.standings[club.leagueId] ?? []).length || 8, lastWon,
  });
}

export function setTicketPrice(s: ManagerState, price: number): ClubResult {
  s = ensureInfra(s);
  const b = ticketPriceBounds(s);
  if (!Number.isFinite(price) || price < b.min || price > b.max) return fail(s, `Prix du billet entre ${b.min} € et ${b.max} €.`);
  const p = Math.round(price);
  const a = previewAttendance(s, p);
  return done(withInfra(s, { stadium: { ...infra(s).stadium, ticketPrice: p } }),
    `Billet à ${p} € : affluence prévue ${a.spectators.toLocaleString("fr-FR")} (${Math.round(a.fill * 100)} %), recette ${formatMoney(a.revenue)}.`);
}

export function expandStadium(s: ManagerState): ClubResult {
  s = ensureInfra(s);
  const inf = infra(s);
  if (inf.projects.some(p => p.kind === "stadium")) return fail(s, "Un agrandissement est déjà en cours.");
  if (inf.stadium.capacity + EXPANSION_SEATS > MAX_CAPACITY) return fail(s, "Capacité maximale atteinte.");
  const { cost, weeks } = expansionCost(getManagedClub(s).wagesBudget);
  if (s.finances.balance < cost) return fail(s, `Trésorerie insuffisante (${formatMoney(cost)} nécessaires).`);
  const finances = addLedger(s.finances, [{ season: s.world.season, week: s.world.currentWeek, category: "facilities", amount: -cost, label: `Agrandissement du stade (+${EXPANSION_SEATS} places)` }]);
  return done(withInfra({ ...s, finances }, { projects: [...inf.projects, { kind: "stadium", readyAt: weekIndex(s) + weeks, cost, seats: EXPANSION_SEATS }] }),
    `Travaux lancés : +${EXPANSION_SEATS.toLocaleString("fr-FR")} places dans ${weeks} semaines (${formatMoney(cost)}).`);
}

// ─── Installations ───────────────────────────────────────────────────────────

export function upgradeFacility(s: ManagerState, id: FacilityId): ClubResult {
  s = ensureInfra(s);
  const inf = infra(s);
  const level = inf.facilities[id];
  if (level >= MAX_FACILITY_LEVEL) return fail(s, `${FACILITY_LABEL[id]} déjà au niveau maximum.`);
  if (inf.projects.some(p => p.kind === id)) return fail(s, `${FACILITY_LABEL[id]} : travaux déjà en cours.`);
  const { cost, weeks } = facilityUpgradeCost(getManagedClub(s).wagesBudget, level);
  if (s.finances.balance < cost) return fail(s, `Trésorerie insuffisante (${formatMoney(cost)} nécessaires).`);
  const finances = addLedger(s.finances, [{ season: s.world.season, week: s.world.currentWeek, category: "facilities", amount: -cost, label: `${FACILITY_LABEL[id]} : niveau ${level + 1}` }]);
  return done(withInfra({ ...s, finances }, { projects: [...inf.projects, { kind: id, readyAt: weekIndex(s) + weeks, cost }] }),
    `${FACILITY_LABEL[id]} : passage au niveau ${level + 1} dans ${weeks} semaines (${formatMoney(cost)}).`);
}

// ─── Staff ───────────────────────────────────────────────────────────────────

/** Embauche un candidat ; le titulaire du poste part avec 4 semaines de salaire. */
export function hireStaff(s: ManagerState, candidateId: string): ClubResult {
  s = ensureInfra(s);
  const inf = infra(s);
  const c = inf.staffMarket.find(m => m.id === candidateId);
  if (!c) return fail(s, "Ce candidat n'est plus disponible.");
  const current = inf.staff.find(m => m.role === c.role);
  const payoff = current ? current.wage * 4 : 0;
  if (s.finances.balance < payoff) return fail(s, "Trésorerie insuffisante pour l'indemnité de départ.");
  const finances = payoff > 0
    ? addLedger(s.finances, [{ season: s.world.season, week: s.world.currentWeek, category: "staff", amount: -payoff, label: `Départ de ${current!.name} (${STAFF_ROLE_LABEL[c.role]})` }])
    : s.finances;
  return done(withInfra({ ...s, finances }, {
    staff: [...inf.staff.filter(m => m.role !== c.role), c],
    staffMarket: inf.staffMarket.filter(m => m.id !== c.id),
  }), `${c.name} devient ${STAFF_ROLE_LABEL[c.role].toLowerCase()} (niveau ${c.quality}, ${formatMoney(c.wage)}/sem).`);
}

// ─── Sponsor ─────────────────────────────────────────────────────────────────

export function chooseSponsor(s: ManagerState, offerId: string): ClubResult {
  s = ensureInfra(s);
  const inf = infra(s);
  if (inf.sponsor) return fail(s, `Contrat déjà signé avec ${inf.sponsor.name} pour cette saison.`);
  const o = inf.sponsorOffers.find(x => x.id === offerId);
  if (!o) return fail(s, "Offre introuvable.");
  return done(withInfra(s, { sponsor: o, sponsorOffers: [] }), `${o.name} devient sponsor maillot pour la saison.`);
}

// ─── Effets hebdomadaires ────────────────────────────────────────────────────

/**
 * Après la semaine jouée : livraison des travaux, récupération et soins,
 * progression à l'entraînement, sponsor par défaut si aucun choix.
 */
export function weeklyClub(before: ManagerState, after: ManagerState): ManagerState {
  let s = ensureInfra(after);
  let inf = infra(s);
  const now = weekIndex(s);
  const messages = [];

  // Travaux terminés
  const ready = inf.projects.filter(p => p.readyAt <= now);
  if (ready.length) {
    const facilities = { ...inf.facilities };
    let capacity = inf.stadium.capacity;
    for (const p of ready) {
      if (p.kind === "stadium") {
        capacity = Math.min(MAX_CAPACITY, capacity + (p.seats ?? 0));
        messages.push(msg(s, "finance", "Stade agrandi", `${inf.stadium.name} compte désormais ${capacity.toLocaleString("fr-FR")} places.`));
      } else {
        facilities[p.kind] = Math.min(MAX_FACILITY_LEVEL, facilities[p.kind] + 1);
        messages.push(msg(s, "finance", `${FACILITY_LABEL[p.kind]} amélioré`, `Niveau ${facilities[p.kind]} atteint.`));
      }
    }
    inf = { ...inf, facilities, stadium: { ...inf.stadium, capacity }, projects: inf.projects.filter(p => p.readyAt > now) };
  }

  // Joueurs du club : récupération, soins, progression
  const rng = createRng(seedFromString(`${s.world.seed}-club-${now}`));
  const played = new Set(after.lastMatch && after.lastMatch !== before.lastMatch ? Object.keys(after.lastMatch.ratings) : []);
  const recovery = extraRecovery(inf);
  const heal = fasterHealChance(inf);
  const progressed: string[] = [];
  const players = s.world.players.map((p): WorldPlayer => {
    if (p.clubId !== s.clubId) return p;
    let next = p;
    if (recovery > 0 && p.fatigue > 0) next = { ...next, fatigue: Math.max(0, p.fatigue - recovery) };
    if (next.injury && next.injury.weeksRemaining > 1 && rng.chance(heal)) {
      next = { ...next, injury: { ...next.injury, weeksRemaining: next.injury.weeksRemaining - 1 } };
    }
    if (next.overall < next.potential && !next.injury && rng.chance(trainingGainChance(inf, p.age, played.has(p.id)))) {
      next = { ...next, overall: next.overall + 1, marketValue: Math.round(next.marketValue * 1.08 / 10_000) * 10_000 };
      progressed.push(`${p.firstName} ${p.lastName} (${next.overall})`);
    }
    return next;
  });
  if (progressed.length) messages.push(msg(s, "squad", "Progrès à l'entraînement", progressed.join(", ") + " gagne(nt) un point de note."));

  // Sans choix du manager à la 3e semaine, le conseil signe l'offre équilibrée
  if (!inf.sponsor && inf.sponsorOffers.length && s.world.currentWeek >= 3) {
    const pick = inf.sponsorOffers.find(o => o.style === "balanced") ?? inf.sponsorOffers[0];
    inf = { ...inf, sponsor: pick, sponsorOffers: [] };
    messages.push(msg(s, "finance", `Sponsor signé par le conseil : ${pick.name}`, `Faute de décision, le conseil a retenu l'offre équilibrée (${formatMoney(pick.weekly)}/sem).`));
  }

  s = { ...s, infra: inf, world: { ...s.world, players } };
  return messages.length ? pushInbox(s, ...messages) : s;
}

/** Nouvelle saison : prime d'objectif sponsor, nouveau sponsor, nouveau staff disponible. */
export function seasonClub(before: ManagerState, after: ManagerState): ManagerState {
  let s = after;
  const prevSponsor = before.infra?.sponsor;
  const last = s.history[s.history.length - 1];
  if (prevSponsor && last?.objectiveMet && prevSponsor.objectiveBonus > 0) {
    s = {
      ...s,
      finances: addLedger(s.finances, [{ season: s.world.season, week: s.world.currentWeek, category: "sponsor", amount: prevSponsor.objectiveBonus, label: `Prime d'objectif ${prevSponsor.name}` }]),
    };
  }
  // Le contrat sponsor dure une saison
  if (s.infra) s = { ...s, infra: { ...s.infra, sponsor: null } };
  s = ensureInfra(s);
  return pushInbox(s, msg(s, "finance", "Nouvelles offres de sponsor", `${infra(s).sponsorOffers.length} entreprises veulent apparaître sur le maillot. Décision avant la 3e semaine.`));
}

/** Le prochain match est-il à domicile ? (pour l'interface billetterie) */
export function nextMatchAtHome(s: ManagerState): boolean {
  return getNextFixture(s)?.homeClubId === s.clubId;
}
