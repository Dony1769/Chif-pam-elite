"use client";

/**
 * FC CAREER — Étape 10 : Économie, Marques & Vie Privée
 * Route: /client/fc-career/lifestyle
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Banknote,
  Check,
  Gift,
  Heart,
  ShoppingBag,
  Sparkles,
  Star,
  TrendingUp,
  Tv,
} from "lucide-react";
import { Shell, PageTitle } from "../lib/components";
import { Button } from "../lib/ui";
import { loadGame, saveGame } from "../utils/storage";
import { toCareerState, toFullSave, type CareerRuntimeState } from "../types/career";
import { formatMoneyCompact } from "../utils/formatters";
import {
  type LifestyleState,
  type Endorsement,
  type LifeEventOccurrence,
  type LifeEventChoice,
  LIFESTYLES,
  CAR_CHOICES,
  ALL_BRANDS,
  LIFE_EVENTS,
} from "../types/lifestyle";
import {
  createLifestyleState,
  setLifestyle as doSetLifestyle,
  setCar as doSetCar,
  setCharity,
  setInvestment,
  getEligibleBrands,
  signEndorsement,
  monthlyLifestyleCost,
  getLifeEventChoices,
  applyLifeEvent,
} from "../engine/lifestyle-engine";

type Tab = "lifestyle" | "brands" | "endorsements" | "events";

const ease: [number, number, number, number] = [0.4, 0, 0.2, 1];

export default function LifestylePage() {
  const router = useRouter();
  const [career, setCareer] = useState<CareerRuntimeState | null>(null);
  const [tab, setTab] = useState<Tab>("lifestyle");
  const [lifestyleState, setLifestyleState] = useState<LifestyleState>(createLifestyleState());
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
  const [lifeEvents, setLifeEvents] = useState<LifeEventOccurrence[]>([]);

  useEffect(() => {
    const save = loadGame();
    if (!save?.player) { router.replace("/client/fc-career/create-player"); return; }
    const state = toCareerState(save);
    setCareer(state);

    if (save.meta.lifestyleState) setLifestyleState(save.meta.lifestyleState);
    if (save.meta.endorsements) setEndorsements(save.meta.endorsements);
    if (save.meta.lifeEvents) setLifeEvents(save.meta.lifeEvents);
  }, [router]);

  const persist = useCallback((next: CareerRuntimeState, ls?: LifestyleState, end?: Endorsement[], ev?: LifeEventOccurrence[]) => {
    setCareer(next);
    const full = toFullSave(next);
    if (ls) { full.meta.lifestyleState = ls; setLifestyleState(ls); }
    if (end) { full.meta.endorsements = end; setEndorsements(end); }
    if (ev) { full.meta.lifeEvents = ev; setLifeEvents(ev); }
    saveGame(full);
  }, []);

  if (!career?.player) return null;
  const { player } = career;
  const salary = player.contract.salaryPerWeek * 4.33;
  const monthlyCost = monthlyLifestyleCost(lifestyleState, salary);
  const totalEndorsementIncome = endorsements.reduce((s, e) => s + e.monthlyPay, 0);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "lifestyle", label: "Vie privée", icon: <Heart size={16} /> },
    { id: "brands", label: "Marques", icon: <ShoppingBag size={16} /> },
    { id: "endorsements", label: "Contrats", icon: <Star size={16} /> },
    { id: "events", label: "Événements", icon: <Tv size={16} /> },
  ];

  return (
    <Shell>
      <div className="fcl page-lifestyle">
        <PageTitle eyebrow="ÉTAPE 10" title="Économie & Vie Privée" subtitle="Marques, style de vie et événements" />

        {/* Summary bar */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
          <MiniStat label="Revenu/mois" value={formatMoneyCompact(Math.round(salary + totalEndorsementIncome))} icon="💰" />
          <MiniStat label="Dépenses/mois" value={formatMoneyCompact(monthlyCost)} icon="💸" />
          <MiniStat label="Image" value={`${lifestyleState.publicImage}/100`} icon="⭐" />
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
                borderRadius: 10, border: "1px solid var(--fcl-border)",
                background: tab === t.id ? "var(--fcl-accent)" : "var(--fcl-card)",
                color: tab === t.id ? "#fff" : "var(--fcl-text)",
                fontWeight: tab === t.id ? 600 : 400, fontSize: 13, cursor: "pointer",
              }}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === "lifestyle" && (
            <motion.div key="lifestyle" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25, ease }}>
              <LifestyleTab
                state={lifestyleState}
                salary={salary}
                onChange={(ls) => persist(career, ls, endorsements, lifeEvents)}
              />
            </motion.div>
          )}

          {tab === "brands" && (
            <motion.div key="brands" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25, ease }}>
              <BrandsTab
                player={player}
                imagePublic={lifestyleState.publicImage}
                endorsements={endorsements}
                dayNumber={career.meta.season?.currentDay ?? 0}
                onSign={(e) => persist(career, lifestyleState, [...endorsements, e], lifeEvents)}
              />
            </motion.div>
          )}

          {tab === "endorsements" && (
            <motion.div key="endorsements" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25, ease }}>
              <EndorsementsTab endorsements={endorsements} />
            </motion.div>
          )}

          {tab === "events" && (
            <motion.div key="events" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25, ease }}>
              <EventsTab
                events={lifeEvents}
                lifestyleState={lifestyleState}
                onChoice={(ev, choice) => {
                  const result = applyLifeEvent(lifestyleState, ev, choice);
                  const updatedEv = lifeEvents.map((e) => e.id === ev.id ? { ...e, choiceMade: choice.id } : e);
                  const updatedPlayer = { ...player, morale: Math.max(0, Math.min(100, player.morale + result.moraleDelta)) };
                  persist({ ...career, player: updatedPlayer }, result.state, endorsements, updatedEv);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Shell>
  );
}

