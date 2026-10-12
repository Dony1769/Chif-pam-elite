/**
 * FC CAREER — MarketView : carte d'une offre salariale entrante.
 * Motion design (Phase 4) : entrée en cascade via Card delayMs, hover interactif.
 */

"use client";

import { motion } from "framer-motion";
import Card from "../SharedUI/Card";
import AnimatedStat from "../SharedUI/AnimatedStat";
import { formatMoneyCompact, formatSalaryWeekly } from "../../utils/formatters";
import type { SalaryOffer } from "../../types/economy";

interface OfferCardProps {
  offer: SalaryOffer;
  /** Délai d'apparition en cascade (ms). */
  delayMs?: number;
  /** Acte de la contre-offre désactivé si déjà négociée. */
  negotiated: boolean;
  busy?: boolean;
  onAccept: (offer: SalaryOffer) => void;
  onNegotiate: (offer: SalaryOffer) => void;
}

export default function OfferCard({
  offer,
  delayMs = 0,
  negotiated,
  busy,
  onAccept,
  onNegotiate,
}: OfferCardProps) {
  return (
    <Card delayMs={delayMs} className="flex flex-col gap-3">
      {/* En-tête : club + validité */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-white">{offer.clubName}</h3>
          <p className="text-xs text-slate-400">
            Contrat {offer.years} an{offer.years > 1 ? "s" : ""} · expire J{offer.expiresOnDay}
          </p>
        </div>
        <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-300">
          Projet {offer.sportProject}/100
        </span>
      </div>

      {/* Chiffres clés animés */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Salaire / sem.</p>
          <p className="text-sm font-semibold text-white">
            <AnimatedStat value={offer.salaryPerWeek} durationMs={500} />
            <span className="ml-1 text-xs text-slate-400">€ brut</span>
          </p>
          <p className="text-[11px] text-slate-500">{formatSalaryWeekly(offer.salaryPerWeek)}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Prime match</p>
          <p className="text-sm font-semibold text-white">
            <AnimatedStat value={offer.bonusPerMatch} durationMs={500} /> €
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Prime but</p>
          <p className="text-sm font-semibold text-white">
            <AnimatedStat value={offer.bonusPerGoal} durationMs={500} /> €
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Bonus signature</p>
          <p className="text-sm font-semibold text-emerald-300">
            {formatMoneyCompact(offer.signingBonus)}
          </p>
        </div>
      </div>

      <p className="text-[11px] text-slate-500">
        Clause libératoire : {formatMoneyCompact(offer.releaseClause)}
      </p>

      {/* Actions */}
      <div className="mt-auto flex gap-2 pt-1">
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          disabled={busy}
          onClick={() => onAccept(offer)}
          className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-2 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Signer ✍️
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          disabled={negotiated || busy}
          onClick={() => onNegotiate(offer)}
          className="rounded-xl border border-white/15 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-sky-400/50 hover:text-sky-300 disabled:opacity-40"
        >
          {negotiated ? "Négociée" : "Négocier"}
        </motion.button>
      </div>
    </Card>
  );
}
