"use client";

/** FC CAREER 27 — Carrière Joueur v2 : création du joueur et choix du premier club. */

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { generateWorld } from "../../game/domain/worldGenerator";
import { seedFor, squadStrength } from "../../game/manager/engine";
import type { WorldPlayerPosition } from "../../game/data/worldPlayers";
import { archivePlayerSave, loadPlayerCareer, readLegacySave } from "../../game/player2/storage";
import { readLegacy } from "../../game/player2/migrate";
import type { Foot } from "../../game/player2/types";
import { usePlayer } from "../_ui/PlayerContext";
import { Crest, Ovr, POS_FR } from "../../manager/_ui/kit";

const POSITIONS: WorldPlayerPosition[] = ["ST", "LW", "RW", "AM", "CM", "DM", "LB", "RB", "CB", "GK"];
const POS_LONG: Record<WorldPlayerPosition, string> = {
  ST: "Buteur", LW: "Ailier gauche", RW: "Ailier droit", AM: "Milieu offensif", CM: "Milieu central",
  DM: "Milieu défensif", LB: "Latéral gauche", RB: "Latéral droit", CB: "Défenseur central", GK: "Gardien",
};
const FEET: { id: Foot; label: string }[] = [{ id: "right", label: "Droit" }, { id: "left", label: "Gauche" }, { id: "both", label: "Les deux" }];

