"use client";

/** FC CAREER 27 — Fiche individuelle de fin de match, façon FC. */

import React from "react";
import type { PlayerLive } from "../../game/player2/live";
import type { ManagerMatchReport } from "../../game/manager/types";
import type { PlayerCareerState } from "../../game/player2/types";
import { playerMatchStats } from "../../game/player2/matchStats";
import { Section } from "../../manager/_ui/kit";

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)} %` : "–");

export function MatchReportCard({ live, report }: { live: PlayerLive; report: ManagerMatchReport | null; state: PlayerCareerState }) {
  const s = playerMatchStats(live, report);
  if (!s.minutes) return null;
  const gk = live.position === "GK";
  const tiles: [string, string][] = [
    ["Note", s.rating !== null ? s.rating.toFixed(1).replace(".", ",") : "–"],
    ["Minutes", `${s.minutes}'`], ["Buts", String(s.goals)], ["Passes D.", String(s.assists)],
  ];
  const rows: [string, string, string][] = [
    ...(gk ? [["Arrêts", String(s.saves), ""] as [string, string, string]] : [["Tirs (cadrés)", `${s.shots} (${s.shotsOnTarget})`, ""] as [string, string, string]]),
    ["Passes réussies", `${s.passesDone}/${s.passes}`, pct(s.passesDone, s.passes)],
    ["Passes clés", String(s.keyPasses), ""],
    ["Dribbles réussis", `${s.dribblesDone}/${s.dribbles}`, pct(s.dribblesDone, s.dribbles)],
    ["Duels gagnés", `${s.duelsWon}/${s.duels}`, pct(s.duelsWon, s.duels)],
    ["Tacles", String(s.tackles), ""],
    ["Distance parcourue", `${s.km.toFixed(1).replace(".", ",")} km`, ""],
    ["Moments clés réussis", `${s.decisionsWon}/${s.decisions}`, pct(s.decisionsWon, s.decisions)],
  ];
  return (
    <Section title="Ta fiche du match">
      <div className="pc-recap__tiles">{tiles.map(([l, v]) => <div key={l}><b>{v}</b><span>{l}</span></div>)}</div>
      <dl className="pc-mstats">
        {rows.map(([l, v, p]) => <React.Fragment key={l}><dt>{l}</dt><dd>{v}{p && <span className="mg-small"> · {p}</span>}</dd></React.Fragment>)}
      </dl>
    </Section>
  );
}
