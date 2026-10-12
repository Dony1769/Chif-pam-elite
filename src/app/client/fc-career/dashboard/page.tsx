"use client";

/**
 * FC CAREER — Dashboard (hub principal)
 * Route: /client/fc-career/dashboard
 * Onglets : accueil, saison, match, entraînement, club, profil.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  CalendarDays,
  Dumbbell,
  Home,
  Shirt,
  Sparkles,
  Trash2,
  Trophy,
  UserRound,
  ArrowLeftRight,
} from "lucide-react";
import type { CareerRuntimeState } from "../types/career";
import { toCareerState, toFullSave } from "../types/career";

import {
  clearAllSaves,
  loadGame,
  saveGame,
} from "../utils/storage";

import { getClub, getClubsByDivision } from "../constants/clubs";
import { createSeason, advanceSeason, nextUserFixture, computeStandings } from "../engine/season-manager";
import { simulateMatch } from "../engine/match-engine";
import { TRAINING_SESSIONS, runTrainingSession, applyRest, endOfWeek } from "../engine/progression";
import type { TrainingType } from "../engine/progression";
import { emptyWallet, processWeeklyPayroll, computeMatchBonuses } from "../engine/economic-engine";
import { formatMoneyCompact, formatDate, formatRating } from "../utils/formatters";
import type { SimulatedMatch, MatchEvent } from "../types/match";
import type { Player, SeasonStatLine } from "../types/player";
import MarketView from "../components/Market/MarketView";

/** Ligne de stats vierge pour une saison donnée. */
function emptyStatLine(
  seasonYear: number,
  clubId: string,
  competitionId: string,
): SeasonStatLine {
  return {
    seasonYear,
    clubId,
    competitionId,
    matches: 0,
    starts: 0,
    minutes: 0,
    goals: 0,
    assists: 0,
    yellowCards: 0,
    redCards: 0,
    averageRating: 0,
    overallAtSeasonEnd: 0,
  };
}

/** Description lisible d'un événement de match. */
function describeEvent(ev: MatchEvent): string {
  switch (ev.type) {
    case "goal":
      return `⚽ BUT — ${ev.scorer}`;
    case "chance":
      return `🎀 Occasion — ${ev.description}`;
    case "card":
      return ev.color === "red"
        ? `🟥 Carton rouge — ${ev.player}`
        : `🟨 Carton jaune — ${ev.player}`;
    case "sub":
      return `🔁 Changement — ${ev.in} remplace ${ev.out}`;
    case "var":
      return `📺 VAR — ${ev.outcome}`;
    default:
      return "Événement de match";
  }
}

