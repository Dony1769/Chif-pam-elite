"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, ArrowRight, Sparkles, Star, Zap, Eye } from "lucide-react";
import { Shell, Crest, PageTitle, StatCard } from "../lib/components";
import { PageTitleAnimated } from "../lib/PageTitleAnimated";
import { Button, Link } from "../lib/ui";
import { loadGame, saveGame } from "../utils/storage";
import { toCareerState, toFullSave, type CareerRuntimeState } from "../types/career";
import { getClub } from "../constants/clubs";
import { ATTRIBUTES_BY_GROUP, ALL_ATTRIBUTES } from "../constants/attributes";
import { formatMoneyCompact, formatRating } from "../utils/formatters";
import { STAGE_LABELS } from "../engine/academy-engine";
import type { AttributeGroup } from "../types/player";
import { getPlayStyleDef, PLAYSTYLE_DEFS } from "../constants/playstyles";
import { getTraitDef } from "../constants/traits";
import type { Player } from "../types/player";
import { investPA } from "../engine/attribute-points-engine";

const GROUP_LABELS: Record<string, string> = {
  technical: "Technique",
  physical: "Physique",
  mental: "Mental",
  goalkeeping: "Gardien",
  defensive: "Defensif",
  offensive: "Offensif",
};

/* ── Composant PlayStylesGrid : 3 cas visuels ─────────────────── */
function PlayStylesGrid({ player }: { player: Player }) {
  const unlockedMap = new Map(player.playStyles?.map(ps => [ps.id, ps.isPlus]) ?? []);

  // Calculer la progression de chaque PlayStyle
  const items = PLAYSTYLE_DEFS.map(def => {
    const avg = def.requiredAttributes.reduce((s, id) => s + (player.attributes[id] ?? 0), 0) / (def.requiredAttributes.length || 1);
    const isPlus = unlockedMap.get(def.id) === true;
    const isStandard = unlockedMap.has(def.id) && !isPlus;
    const pctToStandard = Math.min(100, Math.round((avg / def.threshold) * 100));
    const pctToPlus     = Math.min(100, Math.round((avg / def.thresholdPlus) * 100));
    return { def, isPlus, isStandard, pctToStandard, pctToPlus, avg };
  });

  // Trier : PLUS → STANDARD → LOCKED (proche > loin)
  items.sort((a, b) => {
    if (a.isPlus !== b.isPlus) return a.isPlus ? -1 : 1;
    if (a.isStandard !== b.isStandard) return a.isStandard ? -1 : 1;
    return b.pctToStandard - a.pctToStandard;
  });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {items.map(({ def, isPlus, isStandard, pctToStandard, pctToPlus }) => {
        const isLocked = !isPlus && !isStandard;
        const borderColor = isPlus
          ? "oklch(.91 .19 112 / .5)"
          : isStandard
          ? "oklch(.73 .13 246 / .4)"
          : "rgba(255,255,255,0.06)";
        const bgColor = isPlus
          ? "oklch(.91 .19 112 / .07)"
          : isStandard
          ? "oklch(.73 .13 246 / .06)"
          : "rgba(255,255,255,0.02)";
        const glowColor = isPlus ? "0 0 12px oklch(.91 .19 112 / .18)" : "none";

        return (
          <div
            key={def.id}
            style={{
              display: "flex", flexDirection: "column", gap: 6,
              padding: "10px 12px",
              background: bgColor,
              border: `1px solid ${borderColor}`,
              borderRadius: 8,
              boxShadow: glowColor,
              opacity: isLocked ? 0.55 : 1,
              transition: "opacity .2s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>{def.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 11, fontWeight: 700,
                  color: isPlus ? "var(--primary)" : isStandard ? "var(--blue)" : "var(--muted-foreground)",
                }}>
                  {isPlus ? def.labelPlus : def.label}
                  {isPlus && <span style={{ marginLeft: 4, fontSize: 8, background: "var(--primary)", color: "var(--primary-foreground)", padding: "1px 4px", borderRadius: 3, fontWeight: 800 }}>+</span>}
                </div>
                <div style={{ fontSize: 9, color: "var(--muted-foreground)", marginTop: 1, lineHeight: 1.4 }}>
                  {isPlus ? def.descriptionPlus : def.description}
                </div>
              </div>
            </div>
            {/* Barre de progression */}
            {isLocked && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "var(--muted-foreground)", marginBottom: 3 }}>
                  <span>Progression</span><span>{pctToStandard}%</span>
                </div>
                <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pctToStandard}%`, borderRadius: 2, background: "var(--muted-foreground)", transition: "width .5s" }} />
                </div>
              </div>
            )}
            {isStandard && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "var(--blue)", marginBottom: 3 }}>
                  <span>Vers +</span><span>{pctToPlus}%</span>
                </div>
                <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pctToPlus}%`, borderRadius: 2, background: "var(--blue)", transition: "width .5s" }} />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

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
      <PageTitleAnimated
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
              <span className="status-tag">{player.academy ? STAGE_LABELS[player.academy.stage].toUpperCase() : 'ESPOIR'}</span>
            </div>
            <div className="player-details">
              <span>Potentiel<strong>{player.potential}<Sparkles /></strong></span>
              <span>Gestes Tech.<strong>{'⭐'.repeat(player.skillMovesStars ?? 1)}</strong></span>
              <span>Pied faible<strong>{'⭐'.repeat(player.weakFootStars ?? 1)}</strong></span>
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

        {/* ── PlayStyles : 3 cas (LOCKED / STANDARD / PLUS) ── */}
        <section>
          <div className="section-heading">
            <h2>PlayStyles</h2>
            <span><Zap size={14} /> {player.playStyles?.length ?? 0} ACTIF{(player.playStyles?.length ?? 0) !== 1 ? 'S' : ''}</span>
          </div>
          <PlayStylesGrid player={player} />
        </section>

        {(player.traits?.length ?? 0) > 0 && (
          <section>
            <div className="section-heading">
              <h2>Personnalité</h2>
              <span><Eye size={14} /> TRAITS</span>
            </div>
            <div className="attribute-list profile-attributes">
              {player.traits.filter(t => !t.hidden).map(t => {
                const def = getTraitDef(t.traitId);
                if (!def) return null;
                return (
                  <div key={t.traitId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
                    <span style={{ fontSize: 20 }}>{def.icon}</span>
                    <div style={{ flex: 1 }}>
                      <strong style={{
                        color: def.category === 'positive' ? 'var(--success, #4ade80)' :
                               def.category === 'negative' ? 'var(--danger, #f87171)' : 'var(--text)',
                      }}>
                        {def.label}
                      </strong>
                      <p style={{ fontSize: 11, opacity: 0.7, margin: 0 }}>{def.description}</p>
                    </div>
                  </div>
                );
              })}
              {player.traits.some(t => t.hidden) && (
                <div style={{ padding: '8px 0', opacity: 0.5, fontSize: 12, fontStyle: 'italic' }}>
                  + {player.traits.filter(t => t.hidden).length} trait{player.traits.filter(t => t.hidden).length > 1 ? 's' : ''} caché{player.traits.filter(t => t.hidden).length > 1 ? 's' : ''}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </Shell>
  );
}