export default function NewPlayerPage() {
  const router = useRouter();
  const { run, state, notify } = usePlayer();
  const [seed, setSeed] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nationality, setNationality] = useState("valtara");
  const [position, setPosition] = useState<WorldPlayerPosition>("ST");
  const [foot, setFoot] = useState<Foot>("right");
  const [clubId, setClubId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => { setSeed(seedFor(`fc27-joueur-${Date.now()}-${Math.random()}`)); }, []);
  const world = useMemo(() => (seed ? generateWorld(seed) : null), [seed]);
  const clubs = useMemo(() => (world ? world.clubs.filter(c => c.tier >= 2)
    .map(c => ({ club: c, strength: squadStrength(world, c.id), country: world.countries.find(k => k.id === c.countryId)?.name ?? "" }))
    .sort((a, b) => a.strength - b.strength) : []), [world]);
  const existing = typeof window !== "undefined" ? loadPlayerCareer() : { ok: false as const, reason: "empty" as const };
  const hasSave = existing.ok || (!existing.ok && existing.reason === "corrupt") || !!state;
  const nameOk = firstName.trim().length >= 2 && lastName.trim().length >= 2;
  const [legacyRaw, setLegacyRaw] = useState<unknown>(null);
  useEffect(() => { setLegacyRaw(readLegacySave()); }, []);
  const legacy = useMemo(() => readLegacy(legacyRaw), [legacyRaw]);
  const [confirmImport, setConfirmImport] = useState(false);

  function importLegacy() {
    if (!legacyRaw) return;
    if (hasSave && !confirmImport) { setConfirmImport(true); return; }
    if (!archivePlayerSave()) { notify(false, "Impossible d'archiver la carrière v2 actuelle : import annulé pour ne rien perdre."); return; }
    const r = run({ type: "IMPORT_LEGACY", raw: legacyRaw });
    if (r?.ok) router.push("/client/fc-career/joueur");
  }

  function start() {
    if (!seed || !clubId || !nameOk) return;
    if (hasSave && !confirm) { setConfirm(true); return; }
    if (!archivePlayerSave()) { notify(false, "Impossible d'archiver la carrière actuelle : création annulée pour ne rien perdre."); return; }
    run({ type: "NEW", input: { seed, clubId, firstName: firstName.trim(), lastName: lastName.trim(), nationality, position, foot } });
    router.push("/client/fc-career/joueur");
  }

  if (!world) return <div className="mg-center"><p className="mg-muted">Préparation du monde…</p></div>;

  return (
    <div className="mg-stack">
      <div className="mg-pagehead">
        <div><h1>Crée ton joueur</h1><p>17 ans, un premier contrat pro, tout reste à prouver.</p></div>
      </div>

      {legacy && (
        <div className="mg-card mg-card--accent mg-stack" aria-label="Importer ma carrière actuelle">
          <div className="mg-row mg-row--between">
            <div>
              <strong style={{ fontSize: 17 }}>Continuer avec {legacy.name}</strong>
              <p className="mg-small" style={{ margin: "2px 0 0" }}>
                Votre carrière actuelle : {legacy.position} · {legacy.age} ans · note {legacy.overall} · {legacy.apps} match(s), {legacy.goals} but(s).
                Elle est convertie dans la nouvelle version ; l&apos;originale reste intacte et jouable.
              </p>
            </div>
            <button type="button" className="mg-btn mg-btn--gold" onClick={importLegacy}>{confirmImport ? "Confirmer l'import" : "Importer ma carrière"}</button>
          </div>
          {confirmImport && <p className="mg-warn">Une carrière v2 existe déjà : elle sera archivée en sauvegarde de secours avant l&apos;import.</p>}
        </div>
      )}

      <div className="mg-card mg-stack">
        <div className="mg-filters">
          <label className="mg-field"><span>Prénom</span><input id="pc-first" className="mg-input" maxLength={20} value={firstName} onChange={e => setFirstName(e.target.value)} /></label>
          <label className="mg-field"><span>Nom</span><input id="pc-last" className="mg-input" maxLength={20} value={lastName} onChange={e => setLastName(e.target.value)} /></label>
          <label className="mg-field"><span>Nationalité</span>
            <select id="pc-nat" className="mg-select" value={nationality} onChange={e => setNationality(e.target.value)}>
              {world.countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="mg-field"><span>Pied fort</span>
            <select className="mg-select" value={foot} onChange={e => setFoot(e.target.value as Foot)}>{FEET.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}</select>
          </label>
        </div>
        <div>
          <span className="mg-small">Poste</span>
          <div className="mg-seg" role="group" aria-label="Poste" style={{ marginTop: 6 }}>
            {POSITIONS.map(p => <button key={p} type="button" aria-pressed={position === p} title={POS_LONG[p]} onClick={() => setPosition(p)}>{POS_FR[p]}</button>)}
          </div>
          <p className="mg-small" style={{ margin: "6px 0 0" }}>{POS_LONG[position]}</p>
        </div>
      </div>

      <div className="mg-pagehead"><div><h2 style={{ fontSize: 22, fontWeight: 900, textTransform: "uppercase" }}>Ton premier club</h2><p>Les clubs de deuxième division qui te proposent un contrat. Un effectif modeste, c&apos;est plus de temps de jeu.</p></div></div>
      <div className="mg-clubs">
        {clubs.map(({ club, strength, country }) => (
          <button key={club.id} type="button" className="mg-clubpick" aria-pressed={club.id === clubId} onClick={() => { setClubId(club.id); setConfirm(false); }}>
            <Crest club={club} size={40} />
            <span className="mg-clubpick__body">
              <strong>{club.name}</strong>
              <span>{country} · effectif <Ovr value={Math.round(strength)} small /></span>
            </span>
          </button>
        ))}
      </div>

      <div className="mg-card mg-card--accent mg-stack" style={{ position: "sticky", bottom: 100 }}>
        <div className="mg-row mg-row--between">
          <p className="mg-muted" style={{ margin: 0 }}>
            {nameOk ? `${firstName} ${lastName}` : "Renseigne ton prénom et ton nom"} · {POS_LONG[position]}
            {clubId ? ` · ${clubs.find(c => c.club.id === clubId)?.club.name}` : " · choisis un club"}
          </p>
          <button type="button" className="mg-btn mg-btn--gold" disabled={!nameOk || !clubId} onClick={start}>
            {confirm ? "Confirmer et archiver l'ancienne" : "Signer mon premier contrat"}
          </button>
        </div>
        {confirm && <p className="mg-warn">Une carrière v2 existe déjà. Elle sera copiée en sauvegarde de secours avant d&apos;être remplacée.</p>}
      </div>
    </div>
  );
}
