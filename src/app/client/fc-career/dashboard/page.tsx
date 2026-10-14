"use client";

/**
 * FC CAREER — Dashboard v5
 * Hub central connecté à TOUS les systèmes :
 * match, entraînement, agent, fans, blessures, mental, wallet, lifestyle, saison.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Briefcase,
  CalendarDays,
  Crown,
  Dumbbell,
  FastForward,
  Flag,
  Globe,
  Heart,
  HeartPulse,
  Moon,
  Play,
  Shield,
  Sparkles,
  Star,
  Target,
  Trophy,
  Wallet,
  X,
  Zap,
  ChevronRight,
  Brain,
  Users,
  ShoppingBag,
  BookOpen,
  TrendingUp,
  Check,
} from "lucide-react";
import { Shell, Crest, PageTitle, StatCard } from "../lib/components";
import { Button, Link } from "../lib/ui";
import type { CareerRuntimeState } from "../types/career";
import { toCareerState, toFullSave } from "../types/career";
import { loadGame, saveGame } from "../utils/storage";
import { getClub, getClubsByDivision } from "../constants/clubs";
import { createSeason, advanceSeason, nextUserFixture, computeStandings } from "../engine/season-manager";
import { simulateMatch } from "../engine/match-engine";
import { TRAINING_SESSIONS, runTrainingSession, applyRest, endOfWeek } from "../engine/progression";
import type { TrainingType } from "../engine/progression";
import { emptyWallet, processWeeklyPayroll, computeMatchBonuses } from "../engine/economic-engine";
import { formatMoneyCompact, formatDate, formatRating } from "../utils/formatters";
import { STAGE_LABELS } from "../engine/academy-engine";
import { buildPostMatchState, isMatchLocked, lockMatchForToday, clearMatchState } from "../utils/match-result";
import type { SimulatedMatch } from "../types/match";
import type { Player } from "../types/player";
import { DIVISION_INFO } from "../types/club";
import type { FullSave } from "../utils/storage";
import type { FansVestiaireState } from "../types/relationship";
import type { AgentState, MercatoState } from "../types/agent";
import type { MentalState, SanctionState } from "../types/mental";
import type { ActiveInjury } from "../types/injury";
import type { LifestyleState, Endorsement } from "../types/lifestyle";
import type { CoachRelationship, SquadState } from "../types/relationship";
import type { InternationalState } from "../types/international";
import type { AwardsState } from "../types/award";

/* ── Jauge inline ──────────────────────────────────────────────── */
function Meter({ label, value, invert = false, compact = false }: {
  label: string; value: number; invert?: boolean; compact?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const good = invert ? pct <= 40 : pct >= 60;
  const bad  = invert ? pct >= 75 : pct <= 30;
  const color = good ? "var(--primary)" : bad ? "var(--coral)" : "oklch(.8 .15 80)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: compact ? 9 : 10 }}>
      <span style={{ width: compact ? 40 : 50, opacity: .6, flexShrink: 0 }}>{label}</span>
      <span style={{ flex: 1, height: 4, overflow: "hidden", borderRadius: 3, background: "rgba(255,255,255,0.06)" }}>
        <span style={{ display: "block", height: "100%", borderRadius: 3, background: color, width: `${pct}%`, transition: "width .6s var(--motion)", boxShadow: `0 0 6px ${color}` }} />
      </span>
      <span style={{ width: 22, textAlign: "right", fontWeight: 600 }}>{Math.round(pct)}</span>
    </div>
  );
}

/* ── Bloc d'alerte ─────────────────────────────────────────────── */
function AlertBlock({ icon, label, to, color = "var(--coral)" }: {
  icon: React.ReactNode; label: string; to: string; color?: string;
}) {
  return (
    <Link to={to} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: `${color}15`, border: `1px solid ${color}30`, borderRadius: 10, fontSize: 11, color, textDecoration: "none", transition: "background .2s" }}>
      <span style={{ flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      <ChevronRight size={12} />
    </Link>
  );
}