/* ================================================================== */
/* Mini stat                                                          */
/* ================================================================== */

function MiniStat({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div style={{
      padding: 10, borderRadius: 10, background: "var(--fcl-card)", border: "1px solid var(--fcl-border)",
      textAlign: "center",
    }}>
      <div style={{ fontSize: 18 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{value}</div>
      <div style={{ fontSize: 10, color: "var(--fcl-muted)" }}>{label}</div>
    </div>
  );
}

/* ================================================================== */
/* Lifestyle Tab                                                      */
/* ================================================================== */

function LifestyleTab({
  state,
  salary,
  onChange,
}: {
  state: LifestyleState;
  salary: number;
  onChange: (s: LifestyleState) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Lifestyle choice */}
      <Section title="🏠 Style de vie">
        {LIFESTYLES.map((ls) => (
          <ChoiceRow
            key={ls.id}
            emoji={ls.emoji}
            label={ls.label}
            detail={ls.monthlyCostRange[1] > 0 ? `${formatMoneyCompact(ls.monthlyCostRange[0])} - ${formatMoneyCompact(ls.monthlyCostRange[1])}/mois` : "Gratuit"}
            selected={state.lifestyle === ls.id}
            onClick={() => onChange(doSetLifestyle(state, ls.id))}
          />
        ))}
      </Section>

      {/* Car choice */}
      <Section title="🚗 Véhicule">
        {CAR_CHOICES.map((c) => (
          <ChoiceRow
            key={c.id}
            emoji={c.emoji}
            label={c.label}
            detail={c.monthlyCost > 0 ? `${formatMoneyCompact(c.monthlyCost)}/mois` : "—"}
            selected={state.car === c.id}
            onClick={() => onChange(doSetCar(state, c.id))}
          />
        ))}
      </Section>

      {/* Charity */}
      <Section title="💝 Dons caritatifs">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[0, 1, 2, 3, 4, 5].map((pct) => (
            <button
              key={pct}
              onClick={() => onChange(setCharity(state, pct))}
              style={{
                padding: "6px 14px", borderRadius: 8, fontSize: 13,
                border: state.charityPct === pct ? "2px solid var(--fcl-accent)" : "1px solid var(--fcl-border)",
                background: state.charityPct === pct ? "color-mix(in oklch, var(--fcl-accent) 12%, var(--fcl-card))" : "var(--fcl-card)",
                cursor: "pointer", fontWeight: state.charityPct === pct ? 600 : 400,
              }}
            >
              {pct}%
            </button>
          ))}
        </div>
        <p style={{ fontSize: 11, color: "var(--fcl-muted)", marginTop: 6 }}>
          Les dons améliorent ton image publique (+{state.charityPct * 2} pts)
        </p>
      </Section>

      {/* Investments */}
      <Section title="📈 Investissements">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[0, 5, 10, 15, 20].map((pct) => (
            <button
              key={pct}
              onClick={() => onChange(setInvestment(state, pct))}
              style={{
                padding: "6px 14px", borderRadius: 8, fontSize: 13,
                border: state.investmentPct === pct ? "2px solid var(--fcl-accent)" : "1px solid var(--fcl-border)",
                background: state.investmentPct === pct ? "color-mix(in oklch, var(--fcl-accent) 12%, var(--fcl-card))" : "var(--fcl-card)",
                cursor: "pointer", fontWeight: state.investmentPct === pct ? 600 : 400,
              }}
            >
              {pct}%
            </button>
          ))}
        </div>
        <p style={{ fontSize: 11, color: "var(--fcl-muted)", marginTop: 6 }}>
          Capital investi : {formatMoneyCompact(state.investmentTotal)} (revenus passifs à la retraite)
        </p>
      </Section>
    </div>
  );
}

