"use client";

/**
 * FC CAREER 27 — Fiches du monde (fenêtre) : joueur, club et feuille de match.
 * Un fournisseur unique par mode de jeu ; n'importe quel nom de joueur ou de
 * club peut ouvrir sa fiche, et d'une fiche on passe à une autre (avec retour).
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { WorldLiveState } from "../../game/domain/worldState";
import type { MatchSheet } from "../../game/domain/matchSheet";
import { playerRecord } from "../../game/domain/playerRecord";
import { clubHistory } from "../../game/domain/clubHistory";
import { isNation, leagueZones, teamName } from "../../game/domain/competitions";
import { seasonLabel } from "../../game/domain/calendar";
import { FORMATIONS, aiTacticFor, autoPickLineup } from "../../game/manager/tactics";
import { NATION_BY_ID } from "../../game/data/cp/nations";
import { fullName } from "../../game/utils/names";
import { Crest, Empty, Ovr, POS_FR, Section } from "./kit";
import { fontVars } from "./fonts";

const seasonName = (w: WorldLiveState, season: number) => (w.startYear ? seasonLabel(w.startYear + season - 1) : `Saison ${season}`);
const money = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(1).replace(".", ",")} M€` : `${Math.round(v / 1000)} k€`);

type View = { kind: "player"; id: string } | { kind: "club"; id: string } | { kind: "match"; sheet: MatchSheet };

interface SheetsCtx {
  openPlayer: (id: string) => void;
  openClub: (id: string) => void;
  openMatch: (sheet: MatchSheet) => void;
  highlight?: string;
  meClub?: string;
}
const Ctx = createContext<SheetsCtx | null>(null);

export function useSheets(): SheetsCtx {
  return useContext(Ctx) ?? { openPlayer: () => {}, openClub: () => {}, openMatch: () => {} };
}

export function SheetsProvider({ world, highlight, meClub, children }: { world: WorldLiveState; highlight?: string; meClub?: string; children: React.ReactNode }) {
  const [stack, setStack] = useState<View[]>([]);
  const push = useCallback((v: View) => setStack(s => [...s, v].slice(-8)), []);
  const value = useMemo<SheetsCtx>(() => ({
    openPlayer: id => push({ kind: "player", id }), openClub: id => { if (!isNation(id)) push({ kind: "club", id }); },
    openMatch: sheet => push({ kind: "match", sheet }), highlight, meClub,
  }), [push, highlight, meClub]);
  const top = stack[stack.length - 1];
  const close = useCallback(() => setStack([]), []);
  const back = useCallback(() => setStack(s => s.slice(0, -1)), []);
  useEffect(() => {
    if (!top) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") back(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [top, back]);
  return (
    <Ctx.Provider value={value}>
      {children}
      {top && createPortal(
        <div className={`mg-app mg-portal ${fontVars}`}>
          <div className="pc-sheet" role="dialog" aria-modal="true" onClick={close}>
            <div className="pc-sheet__panel" onClick={e => e.stopPropagation()}>
              <div className="pc-sheet__nav">
                {stack.length > 1 ? <button type="button" className="mg-btn mg-btn--sm mg-btn--ghost" onClick={back}>← Retour</button> : <span />}
                <button type="button" className="mg-btn mg-btn--sm mg-btn--ghost" onClick={close} aria-label="Fermer la fiche">Fermer</button>
              </div>
              <Ctx.Provider value={value}>
                {top.kind === "player" && <PlayerView world={world} id={top.id} />}
                {top.kind === "club" && <ClubView world={world} id={top.id} />}
                {top.kind === "match" && <MatchView world={world} sheet={top.sheet} />}
              </Ctx.Provider>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </Ctx.Provider>
  );
}

// ─── Liens ───────────────────────────────────────────────────────────────────

export function PlayerName({ world, id, short }: { world: WorldLiveState; id: string; short?: boolean }) {
  const { openPlayer, highlight } = useSheets();
  const p = world.players.find(x => x.id === id);
  if (!p) return <span>—</span>;
  return <button type="button" className={`pc-plink${id === highlight ? " pc-me" : ""}`} onClick={() => openPlayer(id)}>{short ? p.lastName : fullName(p)}</button>;
}

export function ClubName({ world, id, crest = 16, short }: { world: WorldLiveState; id: string; crest?: number; short?: boolean }) {
  const { openClub, meClub } = useSheets();
  if (isNation(id)) return <span className="mg-pname">{NATION_BY_ID[id]?.flag} {NATION_BY_ID[id]?.name ?? id}</span>;
  const c = world.clubs.find(x => x.id === id);
  return (
    <button type="button" className={`pc-plink pc-clublink${id === meClub ? " pc-me" : ""}`} onClick={() => openClub(id)}>
      {crest > 0 && <Crest club={c} size={crest} />}{short ? c?.shortName : teamName(world, id)}
    </button>
  );
}

/** Ancienne API : nom cliquable avec action libre. */
export function PlayerLink({ name, onOpen, me }: { name: string; onOpen: () => void; me?: boolean }) {
  return <button type="button" className={`pc-plink${me ? " pc-me" : ""}`} onClick={onOpen}>{name}</button>;
}

