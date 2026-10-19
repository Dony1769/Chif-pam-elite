"use client";

/** FC CAREER 27 — Éditeur de clubs : noms, abréviations, couleurs. */

import React, { useState } from "react";
import type { PlayerCareerState } from "../../game/player2/types";
import type { PlayerAction } from "../../game/player2/reducer";
import { Crest, Section } from "../../manager/_ui/kit";

export function ClubEditor({ state, run, leagueId }: { state: PlayerCareerState; run: (a: PlayerAction) => unknown; leagueId: string }) {
  const w = state.shadow.world;
  const clubs = w.clubs.filter(c => c.leagueId === leagueId).sort((a, b) => a.name.localeCompare(b.name, "fr"));
  const [id, setId] = useState(clubs[0]?.id ?? "");
  const club = w.clubs.find(c => c.id === id) ?? clubs[0];
  const [draft, setDraft] = useState<{ id: string; name: string; shortName: string; primary: string; secondary: string } | null>(null);
  if (!club) return null;
  const d = draft && draft.id === club.id ? draft : { id: club.id, name: club.name, shortName: club.shortName, primary: club.colors.primary, secondary: club.colors.secondary };
  const set = (p: Partial<typeof d>) => setDraft({ ...d, ...p });
  const preview = { ...club, name: d.name, shortName: d.shortName, colors: { ...club.colors, primary: d.primary, secondary: d.secondary } };
  return (
    <Section title="Éditeur de clubs" aside={<span className="mg-small">Les vrais noms, c&apos;est toi qui les mets</span>}>
      <div className="pc-editor">
        <label className="mg-field"><span>Club</span>
          <select className="mg-select" value={club.id} onChange={e => { setId(e.target.value); setDraft(null); }}>
            {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <div className="pc-editor__row">
          <Crest club={preview} size={48} />
          <label className="mg-field" style={{ flex: 1, minWidth: 160 }}><span>Nom</span><input className="mg-input" maxLength={32} value={d.name} onChange={e => set({ name: e.target.value })} /></label>
          <label className="mg-field" style={{ width: 90 }}><span>Abrév.</span><input className="mg-input" maxLength={4} value={d.shortName} onChange={e => set({ shortName: e.target.value.toUpperCase() })} /></label>
          <label className="mg-field" style={{ width: 70 }}><span>Couleur 1</span><input type="color" className="pc-color" value={d.primary} onChange={e => set({ primary: e.target.value })} /></label>
          <label className="mg-field" style={{ width: 70 }}><span>Couleur 2</span><input type="color" className="pc-color" value={d.secondary} onChange={e => set({ secondary: e.target.value })} /></label>
        </div>
        <div className="mg-row">
          <button type="button" className="mg-btn mg-btn--sm mg-btn--green" onClick={() => { run({ type: "EDIT_CLUB", edit: { clubId: club.id, name: d.name, shortName: d.shortName, primary: d.primary, secondary: d.secondary } }); setDraft(null); }}>Enregistrer</button>
          <button type="button" className="mg-btn mg-btn--sm mg-btn--ghost" onClick={() => setDraft(null)}>Annuler</button>
        </div>
      </div>
    </Section>
  );
}
