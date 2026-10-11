"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import { Award, Check, Gem, Sparkles, Star, Trophy, X } from "lucide-react";

type RewardLevelUpModalProps = {
  open: boolean;
  level: number;
  levelUp: boolean;
  diamondsRewarded: number;
  rewardAmount: number;
  rewardType: "cp" | "diamonds" | "xp";
  currentXp: number;
  nextLevelXp: number;
  onClose: () => void;
};

const rewardLabels = { cp: "CP", diamonds: "Diamants", xp: "XP" } as const;

export function RewardLevelUpModal({
  open,
  level,
  levelUp,
  diamondsRewarded,
  rewardAmount,
  rewardType,
  currentXp,
  nextLevelXp,
  onClose,
}: RewardLevelUpModalProps) {
  useEffect(() => {
    if (!open) return;
    confetti({ particleCount: levelUp ? 180 : 100, spread: 78, origin: { y: 0.6 }, colors: ["#34d399", "#fbbf24", "#38bdf8", "#ffffff"] });
    try { void new Audio("/sounds/win.mp3").play(); } catch { /* Browser audio can require a user gesture. */ }
  }, [levelUp, open]);

  const progress = Math.min(100, Math.max(0, (currentXp / Math.max(nextLevelXp, 1)) * 100));
  const RewardIcon = rewardType === "cp" ? Star : rewardType === "diamonds" ? Gem : Sparkles;

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-labelledby="reward-level-up-title">
          <motion.div initial={{ opacity: 0, scale: 0.78, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.86, y: 16 }} transition={{ type: "spring", stiffness: 260, damping: 20 }} className="relative w-full max-w-md overflow-hidden rounded-4xl border border-amber-300/35 bg-slate-950 p-6 text-center shadow-[0_0_80px_rgba(251,191,36,0.2)]">
            <button type="button" onClick={onClose} aria-label="Fermer" className="absolute right-4 top-4 rounded-full border border-white/10 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"><X size={16} /></button>
            <div className="pointer-events-none absolute -left-20 -top-20 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-16 h-52 w-52 rounded-full bg-amber-300/20 blur-3xl" />
            <motion.div initial={{ rotate: -12, scale: 0.7 }} animate={{ rotate: 0, scale: 1 }} transition={{ delay: 0.1, type: "spring" }} className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-amber-300/50 bg-amber-300/10 text-amber-200 shadow-[0_0_35px_rgba(251,191,36,0.25)]">
              {levelUp ? <Trophy size={38} /> : <Award size={38} />}
            </motion.div>
            <p className="relative mt-5 text-[10px] font-black uppercase tracking-[0.32em] text-amber-300">{levelUp ? "Niveau supérieur" : "Récompense débloquée"}</p>
            <h2 id="reward-level-up-title" className="relative mt-2 text-3xl font-black uppercase tracking-tight text-white">{levelUp ? `Niveau ${level}` : "Bonus du jour"}</h2>
            <div className="relative mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-sky-300/25 bg-sky-300/10 p-4"><Gem className="mx-auto text-sky-300" size={23} /><p className="mt-2 text-2xl font-black text-white">+{diamondsRewarded}</p><p className="text-[10px] font-bold uppercase tracking-wider text-sky-200">Diamants</p></div>
              <div className="rounded-2xl border border-emerald-300/25 bg-emerald-300/10 p-4"><RewardIcon className="mx-auto text-emerald-300" size={23} /><p className="mt-2 text-2xl font-black text-white">+{rewardAmount}</p><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">{rewardLabels[rewardType]}</p></div>
            </div>
            <div className="relative mt-5 text-left"><div className="mb-2 flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400"><span>Progression XP</span><span>{currentXp.toLocaleString("fr-FR")} / {nextLevelXp.toLocaleString("fr-FR")}</span></div><div className="h-2 overflow-hidden rounded-full bg-white/10"><motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ delay: 0.25, duration: 0.7 }} className="h-full rounded-full bg-linear-to-r from-emerald-400 to-amber-300" /></div></div>
            <button type="button" onClick={onClose} className="relative mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-slate-950 transition hover:bg-amber-200"><Check size={16} /> Continuer</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