/* ── Mini carte système ────────────────────────────────────────── */
function SystemCard({ icon, title, value, sub, to, accent = false }: {
  icon: React.ReactNode; title: string; value: string | number; sub?: string; to: string; accent?: boolean;
}) {
  return (
    <Link to={to} style={{ display: "flex", flexDirection: "column", gap: 4, padding: "12px 14px", background: accent ? "rgba(16,185,129,0.07)" : "rgba(255,255,255,0.03)", border: `1px solid ${accent ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.06)"}`, borderRadius: 14, textDecoration: "none", color: "inherit", transition: "transform .2s var(--motion), background .2s" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: accent ? "var(--primary)" : "var(--muted-foreground)", display: "flex" }}>{icon}</span>
        <ChevronRight size={11} style={{ color: "var(--muted-foreground)", opacity: .5 }} />
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Barlow', sans-serif", marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted-foreground)" }}>{title}</div>
      {sub && <div style={{ fontSize: 9, color: "var(--primary)", marginTop: 2 }}>{sub}</div>}
    </Link>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [fullSave, setFullSave] = useState<FullSave | null>(null);
  const [career, setCareer] = useState<CareerRuntimeState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [lastMatch, setLastMatch] = useState<SimulatedMatch | null>(null);
  const [notice, setNotice] = useState<{ msg: string; type?: "success" | "warn" | "info" } | null>(null);
  const [matchLocked, setMatchLocked] = useState(false);

  useEffect(() => {
    const save = loadGame();
    if (!save?.player) {
      router.replace("/client/fc-career/create-player");
      return;
    }
    setFullSave(save);
    setCareer(toCareerState(save));
    setMatchLocked(isMatchLocked());
    setLoaded(true);
  }, [router]);

  const persist = useCallback((next: CareerRuntimeState, extra?: Partial<FullSave>) => {
    setCareer(next);
    const full = toFullSave(next);
    if (extra) Object.assign(full.meta, extra);
    setFullSave(full);
    saveGame(full);
  }, []);

  const player = career?.player ?? null;
  const club   = player ? getClub(player.contract.clubId) ?? null : null;

  /* Créer la saison si elle n'existe pas encore */
  useEffect(() => {
    if (!career || !player || !club) return;
    if (career.meta.season) return;
    const clubsInDivision = getClubsByDivision(club.division);
    const createdYear = new Date(career.meta.createdAt).getFullYear();
    const seasonYear  = Number.isFinite(createdYear) ? createdYear + 1 : new Date().getFullYear() + 1;
    const season = createSeason(clubsInDivision, seasonYear, club);
    persist({ ...career, meta: { ...career.meta, season } });
  }, [career, player, club, persist]);

  const season     = career?.meta.season ?? null;
  const nextFixture = useMemo(
    () => (season && club ? nextUserFixture(season, club.id) : undefined),
    [season, club],
  );

  /* Données des systèmes connexes depuis fullSave */
  const fansState       = fullSave?.meta.fansState ?? null;
  const agentState      = fullSave?.meta.agentState ?? null;
  const mercatoState    = fullSave?.meta.mercatoState ?? null;
  const mentalState     = fullSave?.meta.mentalState ?? null;
  const activeInjury    = fullSave?.meta.activeInjury ?? null;
  const sanctionState   = fullSave?.meta.sanctionState ?? null;
  const lifestyleState  = fullSave?.meta.lifestyleState ?? null;
  const endorsements    = fullSave?.meta.endorsements ?? [];
  const coachRelation   = fullSave?.meta.coachRelationship ?? null;
  const squadState      = fullSave?.meta.squad ?? null;
  const internState     = fullSave?.meta.internationalState ?? null;
  const awardsState     = fullSave?.meta.awardsState ?? null;
  const journalState    = fullSave?.meta.journalState ?? null;
  const phoneState      = fullSave?.meta.phoneState ?? null;

  function flash(msg: string, type: "success" | "warn" | "info" = "info") {
    setNotice({ msg, type });
    window.setTimeout(() => setNotice(null), 4000);
  }

  function doRest() {
    if (!career || !player) return;
    persist({ ...career, player: applyRest(player) });
    flash("Repos complet — condition physique restaurée.", "success");
  }

  function playNextMatch() {
    if (!career || !player || !club || !season || !nextFixture || matchLocked) return;
    const home = getClub(nextFixture.homeClubId)!;
    const away = getClub(nextFixture.awayClubId)!;
    const sim  = simulateMatch(home, away, player);
    const next = buildPostMatchState({ career, player, clubId: club.id, fixture: nextFixture, sim });
    persist(next);
    clearMatchState();
    lockMatchForToday();
    setMatchLocked(true);
    setLastMatch(sim);
    const earned = sim.userRating.rating >= 9 ? 3 : sim.userRating.rating >= 8 ? 2 : sim.userRating.rating >= 7 ? 1 : 0;
    flash(`Match simulé · Note ${formatRating(sim.userRating.rating)}${earned > 0 ? ` · +${earned} PA` : ""}`, sim.userRating.rating >= 7 ? "success" : "warn");
  }

  if (!loaded || !player || !club || !career) {
    return (
      <Shell>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 200px)", opacity: .6, gap: 8 }}>
          <Sparkles className="animate-pulse" size={16} />
          <span style={{ fontSize: 12 }}>Chargement de la carrière...</span>
        </div>
      </Shell>
    );
  }

  const standings   = season ? computeStandings(season, getClubsByDivision(club.division)) : [];
  const myRow       = standings.find((r) => r.clubId === club.id);
  const divisionName = DIVISION_INFO[club.division]?.name ?? club.division;
  const seasonStats  = player.seasonStats[0];

  /* ── Alertes système ── */
  const alerts: { icon: React.ReactNode; label: string; to: string; color?: string }[] = [];

  if (activeInjury)
    alerts.push({ icon: <HeartPulse size={13} />, label: `Blessé — ${activeInjury.daysLeft}j restants (${activeInjury.type})`, to: "/wellness", color: "var(--coral)" });

  if (sanctionState?.suspendedMatchesLeft && sanctionState.suspendedMatchesLeft > 0)
    alerts.push({ icon: <Shield size={13} />, label: `Suspendu — ${sanctionState.suspendedMatchesLeft} match(s)`, to: "/wellness", color: "var(--coral)" });

  if (mentalState?.burnout)
    alerts.push({ icon: <Brain size={13} />, label: "Burnout actif — repose-toi !", to: "/wellness", color: "oklch(.65 .18 30)" });

  if (mentalState?.pressure && mentalState.pressure > 75)
    alerts.push({ icon: <Brain size={13} />, label: `Pression très haute (${mentalState.pressure}/100)`, to: "/wellness", color: "oklch(.75 .18 80)" });

  if (coachRelation?.trust !== undefined && coachRelation.trust < 30)
    alerts.push({ icon: <Users size={13} />, label: `Relation coach dégradée (${coachRelation.trust}/100)`, to: "/club", color: "oklch(.75 .18 80)" });

  if (mercatoState?.activeSagas && mercatoState.activeSagas.length > 0)
    alerts.push({ icon: <Briefcase size={13} />, label: `Saga de transfert en cours — décide !`, to: "/agent", color: "var(--blue)" });

  if (player.contract.yearsRemaining <= 1)
    alerts.push({ icon: <Briefcase size={13} />, label: `Contrat expire bientôt (${player.contract.yearsRemaining} an${player.contract.yearsRemaining > 1 ? "s" : ""})`, to: "/agent", color: "oklch(.75 .18 80)" });

  if (phoneState?.unread && phoneState.unread > 0)
    alerts.push({ icon: <Zap size={13} />, label: `${phoneState.unread} message(s) non lu(s)`, to: "/phone", color: "var(--blue)" });

  /* ── Statut joueur ── */
  const statusTag = activeInjury ? "BLESSÉ" : player.condition === "suspended" ? "SUSPENDU" : squadState?.userStatus ?? (player.academy ? STAGE_LABELS[player.academy.stage].toUpperCase() : "ESPOIR");
  const statusColor = activeInjury || player.condition === "suspended" ? "var(--coral)" : squadState?.userStatus === "TITULAIRE" ? "var(--primary)" : "var(--muted-foreground)";

  /* ── PA disponibles ── */
  const paAvailable = (player as any).attributePoints ?? 0;

  return (
    <Shell>
      <PageTitle
        eyebrow={`SAISON ${season?.seasonYear ?? ""} / ${divisionName}`}
        title={`À vous de jouer, ${player.firstName}.`}
        subtitle={`${player.academy ? STAGE_LABELS[player.academy.stage] + " · " : ""}Chaque jour compte. Chaque décision construit votre légende.`}
        action={
          <div className="today">
            <CalendarDays />
            <div>
              <strong>{season ? formatDate(new Date().toISOString()) : ""}</strong>
              <span>Journée {season?.currentDay ?? 0}</span>
            </div>
          </div>
        }
      />

      {/* ── Alertes en haut ───────────────────────────────── */}
      {alerts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
          {alerts.map((a, i) => (
            <AlertBlock key={i} icon={a.icon} label={a.label} to={a.to} color={a.color} />
          ))}
        </div>
      )}

      <div className="dashboard-grid">

        {/* ══════════════════════════════════════════════════════
            COLONNE GAUCHE — Fiche joueur
            ══════════════════════════════════════════════════════ */}
        <section className="player-card" style={{ animation: "fcl-reveal .5s var(--motion) both" }}>
          <div
            className="player-image"
            style={{ height: 200, background: `linear-gradient(135deg, ${club.colors.primary}44, ${club.colors.accent}22)`, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <span className="player-position">{player.position}</span>
            <div className="overall"><strong>{player.overall}</strong><span>GÉNÉRAL</span></div>
            <div className="player-identity">
              <span>LE PROCHAIN CHAPITRE</span>
              <h2>{player.firstName} {player.lastName}</h2>
              <p>{player.age} ans <i /> {player.position} <i /> {club.shortName}</p>
            </div>
          </div>

          <div className="player-info">
            <div className="club-line">
              <Crest name={club.shortName} clubId={club.id} small />
              <div>
                <strong>{club.name}</strong>
                <span>{divisionName}</span>
              </div>
              <span className="status-tag" style={{ color: statusColor, borderColor: `${statusColor}40`, background: `${statusColor}12` }}>
                {statusTag}
              </span>
            </div>

            {/* Jauges */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 16 }}>
              <Meter label="Forme"   value={player.form} />
              <Meter label="Fatigue" value={player.fatigue} invert />
              <Meter label="Moral"   value={player.morale} />
              {mentalState && <Meter label="Pression" value={mentalState.pressure} invert />}
            </div>

            {/* Infos clés */}
            <div className="player-details">
              <span>Potentiel<strong>{player.potential}<Sparkles size={10} /></strong></span>
              <span>Pied fort<strong>{player.foot === "left" ? "Gauche" : player.foot === "right" ? "Droit" : "Les deux"}</strong></span>
              <span>Valeur<strong>{formatMoneyCompact(player.marketValue)}</strong></span>
              {paAvailable > 0 && (
                <span style={{ color: "var(--primary)" }}>
                  PA dispo<strong style={{ color: "var(--primary)" }}>{paAvailable} pts</strong>
                </span>
              )}
            </div>

            {/* Coach */}
            {coachRelation && (
              <div style={{ marginTop: 10 }}>
                <Meter label="Coach" value={coachRelation.trust} compact />
              </div>
            )}

            <Button asChild variant="outline" className="full-width" style={{ marginTop: 12 }}>
              <Link to="/joueur">Voir mon profil<ArrowRight size={14} /></Link>
            </Button>

            {paAvailable > 0 && (
              <Button asChild variant="career" className="full-width" style={{ marginTop: 8 }}>
                <Link to="/joueur"><Star size={14} />{paAvailable} PA à investir</Link>
              </Button>
            )}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            COLONNE CENTRALE — Match + Actions
            ══════════════════════════════════════════════════════ */}
        <div className="center-column">

          {/* Match */}
          <div className="section-heading">
            <h2>Votre prochain défi</h2>
            <span className="live-label">
              <span />
              {matchLocked ? "MATCH JOUÉ" : nextFixture ? "PROCHAIN MATCH" : "PAS DE MATCH"}
            </span>
          </div>

          {nextFixture && !matchLocked && (
            <section className="match-card" style={{ background: "var(--card)", height: "auto", minHeight: 220 }}>
              <div className="match-card-content">
                <div className="competition"><Trophy size={12} />{divisionName}<span>J{nextFixture.dayNumber}</span></div>
                <div className="versus">
                  <div>
                    <Crest name={getClub(nextFixture.homeClubId)?.shortName ?? ""} clubId={nextFixture.homeClubId} />
                    <strong>{getClub(nextFixture.homeClubId)?.shortName ?? "?"}</strong>
                    <span>{nextFixture.homeClubId === club.id ? "DOMICILE" : "EXTÉRIEUR"}</span>
                  </div>
                  <span className="vs-label">VS</span>
                  <div>
                    <Crest name={getClub(nextFixture.awayClubId)?.shortName ?? ""} clubId={nextFixture.awayClubId} />
                    <strong>{getClub(nextFixture.awayClubId)?.shortName ?? "?"}</strong>
                    <span>{nextFixture.awayClubId === club.id ? "DOMICILE" : "EXTÉRIEUR"}</span>
                  </div>
                </div>
                <div className="match-date"><CalendarDays size={12} />{formatDate(nextFixture.date)}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button variant="career" className="full-width" asChild>
                    <Link to="/match"><Play size={14} />Jouer le match</Link>
                  </Button>
                  <Button variant="outline" className="full-width" onClick={playNextMatch} disabled={!!activeInjury || player.condition === "suspended"}>
                    <FastForward size={14} />Simuler
                  </Button>
                </div>
                {(activeInjury || player.condition === "suspended") && (
                  <p style={{ fontSize: 10, color: "var(--coral)", textAlign: "center", marginTop: 8 }}>
                    {activeInjury ? `Tu es blessé — ${activeInjury.daysLeft}j de récupération.` : "Tu es suspendu pour ce match."}
                  </p>
                )}
              </div>
            </section>
          )}

          {matchLocked && !lastMatch && (
            <div style={{ padding: 20, textAlign: "center", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12, color: "var(--muted-foreground)" }}>
              <Check size={18} style={{ margin: "0 auto 8px", color: "var(--primary)" }} />
              Match d'aujourd'hui déjà joué.<br />
              <Link to="/saison" style={{ color: "var(--primary)", textDecoration: "none" }}>Voir le calendrier →</Link>
            </div>
          )}

          {lastMatch && (
            <div style={{ marginTop: 12, padding: 16, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10 }}>
              <div style={{ textAlign: "center", fontSize: 22, fontWeight: 700, fontFamily: "'Barlow', sans-serif" }}>
                {getClub(lastMatch.homeClubId)?.shortName} {lastMatch.homeScore} – {lastMatch.awayScore} {getClub(lastMatch.awayClubId)?.shortName}
              </div>
              <div style={{ textAlign: "center", fontSize: 11, marginTop: 8, color: "var(--muted-foreground)" }}>
                Note : <strong style={{ color: "var(--primary)" }}>{formatRating(lastMatch.userRating.rating)}</strong>
                {" · "}{lastMatch.userRating.goals} but(s), {lastMatch.userRating.assists} passe(s) déc.
              </div>
            </div>
          )}

          {/* Actions du jour */}
          <div className="section-heading actions-heading" style={{ marginTop: 20 }}>
            <h2>Action du jour</h2>
            <span>UNE SEULE PAR JOUR</span>
          </div>
          <div className="quick-actions">
            <Button asChild variant="action" className="training-action">
              <Link to="/entrainement">
                <div className="action-icon"><Dumbbell size={16} /></div>
                <div><strong>S'entraîner</strong><span>Repoussez vos limites · +PA possible</span></div>
                <ArrowRight size={14} />
              </Link>
            </Button>
            <Button variant="action" className="rest-action" onClick={doRest}>
              <div className="action-icon"><Moon size={16} /></div>
              <div><strong>Récupérer</strong><span>Fatigue –30 · Forme +5</span></div>
              <ArrowRight size={14} />
            </Button>
          </div>

          {/* Citations coach */}
          <div className="coach-note">
            <span><Sparkles size={14} /></span>
            <p>
              {coachRelation?.trust && coachRelation.trust >= 70
                ? <><span>&laquo; Le coach croit en toi.<br /></span><strong>Prouve-lui qu'il a raison. &raquo;</strong></>
                : coachRelation?.trust && coachRelation.trust < 30
                ? <><span>&laquo; Le coach doute.<br /></span><strong>Réponds sur le terrain. &raquo;</strong></>
                : <><span>&laquo; Le talent vous fait commencer.<br /></span><strong>La régularité vous fait réussir. &raquo;</strong></>
              }
            </p>
            <small>LE MOT DU COACH</small>
          </div>

          {/* Grille systèmes connectés */}
          <div className="section-heading" style={{ marginTop: 20 }}>
            <h2>Ton univers</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>

            {/* Agent */}
            <SystemCard
              icon={<Briefcase size={14} />}
              title="Mon Agent"
              value={agentState ? agentState.profileId.toUpperCase() : "Aucun"}
              sub={mercatoState?.activeSagas.length ? `${mercatoState.activeSagas.length} saga(s) active(s)` : undefined}
              to="/agent"
              accent={!!mercatoState?.activeSagas.length}
            />

            {/* Fans */}
            <SystemCard
              icon={<Heart size={14} />}
              title="Popularité"
              value={fansState ? `${fansState.fanState?.popularity ?? fansState.popularity ?? 50}%` : "—"}
              sub={fansState?.fanState?.fansSingName || (fansState as any)?.fansSingName ? "Les fans chantent ton nom !" : undefined}
              to="/fans"
              accent={!!(fansState?.fanState?.fansSingName || (fansState as any)?.fansSingName)}
            />

            {/* Mental */}
            <SystemCard
              icon={<Brain size={14} />}
              title="Mental"
              value={mentalState ? `${100 - mentalState.pressure}%` : "—"}
              sub={mentalState?.burnout ? "⚠️ Burnout actif" : mentalState?.pressure && mentalState.pressure > 60 ? "Pression élevée" : undefined}
              to="/wellness"
              accent={!(mentalState?.burnout)}
            />

            {/* Contrat */}
            <SystemCard
              icon={<Shield size={14} />}
              title="Contrat"
              value={`${player.contract.yearsRemaining} an${player.contract.yearsRemaining > 1 ? "s" : ""}`}
              sub={`${formatMoneyCompact(player.contract.salaryPerWeek)}/sem.`}
              to="/club"
              accent={player.contract.yearsRemaining > 1}
            />

            {/* Sponsors */}
            <SystemCard
              icon={<ShoppingBag size={14} />}
              title="Sponsors"
              value={endorsements?.length ?? 0}
              sub={endorsements?.length ? `+${formatMoneyCompact((endorsements as any[]).reduce((s: number, e: any) => s + (e.monthlyPay ?? 0), 0))}/mois` : "Aucun contrat"}
              to="/lifestyle"
            />

            {/* Sélection nationale */}
            <SystemCard
              icon={<Globe size={14} />}
              title="Sélection"
              value={internState ? `${internState.caps ?? 0} caps` : "—"}
              sub={internState?.isCaptain ? "Capitaine national !" : undefined}
              to="/international"
              accent={!!(internState?.isCaptain)}
            />

            {/* Récompenses */}
            <SystemCard
              icon={<Trophy size={14} />}
              title="Trophées"
              value={awardsState?.won?.length ?? 0}
              sub={awardsState?.won?.[0] ? awardsState.won[0] : undefined}
              to="/awards"
            />

            {/* Journal */}
            <SystemCard
              icon={<BookOpen size={14} />}
              title="Journal"
              value={journalState?.entries?.length ?? 0}
              sub="entrées de carrière"
              to="/journal"
            />

          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            COLONNE DROITE — Stats saison + Calendrier + Finances
            ══════════════════════════════════════════════════════ */}
        <div className="right-column">

          <div className="section-heading">
            <h2>Cette saison</h2>
            <span className="tiny-tag">{player.position}</span>
          </div>
          <div className="season-metrics">
            <StatCard icon={<Flag size={14} />}     value={seasonStats?.matches ?? 0}                                    label="Matchs joués"      tone="blue" />
            <StatCard icon={<Target size={14} />}   value={seasonStats?.goals ?? 0}                                      label="Buts marqués"      tone="coral" />
            <StatCard icon={<Zap size={14} />}      value={seasonStats?.assists ?? 0}                                    label="Passes décisives"  tone="yellow" />
            <StatCard icon={<Activity size={14} />} value={seasonStats?.averageRating ? seasonStats.averageRating.toFixed(1) : "—"} label="Note moyenne" tone="ice" />
          </div>

          {myRow && (
            <div className="season-progress" style={{ marginTop: 16 }}>
              <div>
                <span>Classement {divisionName}</span>
                <strong>{myRow.position}e / {standings.length}</strong>
              </div>
              <progress value={standings.length - myRow.position + 1} max={standings.length} />
              <div className="progress-label">
                <span>{myRow.points} pts</span>
                <span>{myRow.won}V {myRow.drawn}N {myRow.lost}D</span>
              </div>
            </div>
          )}

          {/* Statut vestiaire */}
          {squadState && (
            <div style={{ marginTop: 14, padding: "10px 14px", background: squadState.userStatus === "TITULAIRE" ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${squadState.userStatus === "TITULAIRE" ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.06)"}`, borderRadius: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 10, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: ".06em" }}>Statut équipe</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: squadState.userStatus === "TITULAIRE" ? "var(--primary)" : squadState.userStatus === "REMPLAÇANT" ? "oklch(.8 .15 80)" : "var(--coral)" }}>
                  {squadState.userStatus}
                </span>
              </div>
              {coachRelation && (
                <div style={{ marginTop: 6 }}>
                  <Meter label="Confiance coach" value={coachRelation.trust} compact />
                </div>
              )}
              <Link to="/club" style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8, fontSize: 10, color: "var(--primary)", textDecoration: "none" }}>
                <TrendingUp size={11} />Voir relations équipe
              </Link>
            </div>
          )}

          {/* Prochains matchs */}
          <div className="section-heading calendar-heading" style={{ marginTop: 16 }}>
            <h2>À l&apos;horizon</h2>
            <Button asChild variant="ghost" size="icon" aria-label="Calendrier">
              <Link to="/saison"><ArrowRight size={14} /></Link>
            </Button>
          </div>
          <div className="upcoming">
            {season?.fixtures
              .filter(f => !f.played && (f.homeClubId === club.id || f.awayClubId === club.id))
              .slice(nextFixture ? 1 : 0, nextFixture ? 4 : 3)
              .map(f => {
                const opponent  = f.homeClubId === club.id ? f.awayClubId : f.homeClubId;
                const oppClub   = getClub(opponent);
                return (
                  <Link to="/saison" key={f.id} className="fixture-row" style={{ textDecoration: "none", color: "inherit" }}>
                    <div className="fixture-date">
                      <strong>{new Date(f.date).getUTCDate()}</strong>
                      <span>{new Date(f.date).toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" })}</span>
                    </div>
                    <Crest name={oppClub?.shortName ?? "?"} clubId={opponent} small />
                    <div>
                      <strong>{oppClub?.shortName ?? "?"}</strong>
                      <span>J{f.dayNumber} · {f.homeClubId === club.id ? "Dom" : "Ext"}</span>
                    </div>
                    <ChevronRight size={12} />
                  </Link>
                );
              })}
          </div>

          {/* Wallet */}
          <div className="wallet-box" style={{ marginTop: 14 }}>
            <Wallet size={18} />
            <div>
              <span>Votre solde</span>
              <strong>{formatMoneyCompact(career.wallet?.balance ?? 0)}</strong>
            </div>
            <Button asChild variant="ghost" size="icon" aria-label="Finances">
              <Link to="/club"><ArrowRight size={14} /></Link>
            </Button>
          </div>

          {/* Endorsements actifs */}
          {endorsements && endorsements.length > 0 && (
            <div style={{ marginTop: 10, padding: "10px 14px", background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: ".06em" }}>Sponsors actifs</span>
                <Link to="/lifestyle" style={{ fontSize: 10, color: "var(--primary)", textDecoration: "none" }}>Gérer →</Link>
              </div>
              {(endorsements as any[]).slice(0, 2).map((e: any, i: number) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, marginTop: 4 }}>
                  <span>{e.brandId?.toUpperCase()}</span>
                  <span style={{ color: "var(--primary)", fontWeight: 600 }}>+{formatMoneyCompact(e.monthlyPay)}/mois</span>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* ── Objectif saison ── */}
      <div className="bottom-strip">
        <div>
          <span className="strip-icon"><Trophy size={16} /></span>
          <p>
            <span>VOTRE OBJECTIF DE SAISON</span>
            <strong>Progresser et s&apos;imposer en {divisionName}</strong>
          </p>
        </div>
        <span className="objective-tag">EN COURS <span /></span>
      </div>

      {/* ── Toast notification ── */}
      {notice && (
        <div className="toast" style={{ borderColor: notice.type === "success" ? "rgba(16,185,129,0.4)" : notice.type === "warn" ? "rgba(234,179,8,0.4)" : "rgba(255,255,255,0.15)" }}>
          <Activity size={14} style={{ color: notice.type === "success" ? "var(--primary)" : notice.type === "warn" ? "oklch(.8 .15 85)" : "var(--blue)", flexShrink: 0 }} />
          {notice.msg}
          <Button variant="ghost" size="icon" aria-label="Fermer" onClick={() => setNotice(null)}><X size={13} /></Button>
        </div>
      )}
    </Shell>
  );
}
