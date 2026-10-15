"use client";

/**
 * FC CAREER 27 — Choix du mode de carrière.
 * Carrière Joueur en tête (mode principal), Carrière Manager à côté.
 * Lecture seule des sauvegardes : cet écran n'écrit ni ne supprime rien.
 */

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { loadManager } from "../game/manager/storage";
import { formatMoney } from "../game/manager/engine";
import { loadPlayerCareer } from "../game/player2/storage";
import { me as v2Me, myClub as v2Club } from "../game/player2/engine";

interface PlayerSummary {
  name: string;
  position: string;
  overall: number;
  potential: number;
  age: number;
  season: number;
}

interface ManagerSummary {
  name: string;
  club: string;
  season: number;
  week: number;
  balance: number;
  sacked: boolean;
}

function readPlayerSave(): PlayerSummary | null {
  try {
    const raw = window.localStorage.getItem("fc-career-v2:save");
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s?.player) return null;
    return {
      name: `${s.player.firstName ?? ""} ${s.player.lastName ?? ""}`.trim(),
      position: s.player.position ?? "",
      overall: s.player.overall ?? 0,
      potential: s.player.potential ?? 0,
      age: s.player.age ?? 0,
      season: s.career?.season ?? 1,
    };
  } catch {
    return null;
  }
}

export default function ModesPage() {
  const [player, setPlayer] = useState<PlayerSummary | null>(null);
  const [legacy, setLegacy] = useState<PlayerSummary | null>(null);
  const [manager, setManager] = useState<ManagerSummary | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Carrière v2 (nouvelle) en priorité ; la v1 reste accessible à part
    setLegacy(readPlayerSave());
    const v2 = loadPlayerCareer();
    if (v2.ok) {
      const p = v2Me(v2.state);
      setPlayer({
        name: `${v2.state.profile.firstName} ${v2.state.profile.lastName} · ${v2Club(v2.state).shortName}`,
        position: v2.state.profile.position, overall: p.overall, potential: v2.state.profile.potential,
        age: p.age, season: v2.state.shadow.world.season,
      });
    }
    const m = loadManager();
    if (m.ok) {
      const club = m.state.world.clubs.find(c => c.id === m.state.clubId);
      setManager({
        name: m.state.managerName, club: club?.name ?? "—",
        season: m.state.world.season, week: m.state.world.currentWeek,
        balance: m.state.finances.balance, sacked: m.state.status === "sacked",
      });
    }
    setReady(true);
  }, []);

  const playerHref = player ? "/client/fc-career/joueur" : "/client/fc-career/joueur/nouveau";

  return (
    <main className="fcm-modes">
      <style>{CSS}</style>
      <header className="fcm-modes__head">
        <p className="fcm-modes__kicker">FC Career 27</p>
        <h1>Choisis ta carrière</h1>
      </header>

      <div className="fcm-modes__grid">
        {/* ── Carrière Joueur : mode principal ─────────────────────────── */}
        <Link href={playerHref} className="fcm-card fcm-card--player" aria-label="Carrière Joueur">
          <span className="fcm-card__tag">Mode principal</span>
          <div className="fcm-card__icon" aria-hidden>⚽</div>
          <h2>Carrière Joueur</h2>
          <p className="fcm-card__lead">
            Crée ton joueur, gagne ta place, prends les décisions clés en match, négocie tes
            contrats et vise l&apos;Étoile d&apos;Or. Transferts, prêts, sélection nationale.
          </p>
          {ready && player ? (
            <div className="fcm-card__save">
              <div>
                <strong>{player.name || "Ton joueur"}</strong>
                <span>{player.position} · {player.age} ans · saison {player.season}</span>
              </div>
              <div className="fcm-ovr">
                <b>{player.overall}</b>
                <small>pot. {player.potential}</small>
              </div>
            </div>
          ) : ready ? (
            <div className="fcm-card__save fcm-card__save--empty">Aucune carrière en cours</div>
          ) : null}
          <span className="fcm-card__cta">{player ? "Continuer ma carrière" : "Créer mon joueur"}</span>
        </Link>

        {/* ── Carrière Manager ─────────────────────────────────────────── */}
        <Link href={manager ? "/client/fc-career/manager" : "/client/fc-career/manager/nouvelle"} className="fcm-card fcm-card--manager" aria-label="Carrière Manager">
          <div className="fcm-card__icon" aria-hidden>📋</div>
          <h2>Carrière Manager</h2>
          <p className="fcm-card__lead">
            Prends un club, fixe ta tactique, gère le mercato, les finances et le conseil
            d&apos;administration. Match en direct minute par minute.
          </p>
          {ready && manager ? (
            <div className="fcm-card__save">
              <div>
                <strong>{manager.club}</strong>
                <span>{manager.name} · saison {manager.season}, semaine {manager.week}{manager.sacked ? " · licencié" : ""}</span>
              </div>
              <div className="fcm-ovr fcm-ovr--money"><b>{formatMoney(manager.balance)}</b><small>trésorerie</small></div>
            </div>
          ) : null}
          <span className="fcm-card__cta fcm-card__cta--manager">{manager ? "Reprendre mon club" : "Choisir un club"}</span>
        </Link>
      </div>

      {ready && legacy && (
        <Link href="/client/fc-career/dashboard" className="fcm-modes__legacy">
          Ancienne carrière : {legacy.name || "ton joueur"} ({legacy.overall}) · continuer en version 1
        </Link>
      )}
      <Link href="/client/fc-career" className="fcm-modes__back">Quitter</Link>
    </main>
  );
}

