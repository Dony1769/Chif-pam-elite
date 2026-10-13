"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, ArrowRight, Sparkles } from "lucide-react";
import { Shell, Crest, PageTitle, StatCard } from "../lib/components";
import { Button, Link } from "../lib/ui";
import { loadGame, saveGame } from "../utils/storage";
import { toCareerState, toFullSave, type CareerRuntimeState } from "../types/career";
import { getClub } from "../constants/clubs";
import { ATTRIBUTES_BY_GROUP, ALL_ATTRIBUTES } from "../constants/attributes";
import { formatMoneyCompact, formatRating } from "../utils/formatters";
import type { AttributeGroup } from "../types/player";

const GROUP_LABELS: Record<string, string> = {
  technical: "Technique",
  physical: "Physique",
  mental: "Mental",
  goalkeeping: "Gardien",
  defensive: "Defensif",
  offensive: "Offensif",
};

export default function JoueurPage() {
  const router = useRouter();
  const [career, setCareer] = useState<CareerRuntimeState | null>(null);
  const [group, setGroup] = useState<AttributeGroup>("technical");

  useEffect(() => {
    const save = loadGame();
    if (!save?.player) { router.replace("/client/fc-career/create-player"); return; }
    setCareer(toCareerState(save));
  }, [router]);

  if (!career?.player) {
    return <Shell><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 200px)', opacity: .6, gap: 8 }}><Sparkles className="animate-pulse" size={16} /><span style={{ fontSize: 12 }}>Chargement...</span></div></Shell>;
  }

  const player = career.player;
  const club = getClub(player.contract.clubId);
  const attrs = ATTRIBUTES_BY_GROUP[group] ?? [];

  return (
    <Shell>
      <PageTitle
        eyebrow="LE TALENT EN CHIFFRES"
        title={`${player.firstName} ${player.lastName}`}
        subtitle={`${player.age} ans · ${player.position} · Overall ${player.overall}`}
      />

      <div className="profile-layout">
        <section className="player-card">
          <div className="player-image" style={{ height: 200, background: club ? `linear-gradient(135deg, ${club.colors.primary}44, ${club.colors.accent}22)` : 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="player-position">{player.position}</span>
            <div className="overall"><strong>{player.overall}</strong><span>GENERAL</span></div>
            <div className="player-identity">
              <span>FICHE JOUEUR</span>
              <h2>{player.firstName} {player.lastName}</h2>
              <p>{player.age} ans <i /> {player.position} <i /> {club?.shortName ?? ''}</p>
            </div>
          </div>
          <div className="player-info">
            <div className="club-line">
              {club && <Crest name={club.shortName} clubId={club.id} small />}
              <div>
                <strong>{club?.name ?? 'Club'}</strong>
                <span>{club?.division ?? ''}</span>
              </div>
              <span className="status-tag">ESPOIR</span>
            </div>
            <div className="player-details">
              <span>Potentiel<strong>{player.potential}<Sparkles /></strong></span>
              <span>Pied fort<strong>{player.foot === 'left' ? 'Gauche' : player.foot === 'right' ? 'Droit' : 'Les deux'}</strong></span>
              <span>Valeur<strong>{formatMoneyCompact(player.marketValue)}</strong></span>
              <span>Taille<strong>{player.heightCm} cm</strong></span>
              <span>Poids<strong>{player.weightKg} kg</strong></span>
            </div>
          </div>
        </section>

        <section>
          <div className="section-heading">
            <h2>51 attributs. Un seul joueur.</h2>
            <span>GENERAL {player.overall}</span>
          </div>
          <div className="tabs">
            {Object.keys(ATTRIBUTES_BY_GROUP).map(g => (
              <Button variant="ghost" key={g} className={group === g ? 'active' : ''} onClick={() => setGroup(g as AttributeGroup)}>
                {GROUP_LABELS[g] ?? g}
              </Button>
            ))}
          </div>
          <div className="attribute-list profile-attributes" key={group}>
            {attrs.map(attr => {
              const val = Math.round(player.attributes[attr.id] ?? 0);
              return (
                <div key={attr.id}>
                  <div>
                    <span>{attr.label}</span>
                    <strong>{val}<small> / {player.potential}</small></strong>
                  </div>
                  <progress max={99} value={val} />
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </Shell>
  );
}