/** Jauge compacte (forme / fatigue / moral). */
function Meter({ label, value, invert = false }: { label: string; value: number; invert?: boolean }) {
  const pct = Math.max(0, Math.min(100, value));
  const good = invert ? pct <= 40 : pct >= 60;
  const bad = invert ? pct >= 75 : pct <= 30;
  const color = good ? "bg-emerald-400" : bad ? "bg-rose-400" : "bg-amber-400";
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 text-left opacity-60">{label}</span>
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
        <span className={`block h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="w-7 text-right font-semibold">{Math.round(pct)}</span>
    </div>
  );
}

/** Paire clé/valeur (fiche club). */
function Info({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <>
      <dt className="opacity-60">{k}</dt>
      <dd className="text-right font-semibold">{v}</dd>
    </>
  );
}

/** Statistique encadrée (profil). */
function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-2">
      <div className="text-base font-black">{value}</div>
      <div className="text-[11px] uppercase tracking-wide opacity-50">{label}</div>
    </div>
  );
}

type DashboardTab =
  | "accueil"
  | "saison"
  | "match"
  | "entrainement"
  | "marche"
  | "club"
  | "profil";

const TABS: { id: DashboardTab; label: string; icon: React.ReactNode }[] = [
  { id: "accueil", label: "Accueil", icon: <Home size={16} /> },
  { id: "saison", label: "Saison", icon: <CalendarDays size={16} /> },
  { id: "match", label: "Match", icon: <Trophy size={16} /> },
  { id: "entrainement", label: "Entraînement", icon: <Dumbbell size={16} /> },
  { id: "marche", label: "Marche", icon: <ArrowLeftRight size={16} /> },
  { id: "club", label: "Club", icon: <Shirt size={16} /> },
  { id: "profil", label: "Profil", icon: <UserRound size={16} /> },
];

export default function DashboardPage() {
  const router = useRouter();
  const [career, setCareer] = useState<CareerRuntimeState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<DashboardTab>("accueil");
  const [lastMatch, setLastMatch] = useState<SimulatedMatch | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Chargement de la sauvegarde
  useEffect(() => {
    const save = loadGame();
    if (!save || !save.player) {
      router.replace("/client/fc-career/create-player");
      return;
    }
    setCareer(toCareerState(save));
    setLoaded(true);
  }, [router]);

  const persist = useCallback((next: CareerRuntimeState) => {
    setCareer(next);
    saveGame(toFullSave(next));
  }, []);

  const player = career?.player ?? null;
  const club = player ? getClub(player.contract.clubId) ?? null : null;

  // Création automatique de la saison si absente
  useEffect(() => {
    if (!career || !player || !club) return;
    if (career.meta.season) return;
    const clubsInDivision = getClubsByDivision(club.division);
    const season = createSeason(clubsInDivision, new Date().getFullYear() + 1, club);
    persist({ ...career, meta: { ...career.meta, season } });
  }, [career, player, club, persist]);

  const season = career?.meta.season ?? null;
  const nextFixture = useMemo(
    () => (season && club ? nextUserFixture(season, club.id) : undefined),
    [season, club],
  );

  function flash(msg: string) {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 2600);
  }

  /* ---------------- Actions ---------------- */

  function doTraining(focus: TrainingType) {
    if (!career || !player) return;
    const session = TRAINING_SESSIONS.find((s) => s.id === focus);
    if (!session) return;
    const { player: updated, result } = runTrainingSession(player, session);
    persist({ ...career, player: updated });
    flash(
      result.improved.length > 0
        ? `+${result.improved.length} attribut(s) amélioré(s) ! Overall ${result.overallAfter}`
        : "Séance terminée — progression minimale (fatigue ou plafond).",
    );
  }

  function doRest() {
    if (!career || !player) return;
    persist({ ...career, player: applyRest(player) });
    flash("Repos : fatigue -25.");
  }

  function playNextMatch() {
    if (!career || !player || !club || !season || !nextFixture) return;
    const home = getClub(nextFixture.homeClubId)!;
    const away = getClub(nextFixture.awayClubId)!;
    const sim = simulateMatch(home, away, player);

    // Mise à jour des stats saison du joueur
    const line = { ...(player.seasonStats[0] ?? emptyStatLine(season.seasonYear, club.id, nextFixture.competitionId)) };
    line.matches += 1;
    if (sim.userPlayed) line.starts += 1;
    line.minutes += sim.userMinutes;
    line.goals += sim.userRating.goals;
    line.assists += sim.userRating.assists;
    line.averageRating =
      (line.averageRating * (line.matches - 1) + sim.userRating.rating) / line.matches;

    const updatedPlayer: Player = {
      ...player,
      seasonStats: [line, ...player.seasonStats.slice(1)],
      fatigue: Math.min(100, player.fatigue + 22),
      form: Math.max(0, Math.min(100, player.form + (sim.userRating.rating >= 7 ? 4 : sim.userRating.rating <= 5 ? -3 : 0))),
    };

    const advanced = advanceSeason(season, [
      { dayId: nextFixture.id, homeScore: sim.homeScore, awayScore: sim.awayScore },
    ]);

    // Paie hebdomadaire
    const wallet = career.wallet ?? emptyWallet();
    const bonuses = computeMatchBonuses(updatedPlayer, sim);
    const payroll = processWeeklyPayroll(wallet, updatedPlayer, advanced.currentDay, bonuses, [], updatedPlayer.seasonStats[0]?.minutes ?? 0, 200);

    persist({
      ...career,
      player: endOfWeek(updatedPlayer),
      wallet: payroll.wallet,
      meta: { ...career.meta, season: advanced },
      lastMatch: sim,
    });
    setLastMatch(sim);
    setTab("match");
  }

  function resetCareer() {
    if (!window.confirm("Effacer toute la carrière ? Cette action est irréversible.")) return;
    clearAllSaves();
    router.replace("/client/fc-career/create-player");
  }

  /* ---------------- Rendu ---------------- */

  if (!loaded || !player || !club || !career) {
    return (
      <main className="flex min-h-screen items-center justify-center opacity-60">
        <Sparkles className="animate-pulse" />
        <span className="ml-2 text-sm">Chargement de la carrière…</span>
      </main>
    );
  }

  const standings = season ? computeStandings(season, getClubsByDivision(club.division)) : [];
  const myRow = standings.find((r) => r.clubId === club.id);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-4 px-4 py-6">
      {/* Barre d'onglets */}
      <nav className="fc-tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`fc-tab ${tab === t.id ? "fc-tab-active" : ""}`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </nav>

      {notice && <div className="fc-toast">{notice}</div>}

      {/* Fiche joueur résumé */}
      <section className="fc-card flex items-center gap-4">
        <div
          className="grid h-14 w-14 place-items-center rounded-full text-lg font-black"
          style={{ background: club.colors.primary, color: club.colors.accent }}
        >
          {player.overall}
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold leading-tight">
            {player.firstName} {player.lastName}
          </h2>
          <p className="text-xs opacity-60">
            {player.position} · {club.name} · Pot. {player.potential}
          </p>
        </div>
        <div className="flex flex-col gap-1 text-right text-xs">
          <Meter label="Forme" value={player.form} />
          <Meter label="Fatigue" value={player.fatigue} invert />
          <Meter label="Moral" value={player.morale} />
        </div>
      </section>

      {tab === "accueil" && (
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="fc-card">
            <h3 className="fc-card-title">Prochain match</h3>
            {nextFixture ? (
              <Link href="#match" onClick={() => setTab("match")} className="block">
                <p className="font-semibold">
                  {getClub(nextFixture.homeClubId)?.shortName} vs{" "}
                  {getClub(nextFixture.awayClubId)?.shortName}
                </p>
                <p className="text-xs opacity-60">
                  J{nextFixture.dayNumber} · {formatDate(nextFixture.date)}
                </p>
              </Link>
            ) : (
              <p className="text-sm opacity-60">
                {season?.isOver ? "Saison terminée !" : "Aucun match programmé."}
              </p>
            )}
          </div>

          <div className="fc-card">
            <h3 className="fc-card-title">Classement ({club.division})</h3>
            {myRow ? (
              <p className="text-sm">
                <span className="text-xl font-black">{myRow.position}ᵉ</span> · {myRow.points} pts ·{" "}
                {myRow.won}V {myRow.drawn}N {myRow.lost}D
              </p>
            ) : (
              <p className="text-sm opacity-60">En attente de la première journée.</p>
            )}
          </div>

          <div className="fc-card sm:col-span-2">
            <h3 className="fc-card-title">Actions rapides</h3>
            <div className="flex flex-wrap gap-2">
              <button className="fc-btn-primary" onClick={playNextMatch} disabled={!nextFixture}>
                <Trophy size={16} /> Jouer le match
              </button>
              <button className="fc-btn-secondary" onClick={() => setTab("entrainement")}>
                <Dumbbell size={16} /> S&apos;entraîner
              </button>
              <button className="fc-btn-secondary" onClick={() => setTab("marche")}>
                <ArrowLeftRight size={16} /> Marché
              </button>
              <button className="fc-btn-secondary" onClick={doRest}>
                <Activity size={16} /> Repos
              </button>
              <button className="fc-btn-danger" onClick={resetCareer}>
                <Trash2 size={16} /> Réinitialiser
              </button>
            </div>
          </div>
        </section>
      )}

      {tab === "saison" && season && (
        <section className="fc-card">
          <h3 className="fc-card-title">Calendrier — Saison {season.seasonYear}</h3>
          <ul className="flex flex-col gap-1">
            {season.fixtures
              .filter((f) => f.homeClubId === club.id || f.awayClubId === club.id)
              .slice(0, 12)
              .map((f) => (
                <li key={f.id} className="fc-list-row">
                  <span className="w-8 text-xs opacity-50">J{f.dayNumber}</span>
                  <span className="flex-1 text-sm">
                    {getClub(f.homeClubId)?.shortName} vs {getClub(f.awayClubId)?.shortName}
                  </span>
                  <span className="text-xs opacity-60">{formatDate(f.date)}</span>
                  <span className="w-14 text-right text-sm font-bold">
                    {f.played ? `${f.homeScore}-${f.awayScore}` : "—"}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      )}

      {tab === "match" && (
        <section className="fc-card">
          <h3 className="fc-card-title">Centre de match</h3>
          {lastMatch ? (
            <div className="flex flex-col gap-2 text-sm">
              <p className="text-2xl font-black">
                {getClub(lastMatch.homeClubId)?.shortName} {lastMatch.homeScore} – {lastMatch.awayScore}{" "}
                {getClub(lastMatch.awayClubId)?.shortName}
              </p>
              <p>
                Ta note : <strong className="text-emerald-400">{formatRating(lastMatch.userRating.rating)}</strong>{" "}
                · {lastMatch.userRating.goals} but(s), {lastMatch.userRating.assists} passe(s) déc. ·{" "}
                {lastMatch.userMinutes} min
              </p>
              <ul className="mt-2 flex flex-col gap-1">
                {lastMatch.events.slice(-8).map((ev, i) => (
                  <li key={i} className="fc-list-row text-xs">
                    <span className="w-10 opacity-50">{ev.minute}&apos;</span>
                    <span>{describeEvent(ev)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm opacity-60">
                {nextFixture
                  ? `Prochain match : ${getClub(nextFixture.homeClubId)?.name} vs ${
                      getClub(nextFixture.awayClubId)?.name
                    } (J${nextFixture.dayNumber}).`
                  : "Plus de match cette saison."}
              </p>
              <button className="fc-btn-primary self-start" onClick={playNextMatch} disabled={!nextFixture}>
                <Trophy size={16} /> Simuler le match
              </button>
            </div>
          )}
        </section>
      )}

      {tab === "entrainement" && (
        <section className="grid gap-3 sm:grid-cols-2">
          {TRAINING_SESSIONS.map((s) => (
            <button key={s.id} className="fc-card fc-card-hover text-left" onClick={() => doTraining(s.id)}>
              <h4 className="font-semibold">{s.label}</h4>
              <p className="text-xs opacity-60">
                {s.durationMin} min · fatigue {s.fatigueCost > 0 ? `+${s.fatigueCost}` : s.fatigueCost}
              </p>
              <p className="mt-1 text-xs opacity-50">{s.targets.slice(0, 3).join(", ")}</p>
            </button>
          ))}
          <button className="fc-btn-secondary sm:col-span-2" onClick={doRest}>
            Journée complète de repos (-25 fatigue)
          </button>
        </section>
      )}

      {tab === "marche" && <MarketView />}

      {tab === "club" && (
        <section className="fc-card">
          <h3 className="fc-card-title">{club.name}</h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <Info k="Ville" v={club.city} />
            <Info k="Stade" v={`${club.stadium} (${club.capacity.toLocaleString("fr-FR")})`} />
            <Info k="Division" v={club.division} />
            <Info k="Entraîneur" v={club.coachName} />
            <Info k="Budget salarial" v={formatMoneyCompact(club.budget)} />
            <Info k="Réputation" v={`${club.reputation}/100`} />
            <Info k="Ton salaire" v={`${formatMoneyCompact(player.contract.salaryPerWeek)}/sem`} />
            <Info k="Valeur marchande" v={formatMoneyCompact(player.marketValue)} />
          </dl>
        </section>
      )}

      {tab === "profil" && (
        <section className="fc-card">
          <h3 className="fc-card-title">Profil & statistiques</h3>
          <p className="text-sm">
            {player.firstName} {player.lastName} — {player.age} ans · {player.heightCm} cm ·{" "}
            {player.weightKg} kg · pied {player.foot === "left" ? "gauche" : player.foot === "right" ? "droit" : "les deux"}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm sm:grid-cols-6">
            <Stat label="Matchs" value={player.careerTotals.matches} />
            <Stat label="Buts" value={player.careerTotals.goals} />
            <Stat label="Passes déc." value={player.careerTotals.assists} />
            <Stat label="Minutes" value={player.careerTotals.minutes} />
            <Stat label="Cartons J" value={player.careerTotals.yellowCards} />
            <Stat label="Note moy." value={player.careerTotals.averageRating.toFixed(2)} />
          </div>
          <h4 className="fc-card-title mt-4">Top attributs</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(player.attributes)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 8)
              .map(([id, val]) => (
                <span key={id} className="fc-chip">
                  {id} · {val}
                </span>
              ))}
          </div>
        </section>
      )}
    </main>
  );
}