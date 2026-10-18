"use client";

/** FC CAREER 27 — Carrière Joueur v2 : messages. */

import React, { useState } from "react";
import { usePlayerGame } from "../_ui/PlayerContext";
import { Empty, Section } from "../../manager/_ui/kit";
import type { InboxKind } from "../../game/manager/types";

const KIND: Record<InboxKind, string> = { board: "Coach & sélection", match: "Matchs", finance: "Contrats & offres", squad: "Club", news: "Monde", welcome: "Coach & sélection" };

export default function PlayerMessages() {
  const { state, run } = usePlayerGame();
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<InboxKind | "all" | "key">("key");
  const list = state.inbox.filter(m => filter === "all" || (filter === "key" ? !m.info : m.kind === filter || (filter === "board" && m.kind === "welcome")));
  const unread = state.inbox.filter(m => !m.read).length;
  return (
    <div className="mg-stack">
      <div className="mg-pagehead">
        <div><h1>Messages</h1><p>{unread} non lu(s)</p></div>
        <button type="button" className="mg-btn" disabled={unread === 0} onClick={() => run({ type: "MARK_ALL_READ" })}>Tout marquer comme lu</button>
      </div>
      <div className="mg-seg" role="group" aria-label="Filtrer">
        {(["key", "all", "match", "board", "finance", "squad"] as const).map(k => (
          <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}>{k === "key" ? "Importants" : k === "all" ? "Tous" : KIND[k]}</button>
        ))}
      </div>
      <Section>
        {list.length === 0 && <Empty>Aucun message.</Empty>}
        {list.map(m => (
          <button key={m.id} type="button" className={`mg-msg${m.read ? "" : " is-unread"}`} aria-expanded={open === m.id}
            style={{ width: "100%", textAlign: "left", background: "none", border: "none", borderBottom: "1px solid var(--mg-line)", cursor: "pointer" }}
            onClick={() => { setOpen(open === m.id ? null : m.id); if (!m.read) run({ type: "MARK_READ", id: m.id }); }}>
            <span className="mg-row mg-row--between" style={{ width: "100%" }}><b>{m.title}</b><span className="mg-small">S{m.season} sem. {m.week}</span></span>
            {open === m.id ? <span style={{ color: "var(--mg-text)", lineHeight: 1.5 }}>{m.body}</span>
              : <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{m.body}</span>}
          </button>
        ))}
      </Section>
    </div>
  );
}
