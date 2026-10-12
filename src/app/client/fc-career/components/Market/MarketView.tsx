/**
 * FC CAREER — MarketView (Phase 4, étape 13) : marché des transferts.
 *
 * Consomme useTransfers (état global + moteur pur) et n'appelle jamais le moteur directement.
 * - Bandeau joueur : valeur marché, overall réel, salaire actuel vs meilleure offre.
 * - Liste des offres entrantes (OfferCard) avec entrée en cascade.
 * - Fenêtre de mercato : état ouvert/fermé + jours restants.
 * - Négociation : contre-offre affichée au-dessus de l'offre d'origine (usage unique).
 */

"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useGameContext } from "../../context/GameContext";
import { useTransfers } from "../../hooks/useTransfers";
import { getClub } from "../../constants/clubs";
import { getPosition } from "../../constants/positions";
import { formatMoneyCompact, formatSalaryWeekly } from "../../utils/formatters";
import Card from "../SharedUI/Card";
import AnimatedStat from "../SharedUI/AnimatedStat";
import OfferCard from "./OfferCard";
import type { SalaryOffer } from "../../types/economy";

const STAGGER_MS = 70;

export default function MarketView() {
  const { state } = useGameContext();
  const { player } = state;
  const { offers, windowOpen, trueOverall, trueMarketValue, acceptTransfer, negotiate } =
    useTransfers();

  // Contre-offres en cours : id original -> nouvelle offre négociée (usage unique par offre).
  const [counters, setCounters] = useState<Record<string, SalaryOffer>>({});
  const [busy, setBusy] = useState(false);

  const currentClubName = useMemo(() => {
    if (!player) return null;
    return getClub(player.contract.clubId)?.name ?? "Club inconnu";
  }, [player]);

  const bestOffer = useMemo(() => {
    if (offers.length === 0) return null;
    return [...offers].sort((a, b) => b.salaryPerWeek - a.salaryPerWeek)[0];
  }, [offers]);

  const salaryDelta = useMemo(() => {
    if (!player || !bestOffer) return 0;
    return bestOffer.salaryPerWeek - player.contract.salaryPerWeek;
  }, [player, bestOffer]);

  const handleAccept = (offer: SalaryOffer) => {
    setBusy(true);
    const res = acceptTransfer(offer);
    setBusy(false);
    if (res.ok) setCounters({});
  };

  const handleNegotiate = (offer: SalaryOffer) => {
    const key = `${offer.clubId}-${offer.salaryPerWeek}`;
    if (counters[key]) return;
    const counter = negotiate(offer);
    setCounters((prev) => ({ ...prev, [key]: counter }));
  };

  if (!player) {
    return (
      <Card className="text-center text-sm text-slate-400">
        Créez d'abord votre joueur pour accéder au marché.
      </Card>
    );
  }

  const positionLabel = getPosition(player.position).label;

  return (
    <div className="flex flex-col gap-4">
      {/* Bandeau profil marché */}
      <Card delayMs={0}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">🧾 Marché des transferts</h2>
            <p className="text-xs text-slate-400">
              {player.firstName} {player.lastName} · {positionLabel} · {currentClubName}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              windowOpen
                ? "bg-emerald-500/15 text-emerald-300"
                : "bg-rose-500/15 text-rose-300"
            }`}
          >
            {windowOpen ? "Mercato OUVERT" : "Mercato fermé"}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Valeur marché</p>
            <p className="text-base font-bold text-emerald-300">
              <AnimatedStat value={trueMarketValue} durationMs={700} /> €
            </p>
            <p className="text-[11px] text-slate-500">{formatMoneyCompact(trueMarketValue)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Overall réel</p>
            <p className="text-base font-bold text-white">
              <AnimatedStat value={trueOverall} durationMs={600} /> / 100
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Salaire actuel</p>
            <p className="text-base font-bold text-white">
              {formatSalaryWeekly(player.contract.salaryPerWeek)}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Meilleure offre</p>
            <motion.p
              key={bestOffer?.clubId ?? "none"}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-base font-bold ${salaryDelta >= 0 ? "text-emerald-300" : "text-rose-300"}`}
            >
              {bestOffer ? formatSalaryWeekly(bestOffer.salaryPerWeek) : "—"}
              {bestOffer && (
                <span className="ml-1 text-[11px] font-medium">
                  ({salaryDelta >= 0 ? "+" : ""}
                  {formatMoneyCompact(salaryDelta)}/sem.)
                </span>
              )}
            </motion.p>
          </div>
        </div>
      </Card>

      {/* Liste des offres */}
      {!windowOpen ? (
        <Card delayMs={STAGGER_MS}>
          <div className="py-6 text-center">
            <p className="text-3xl">🔒</p>
            <p className="mt-2 text-sm font-medium text-slate-300">
              Le mercato est fermé pour le moment.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Fenêtres ouvertes : été (J0–J8) et hiver (J16–J19). Continuez à jouer : vos
              performances ouvrent des portes.
            </p>
          </div>
        </Card>
      ) : offers.length === 0 ? (
        <Card delayMs={STAGGER_MS}>
          <div className="py-6 text-center">
            <p className="text-3xl">📭</p>
            <p className="mt-2 text-sm font-medium text-slate-300">
              Aucune offre pour le moment.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Enchaînez les bonnes notes en match pour attirer les clubs.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {offers.map((offer, i) => {
            const key = `${offer.clubId}-${offer.salaryPerWeek}`;
            const counter = counters[key];
            const displayOffer = counter ?? offer;
            return (
              <div key={key} className="flex flex-col gap-2">
                {counter && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[11px] font-medium text-sky-300"
                  >
                    ⬆️ Contre-offre négociée (+~10%) — remplace l&apos;offre initiale de{" "}
                    {offer.clubName}
                  </motion.p>
                )}
                <OfferCard
                  offer={displayOffer}
                  delayMs={STAGGER_MS * (i + 1)}
                  negotiated={Boolean(counter)}
                  busy={busy}
                  onAccept={handleAccept}
                  onNegotiate={handleNegotiate}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