// ─── Joueur ──────────────────────────────────────────────────────────────────

function PlayerView({ world, id }: { world: WorldLiveState; id: string }) {
  const { highlight } = useSheets();
  const p = world.players.find(x => x.id === id);
  const record = useMemo(() => playerRecord(world, id), [world, id]);
  const clubOf = (cid: string) => world.clubs.find(c => c.id === cid);
  if (!p) return <Empty>Joueur introuvable.</Empty>;
  const club = clubOf(p.clubId);
  const country = world.countries.find(c => c.id === p.countryId);
  const totals = {
    apps: Math.max(p.careerAppearances, record.reduce((a, r) => a + r.apps, 0)),
    goals: Math.max(p.careerGoals, record.reduce((a, r) => a + r.goals, 0)),
    assists: Math.max(p.careerAssists, record.reduce((a, r) => a + r.assists, 0)),
  };
  const face = p.face;
  return (
    <>
      <header className="pc-sheet__head">
        <Crest club={club} size={44} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2>{fullName(p)}{p.id === highlight ? " (vous)" : ""}</h2>
          <p className="mg-small">{POS_FR[p.position]} · {p.age} ans · {country?.name ?? NATION_BY_ID[p.nationality]?.name ?? p.nationality} · {p.clubId === "retired" ? "retraité" : club ? <ClubName world={world} id={club.id} crest={0} /> : "libre"}</p>
        </div>
        <Ovr value={p.overall} />
      </header>
      {face && (
        <div className="pc-sheet__face">
          {(["pac", "sho", "pas", "dri", "def", "phy"] as const).map(k => <div key={k}><b>{face[k]}</b><span>{({ pac: "VIT", sho: "TIR", pas: "PAS", dri: "DRI", def: "DÉF", phy: "PHY" })[k]}</span></div>)}
        </div>
      )}
      <dl className="pc-sheet__totals">
        <div><dt>Matchs</dt><dd>{totals.apps}</dd></div>
        <div><dt>Buts</dt><dd>{totals.goals}</dd></div>
        <div><dt>Passes déc.</dt><dd>{totals.assists}</dd></div>
        <div><dt>Valeur</dt><dd>{money(p.marketValue)}</dd></div>
      </dl>
      {record.length === 0 ? <Empty>Aucune statistique enregistrée pour ce joueur dans ce monde.</Empty> : record.map(r => (
        <section key={r.season} className="pc-sheet__season">
          <h3>{seasonName(world, r.season)}<span className="mg-small"> · {r.apps} matchs · {r.goals} buts · {r.assists} passes{r.avgRating ? ` · note ${r.avgRating.toFixed(2).replace(".", ",")}` : ""}</span></h3>
          {r.lines.length > 0 && (
            <div className="mg-tablewrap">
              <table className="mg-table">
                <thead><tr><th>Compétition</th><th>Club</th><th className="num">M</th><th className="num">B</th><th className="num">PD</th></tr></thead>
                <tbody>
                  {r.lines.map(l => (
                    <tr key={l.compId + l.clubId}>
                      <td>{l.name}</td>
                      <td><ClubName world={world} id={l.clubId} short /></td>
                      <td className="num">{l.apps}</td><td className="num">{l.goals}</td><td className="num">{l.assists}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {(r.awards.length > 0 || r.trophies.length > 0) && (
            <div className="pc-chips" style={{ marginTop: 8 }}>
              {r.trophies.map(t => <span key={t.compId} className="pc-chip is-plus">🏆 {t.name}</span>)}
              {r.awards.map((a, i) => <span key={i} className="pc-chip">{a.id === "league_title" ? `🏆 ${a.label}` : a.id === "potm" ? a.label.split(" · ")[0] : a.label}</span>)}
            </div>
          )}
        </section>
      ))}
    </>
  );
}

// ─── Club ────────────────────────────────────────────────────────────────────

const POS_ORDER = ["GK", "CB", "LB", "RB", "DM", "CM", "AM", "LW", "RW", "ST"];

function ClubView({ world, id }: { world: WorldLiveState; id: string }) {
  const [tab, setTab] = useState<"squad" | "xi" | "history">("squad");
  const club = world.clubs.find(c => c.id === id);
  const squad = world.players.filter(p => p.clubId === id).sort((a, b) => POS_ORDER.indexOf(a.position) - POS_ORDER.indexOf(b.position) || b.overall - a.overall);
  const hist = clubHistory(world, id);
  if (!club) return <Empty>Club introuvable.</Empty>;
  const league = world.leagues.find(l => l.id === club.leagueId);
  const rows = world.standings[club.leagueId] ?? [];
  const rank = rows.findIndex(r => r.clubId === id);
  const zone = rank >= 0 ? leagueZones(world, club.leagueId)[rank] : null;
  const coach = world.coaches.find(c => c.clubId === id && c.teamLevel === "first_team" && c.status === "active");
  const tactic = aiTacticFor(club.philosophy);
  const lineup = autoPickLineup(squad, tactic.formation);
  const goalsOf = new Map<string, number>();
  for (const st of world.playerStats) if (st.season === world.season && st.clubId === id) goalsOf.set(st.playerId, (goalsOf.get(st.playerId) ?? 0) + st.goals);
  const avg = squad.length ? Math.round(squad.slice().sort((a, b) => b.overall - a.overall).slice(0, 11).reduce((t, p) => t + p.overall, 0) / Math.min(11, squad.length)) : 0;
  const coachName = (cid: string) => { const c = world.coaches.find(x => x.id === cid); return c ? `${c.firstName} ${c.lastName}` : "Entraîneur"; };

  return (
    <>
      <header className="pc-sheet__head" style={{ ["--club" as string]: club.colors.primary }}>
        <Crest club={club} size={52} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2>{club.name}</h2>
          <p className="mg-small">{league?.name}{rank >= 0 ? ` · ${rank + 1}e, ${rows[rank].points} pts` : ""}{coach ? ` · entraîneur ${coach.firstName} ${coach.lastName}` : ""}</p>
          {zone && <span className={`pc-zone is-${zone}`}>{({ ucl: "Qualif. Ligue des champions", uel: "Qualif. Ligue Europa", promo: "Montée directe", playoff: "Barrages", releg: "Zone de relégation" })[zone]}</span>}
        </div>
        <Ovr value={avg} />
      </header>
      <dl className="pc-sheet__totals">
        <div><dt>Trophées</dt><dd>{hist.total}</dd></div>
        <div><dt>Effectif</dt><dd>{squad.length}</dd></div>
        <div><dt>Réputation</dt><dd>{Math.round(world.clubReputations[id] ?? club.reputation)}</dd></div>
        <div><dt>Système</dt><dd>{tactic.formation}</dd></div>
      </dl>
      <div className="mg-seg" role="tablist" aria-label="Fiche du club">
        <button type="button" aria-pressed={tab === "squad"} onClick={() => setTab("squad")}>Effectif</button>
        <button type="button" aria-pressed={tab === "xi"} onClick={() => setTab("xi")}>Composition</button>
        <button type="button" aria-pressed={tab === "history"} onClick={() => setTab("history")}>Histoire</button>
      </div>
      {tab === "squad" && (
        <div className="mg-tablewrap">
          <table className="mg-table">
            <thead><tr><th>Poste</th><th>Joueur</th><th className="num">Âge</th><th className="num">Note</th><th className="num">Buts</th></tr></thead>
            <tbody>
              {squad.map(p => (
                <tr key={p.id}>
                  <td><span className="mg-small">{POS_FR[p.position]}</span></td>
                  <td><PlayerName world={world} id={p.id} />{p.injury && p.injury.weeksRemaining > 0 ? <span className="pc-inj" title="Blessé"> ✚</span> : null}</td>
                  <td className="num">{p.age}</td><td className="num"><b>{p.overall}</b></td><td className="num">{goalsOf.get(p.id) ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tab === "xi" && <Formation world={world} formation={tactic.formation} ids={lineup.starters} />}
      {tab === "history" && (
        <div className="mg-stack">
          <section className="pc-sheet__season">
            <h3>Palmarès <span className="mg-small">depuis {world.startYear ? seasonLabel(world.startYear) : "le début"}</span></h3>
            {hist.honours.length === 0 ? <p className="mg-muted" style={{ margin: 0 }}>Aucun trophée remporté pour l&apos;instant.</p> : (
              <div className="pc-honours">
                {hist.honours.map(h => (
                  <div key={h.key} className="pc-honour"><b>{h.seasons.length}</b><span>{h.name}</span><small>{h.seasons.map(s => seasonName(world, s)).join(", ")}</small></div>
                ))}
              </div>
            )}
          </section>
          <div className="pc-leaders">
            {([["Meilleurs buteurs", hist.scorers, "buts"], ["Meilleurs passeurs", hist.assisters, "passes"], ["Plus de matchs", hist.apps, "matchs"]] as const).map(([t, list, unit]) => (
              <section key={t} className="pc-sheet__season">
                <h3>{t}</h3>
                {list.length === 0 ? <p className="mg-muted" style={{ margin: 0 }}>—</p> : (
                  <ol className="pc-podium">{list.map(l => <li key={l.playerId}><PlayerName world={world} id={l.playerId} /> <b>{l.value}</b> <span className="mg-small">{unit}</span></li>)}</ol>
                )}
              </section>
            ))}
          </div>
          <section className="pc-sheet__season">
            <h3>Meilleur entraîneur</h3>
            {hist.bestCoach ? <p style={{ margin: 0 }}><b>{coachName(hist.bestCoach.coachId)}</b> <span className="mg-small">· {hist.bestCoach.titles} trophée{hist.bestCoach.titles > 1 ? "s" : ""}</span></p>
              : <p className="mg-muted" style={{ margin: 0 }}>{coach ? `${coach.firstName} ${coach.lastName}, en poste, n'a pas encore gagné de trophée ici.` : "—"}</p>}
          </section>
        </div>
      )}
    </>
  );
}

function Formation({ world, formation, ids }: { world: WorldLiveState; formation: keyof typeof FORMATIONS; ids: string[] }) {
  const slots = FORMATIONS[formation];
  return (
    <div className="pc-formation">
      {ids.map((pid, i) => {
        const s = slots[i];
        const p = world.players.find(x => x.id === pid);
        if (!s || !p) return null;
        return (
          <div key={pid} className="pc-formation__slot" style={{ left: `${s.x}%`, top: `${s.y}%` }}>
            <span className="pc-formation__ovr">{p.overall}</span>
            <PlayerName world={world} id={pid} short />
          </div>
        );
      })}
    </div>
  );
}

// ─── Feuille de match ────────────────────────────────────────────────────────

function compLabel(w: WorldLiveState, id: string) {
  if (id === "friendly") return "Matchs amicaux internationaux";
  return w.leagues.find(l => l.id === id)?.name ?? (w.competitions ?? []).find(c => c.id === id)?.name ?? (w.trophies ?? []).find(t => t.compId === id)?.name ?? id;
}

function MatchView({ world, sheet }: { world: WorldLiveState; sheet: MatchSheet }) {
  const goalsFor = (side: "home" | "away") => sheet.goals.filter(g => g.side === side);
  const name = (pid?: string) => world.players.find(p => p.id === pid);
  const stat = (label: string, h: number, a: number, pct = false) => (
    <div className="pc-statrow">
      <b>{h}{pct ? " %" : ""}</b>
      <div className="pc-statrow__bar"><span style={{ width: `${(h / Math.max(1, h + a)) * 100}%` }} /></div>
      <span className="mg-small">{label}</span>
      <div className="pc-statrow__bar is-away"><span style={{ width: `${(a / Math.max(1, h + a)) * 100}%` }} /></div>
      <b>{a}{pct ? " %" : ""}</b>
    </div>
  );
  const lineup = (side: "home" | "away") => (
    <div className="pc-lineup">
      <h4><ClubName world={world} id={side === "home" ? sheet.homeClubId : sheet.awayClubId} crest={16} short /></h4>
      <ol>
        {sheet[side].xi.map(pid => (
          <li key={pid}>
            <span className="mg-small">{POS_FR[name(pid)?.position ?? ""] ?? ""}</span> <PlayerName world={world} id={pid} short />
            {sheet.goals.filter(g => g.playerId === pid).map((g, i) => <span key={i} className="pc-goalmark" title={`But ${g.minute}'`}>⚽</span>)}
            {sheet.ratings?.[pid] !== undefined && <span className="pc-rating">{sheet.ratings[pid].toFixed(1)}</span>}
          </li>
        ))}
      </ol>
      {sheet[side].subs.length > 0 && <p className="mg-small" style={{ margin: "6px 0 0" }}>Entrés : {sheet[side].subs.map((pid, i) => <React.Fragment key={pid}>{i ? ", " : ""}<PlayerName world={world} id={pid} short /></React.Fragment>)}</p>}
    </div>
  );
  return (
    <>
      <p className="mg-small" style={{ margin: 0 }}>{compLabel(world, sheet.compId)}{sheet.stage ? ` · ${sheet.stage}` : ""} · {sheet.day === "mid" ? "match de semaine" : "week-end"}</p>
      <div className="pc-msheet__score">
        <div><ClubName world={world} id={sheet.homeClubId} crest={40} /></div>
        <b>{sheet.hs} - {sheet.as}</b>
        <div><ClubName world={world} id={sheet.awayClubId} crest={40} /></div>
      </div>
      {sheet.pens && <p className="mg-small" style={{ textAlign: "center", margin: 0 }}>Tirs au but : {sheet.pens[0]} - {sheet.pens[1]}</p>}
      <div className="pc-msheet__goals">
        <ul>{goalsFor("home").map((g, i) => <li key={i}>{g.minute}&apos; <PlayerName world={world} id={g.playerId ?? ""} short />{g.assistId ? <span className="mg-small"> ({name(g.assistId)?.lastName})</span> : null}</li>)}</ul>
        <ul className="is-away">{goalsFor("away").map((g, i) => <li key={i}>{g.assistId ? <span className="mg-small">({name(g.assistId)?.lastName}) </span> : null}<PlayerName world={world} id={g.playerId ?? ""} short /> {g.minute}&apos;</li>)}</ul>
      </div>
      <div className="pc-msheet__stats">
        {stat("Possession", sheet.home.possession, sheet.away.possession, true)}
        {stat("Tirs", sheet.home.shots, sheet.away.shots)}
        {stat("Tirs cadrés", sheet.home.onTarget, sheet.away.onTarget)}
      </div>
      <div className="pc-msheet__lineups">{lineup("home")}{lineup("away")}</div>
    </>
  );
}

// ─── Résultats de la semaine ─────────────────────────────────────────────────

/** Résultats de la semaine écoulée (ou en cours), groupés par compétition, les matchs du club d'abord. */
export function WeekResults({ world, clubId, title = "Résultats de la semaine", limit }: { world: WorldLiveState; clubId?: string; title?: string; limit?: number }) {
  const { openMatch } = useSheets();
  const sheets = world.weekSheets ?? [];
  const last = sheets.length ? Math.max(...sheets.map(s => s.weekIdx)) : null;
  const week = sheets.filter(s => s.weekIdx === last);
  const [all, setAll] = useState(false);
  if (!week.length) return <Section title={title}><Empty>Pas encore de match joué.</Empty></Section>;
  const mine = (s: MatchSheet) => s.homeClubId === clubId || s.awayClubId === clubId;
  const myLeague = clubId ? world.clubs.find(c => c.id === clubId)?.leagueId : undefined;
  const order = (s: MatchSheet) => (mine(s) ? 0 : s.compId === myLeague ? 1 : s.day === "mid" ? 2 : 3);
  const groups = new Map<string, MatchSheet[]>();
  for (const s of [...week].sort((a, b) => order(a) - order(b))) {
    const k = `${s.compId}|${s.stage ?? ""}`;
    groups.set(k, [...(groups.get(k) ?? []), s]);
  }
  const shown = [...groups.entries()].filter(([k], i) => all || i < (limit ?? 3) || k.split("|")[0] === myLeague);
  return (
    <Section title={title} aside={<span className="mg-small">Touchez un match</span>}>
      <div className="mg-stack" style={{ gap: 12 }}>
        {shown.map(([k, list]) => (
          <div key={k}>
            <h3 className="pc-subhead">{compLabel(world, list[0].compId)}{list[0].stage ? ` · ${list[0].stage}` : ""}{list[0].day === "mid" ? " · semaine" : ""}</h3>
            <div className="pc-results">
              {list.map(s => (
                <button key={s.id} type="button" className={`pc-result${mine(s) ? " is-mine" : ""}`} onClick={() => openMatch(s)}>
                  <span className="pc-result__team"><Crest club={world.clubs.find(c => c.id === s.homeClubId)} size={16} />{isNation(s.homeClubId) ? teamName(world, s.homeClubId) : world.clubs.find(c => c.id === s.homeClubId)?.shortName}</span>
                  <b>{s.hs} - {s.as}{s.pens ? "*" : ""}</b>
                  <span className="pc-result__team is-away">{isNation(s.awayClubId) ? teamName(world, s.awayClubId) : world.clubs.find(c => c.id === s.awayClubId)?.shortName}<Crest club={world.clubs.find(c => c.id === s.awayClubId)} size={16} /></span>
                </button>
              ))}
            </div>
          </div>
        ))}
        {groups.size > shown.length && <button type="button" className="mg-link" onClick={() => setAll(true)}>Voir toutes les compétitions ({groups.size})</button>}
      </div>
    </Section>
  );
}