/* ================================================================== */
/* Brands Tab                                                         */
/* ================================================================== */

function BrandsTab({
  player,
  imagePublic,
  endorsements,
  dayNumber,
  onSign,
}: {
  player: NonNullable<CareerRuntimeState["player"]>;
  imagePublic: number;
  endorsements: Endorsement[];
  dayNumber: number;
  onSign: (e: Endorsement) => void;
}) {
  const eligible = getEligibleBrands(player, imagePublic);
  const signedIds = new Set(endorsements.map((e) => e.brandId));

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--fcl-muted)", marginBottom: 12 }}>
        Marques disponibles selon tes attributs et ton image ({eligible.length} éligibles)
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {ALL_BRANDS.map((brand) => {
          const isEligible = eligible.some((b) => b.id === brand.id);
          const isSigned = signedIds.has(brand.id);

          return (
            <div
              key={brand.id}
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: 12,
                borderRadius: 12, background: "var(--fcl-card)", border: "1px solid var(--fcl-border)",
                opacity: isEligible ? 1 : 0.45,
              }}
            >
              <span style={{ fontSize: 24 }}>{brand.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>
                  {brand.name}
                  {isSigned && <Check size={12} style={{ marginLeft: 4, color: "var(--fcl-accent)" }} />}
                </div>
                <div style={{ fontSize: 11, color: "var(--fcl-muted)", fontStyle: "italic" }}>&quot;{brand.slogan}&quot;</div>
                <div style={{ fontSize: 11, color: "var(--fcl-muted)" }}>
                  {formatMoneyCompact(brand.payRange[0])} - {formatMoneyCompact(brand.payRange[1])}/mois
                </div>
              </div>
              {isEligible && !isSigned && (
                <Button
                  onClick={() => onSign(signEndorsement(brand, player, dayNumber))}
                  style={{ fontSize: 11, padding: "6px 10px", background: "var(--fcl-accent)", color: "#fff", borderRadius: 8 }}
                >
                  Signer
                </Button>
              )}
              {!isEligible && (
                <span style={{ fontSize: 10, color: "var(--fcl-muted)" }}>🔒</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================== */
/* Endorsements Tab                                                   */
/* ================================================================== */

function EndorsementsTab({ endorsements }: { endorsements: Endorsement[] }) {
  if (endorsements.length === 0) {
    return <p style={{ fontSize: 13, color: "var(--fcl-muted)", textAlign: "center", padding: 32 }}>Aucun contrat de sponsoring actif. Va dans l&apos;onglet Marques pour en signer.</p>;
  }

  const levelLabels: Record<string, string> = {
    ambassador: "Ambassadeur simple",
    "main-ambassador": "Ambassadeur principal",
    "signature-line": "Signature Line ⭐",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {endorsements.map((e) => {
        const brand = ALL_BRANDS.find((b) => b.id === e.brandId);
        return (
          <div key={e.brandId} style={{ padding: 14, borderRadius: 12, background: "var(--fcl-card)", border: "1px solid var(--fcl-border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 20 }}>{brand?.emoji}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{brand?.name}</div>
                <div style={{ fontSize: 11, color: "var(--fcl-muted)" }}>{levelLabels[e.level]}</div>
              </div>
              <span style={{ marginLeft: "auto", fontWeight: 600, fontSize: 14, color: "var(--fcl-accent)" }}>
                {formatMoneyCompact(e.monthlyPay)}/mois
              </span>
            </div>
            <div style={{ fontSize: 11, color: "var(--fcl-muted)" }}>
              {e.seasonsLeft} saison{e.seasonsLeft > 1 ? "s" : ""} restante{e.seasonsLeft > 1 ? "s" : ""}
            </div>
          </div>
        );
      })}

      <div style={{ padding: 12, borderRadius: 10, background: "color-mix(in oklch, var(--fcl-accent) 8%, var(--fcl-bg))", fontSize: 13 }}>
        <strong>Total sponsoring :</strong> {formatMoneyCompact(endorsements.reduce((s, e) => s + e.monthlyPay, 0))}/mois
      </div>
    </div>
  );
}

/* ================================================================== */
/* Events Tab                                                         */
/* ================================================================== */

function EventsTab({
  events,
  lifestyleState,
  onChoice,
}: {
  events: LifeEventOccurrence[];
  lifestyleState: LifestyleState;
  onChoice: (event: LifeEventOccurrence, choice: LifeEventChoice) => void;
}) {
  if (events.length === 0) {
    return <p style={{ fontSize: 13, color: "var(--fcl-muted)", textAlign: "center", padding: 32 }}>Aucun événement de vie pour le moment. Ils apparaîtront au fil de ta carrière.</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {events.map((ev) => {
        const def = LIFE_EVENTS.find((d) => d.type === ev.type)!;
        const choices = getLifeEventChoices(ev.type);
        const hasChosen = Boolean(ev.choiceMade);

        return (
          <motion.div
            key={ev.id}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            style={{ padding: 14, borderRadius: 12, background: "var(--fcl-card)", border: "1px solid var(--fcl-border)" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 22 }}>{def.emoji}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{def.label}</div>
                <div style={{ fontSize: 11, color: "var(--fcl-muted)" }}>Jour {ev.dayNumber}</div>
              </div>
              {def.moraleDelta !== 0 && (
                <span style={{ marginLeft: "auto", fontSize: 12, color: def.moraleDelta > 0 ? "var(--fcl-accent)" : "var(--fcl-warning)" }}>
                  Moral {def.moraleDelta > 0 ? "+" : ""}{def.moraleDelta}
                </span>
              )}
            </div>

            {choices.length > 0 && !hasChosen && (
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                {choices.map((c) => (
                  <Button
                    key={c.id}
                    onClick={() => onChoice(ev, c)}
                    style={{ flex: 1, minWidth: 80, fontSize: 12, padding: "6px 10px", background: "var(--fcl-bg)", border: "1px solid var(--fcl-border)", borderRadius: 8 }}
                  >
                    {c.emoji} {c.label}
                  </Button>
                ))}
              </div>
            )}

            {hasChosen && (
              <div style={{ marginTop: 6, fontSize: 11, color: "var(--fcl-accent)", display: "flex", alignItems: "center", gap: 4 }}>
                <Check size={12} /> Choix effectué
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

/* ================================================================== */
/* Helpers                                                            */
/* ================================================================== */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 style={{ fontSize: 14, margin: "0 0 10px" }}>{title}</h4>
      {children}
    </div>
  );
}

function ChoiceRow({
  emoji,
  label,
  detail,
  selected,
  onClick,
}: {
  emoji: string;
  label: string;
  detail: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 10, padding: 12, width: "100%",
        borderRadius: 10, marginBottom: 6, cursor: "pointer", textAlign: "left",
        border: selected ? "2px solid var(--fcl-accent)" : "1px solid var(--fcl-border)",
        background: selected ? "color-mix(in oklch, var(--fcl-accent) 10%, var(--fcl-card))" : "var(--fcl-card)",
      }}
    >
      <span style={{ fontSize: 20 }}>{emoji}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 500, fontSize: 13 }}>{label}</div>
        <div style={{ fontSize: 11, color: "var(--fcl-muted)" }}>{detail}</div>
      </div>
      {selected && <Check size={14} style={{ color: "var(--fcl-accent)" }} />}
    </motion.button>
  );
}