const CSS = `
.fcm-modes{min-height:100dvh;background:radial-gradient(ellipse 70% 50% at 20% 0%,rgba(20,35,80,.55),transparent),radial-gradient(ellipse 50% 40% at 90% 100%,rgba(201,162,39,.06),transparent),#05081a;color:#E8ECF0;font-family:'Inter',system-ui,sans-serif;padding:48px max(16px,env(safe-area-inset-left,0px)) 40px max(16px,env(safe-area-inset-right,0px));display:flex;flex-direction:column;align-items:center;gap:28px}
.fcm-modes__head{text-align:center}
.fcm-modes__kicker{font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:13px;letter-spacing:.14em;color:#c9a227;text-transform:uppercase;margin:0 0 6px}
.fcm-modes__head h1{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:clamp(30px,6vw,46px);line-height:1;margin:0;text-transform:uppercase;text-wrap:balance}
.fcm-modes__grid{display:grid;grid-template-columns:1.25fr 1fr;gap:16px;width:100%;max-width:880px}
@media (max-width:720px){.fcm-modes__grid{grid-template-columns:1fr}}
.fcm-card{position:relative;display:flex;flex-direction:column;gap:12px;padding:26px 24px 22px;border-radius:14px;background:rgba(13,17,40,.92);border:1px solid rgba(100,130,200,.16);color:inherit;text-decoration:none;min-width:0;overflow:hidden}
.fcm-card--player{border-color:rgba(201,162,39,.45);box-shadow:0 0 50px rgba(201,162,39,.08);transition:transform .2s,box-shadow .2s}
.fcm-card--player::before{content:"";position:absolute;inset:0 0 auto;height:3px;background:linear-gradient(90deg,transparent,#c9a227 25%,#e8c84a 50%,#c9a227 75%,transparent)}
.fcm-card--player:hover{transform:translateY(-2px);box-shadow:0 0 60px rgba(201,162,39,.16)}
.fcm-card--player:focus-visible{outline:2px solid #e8c84a;outline-offset:3px}
.fcm-card__tag{align-self:flex-start;font-size:11px;font-weight:700;color:#05081a;background:#c9a227;padding:3px 9px;border-radius:999px}
.fcm-card__icon{font-size:34px;line-height:1}
.fcm-card h2{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:30px;line-height:1;margin:0;text-transform:uppercase}
.fcm-card--player h2{color:#e8c84a}
.fcm-card__lead{margin:0;font-size:14px;line-height:1.55;color:#8E9DC0;max-width:52ch}
.fcm-card__save{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 14px;border-radius:10px;background:rgba(2,5,16,.7);border:1px solid rgba(100,130,200,.12)}
.fcm-card__save strong{display:block;font-size:15px}
.fcm-card__save span{font-size:12px;color:#8E9DC0}
.fcm-card__save--empty{font-size:13px;color:#8E9DC0}
.fcm-ovr{text-align:right;flex-shrink:0}
.fcm-ovr b{display:block;font-family:'Barlow Condensed',sans-serif;font-size:30px;font-weight:900;line-height:1;color:#c9a227;font-variant-numeric:tabular-nums}
.fcm-ovr--money b{font-size:20px;color:#37D99A}
.fcm-ovr small{font-size:11px;color:#8E9DC0}
.fcm-card__cta{margin-top:auto;display:flex;align-items:center;justify-content:center;height:46px;border-radius:9px;background:linear-gradient(135deg,#c9a227,#e8c84a);color:#05081a;font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:16px;text-transform:uppercase;letter-spacing:.04em}
.fcm-card__cta--manager{background:rgba(100,130,200,.12);color:#E8ECF0;border:1px solid rgba(100,130,200,.25)}
.fcm-card--manager{transition:transform .2s,border-color .2s}.fcm-card--manager:hover{transform:translateY(-2px);border-color:rgba(100,130,200,.35)}
.fcm-card--manager:focus-visible{outline:2px solid #e8c84a;outline-offset:3px}
.fcm-modes__back{font-size:13px;color:#8E9DC0}
.fcm-modes__legacy{font-size:13px;color:#c9a227;text-align:center;max-width:560px}
@media (prefers-reduced-motion:reduce){.fcm-card--player{transition:none}.fcm-card--player:hover{transform:none}}
`;
