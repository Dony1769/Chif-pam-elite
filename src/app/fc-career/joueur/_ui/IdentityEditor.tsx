"use client";

/** FC CAREER 27 — Éditeur d'identité : visage, numéro de maillot, célébration. */

import React from "react";
import { Avatar, HAIR, HAIR_STYLES, SKIN } from "../../manager/_ui/Avatar";
import type { Look } from "../../manager/_ui/Avatar";
import { CELEBRATIONS } from "../../game/player2/identity";

export interface Identity { look: Look; shirt: number; celebration: string }

export function IdentityEditor({ id, value, onChange, kit, trim }: { id: string; value: Identity; onChange: (v: Identity) => void; kit?: string; trim?: string }) {
  const set = (p: Partial<Identity>) => onChange({ ...value, ...p });
  const look = (p: Partial<Look>) => set({ look: { ...value.look, ...p } });
  return (
    <div className="pc-identity">
      <Avatar id={id} look={value.look} number={value.shirt} kit={kit} trim={trim} size={112} label="Aperçu de ton joueur" />
      <div className="pc-identity__fields">
        <div className="pc-identity__row"><span className="mg-small">Teint</span>
          <div className="pc-swatches" role="group" aria-label="Teint">
            {SKIN.map((c, k) => <button key={c} type="button" aria-pressed={value.look.skin === k} aria-label={`Teint ${k + 1}`} style={{ background: c }} onClick={() => look({ skin: k })} />)}
          </div>
        </div>
        <div className="pc-identity__row"><span className="mg-small">Cheveux</span>
          <div className="pc-swatches" role="group" aria-label="Couleur des cheveux">
            {HAIR.map((c, k) => <button key={c} type="button" aria-pressed={value.look.hair === k} aria-label={`Couleur ${k + 1}`} style={{ background: c }} onClick={() => look({ hair: k })} />)}
          </div>
        </div>
        <div className="pc-identity__row"><span className="mg-small">Coupe</span>
          <div className="mg-seg" role="group" aria-label="Coupe">
            {HAIR_STYLES.map((n, k) => <button key={n} type="button" aria-pressed={value.look.style === k} onClick={() => look({ style: k })}>{n}</button>)}
          </div>
        </div>
        <div className="pc-identity__row"><span className="mg-small">Barbe</span>
          <div className="mg-seg" role="group" aria-label="Barbe">
            <button type="button" aria-pressed={!value.look.beard} onClick={() => look({ beard: false })}>Rasé</button>
            <button type="button" aria-pressed={value.look.beard} onClick={() => look({ beard: true })}>Barbe</button>
          </div>
        </div>
        <div className="pc-identity__row">
          <label className="mg-field" style={{ width: 110 }}><span>Numéro</span>
            <input className="mg-input" type="number" min={1} max={99} value={value.shirt} onChange={e => set({ shirt: Math.max(1, Math.min(99, Number(e.target.value) || 1)) })} />
          </label>
          <label className="mg-field" style={{ flex: 1, minWidth: 180 }}><span>Célébration de but</span>
            <select className="mg-select" value={value.celebration} onChange={e => set({ celebration: e.target.value })}>
              {CELEBRATIONS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
