"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Float, OrbitControls } from "@react-three/drei";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAppFeedback } from "@/components/ui/AppFeedbackProvider";
import { RewardLevelUpModal } from "@/components/ui/RewardLevelUpModal";
import {
  Award,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Coins,
  Gem,
  Gift,
  LockKeyhole,
  Loader2,
  Sparkles,
  Star,
  Trophy,
  Zap,
} from "lucide-react";
import { getDailyReward, getXpRequiredForLevel } from "@/lib/game-economy";

const MAX_CP_REWARD = 50;
type RewardType = "cp" | "diamonds" | "xp";
type RewardsConfigItem = { day_number: number; title: string; reward_amount: number; reward_type: RewardType };
type ProfileData = { id: string; username?: string | null; jetons_cp?: number; diamonds?: number; xp?: number; level?: number };
type RewardIconComponent = React.ComponentType<{ size?: number; className?: string }>;

type RewardMeta = { label: string; icon: RewardIconComponent; accent: string; glow: string; iconShell: string };
type RewardModalState = { level: number; levelUp: boolean; diamondsRewarded: number; rewardAmount: number; rewardType: RewardType; currentXp: number; nextLevelXp: number } | null;
const rewardTypeMeta: Record<RewardType, RewardMeta> = {
  cp: { label: "CP", icon: Coins, accent: "text-emerald-300", glow: "shadow-emerald-500/20", iconShell: "border-emerald-300/30 bg-emerald-300/10" },
  diamonds: { label: "Diamants", icon: Gem, accent: "text-sky-300", glow: "shadow-sky-500/20", iconShell: "border-sky-300/30 bg-sky-300/10" },
  xp: { label: "XP", icon: Star, accent: "text-amber-300", glow: "shadow-amber-500/20", iconShell: "border-amber-300/30 bg-amber-300/10" },
};

function clampCpReward(type: RewardType, amount: number) {
  return type === "cp" ? Math.min(amount, MAX_CP_REWARD) : amount;
}

function TreasureGem() {
  const [hovered, setHovered] = useState(false);
  return (
    <div className="h-65 w-full sm:h-80" onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}>
      <Canvas camera={{ position: [0, 0.1, 4.4], fov: 42 }} dpr={[1, 2]}>
        <ambientLight intensity={0.7} color="#d6fff1" />
        <pointLight position={[2.5, 2.5, 3]} intensity={hovered ? 12 : 7} color={hovered ? "#fbbf24" : "#34d399"} />
        <pointLight position={[-2, -1, 2]} intensity={4} color="#38bdf8" />
        <Float speed={hovered ? 3 : 1.5} rotationIntensity={hovered ? 0.55 : 0.25} floatIntensity={hovered ? 1.1 : 0.65}>
          <group rotation={[0.25, 0.25, 0]}>
            <mesh rotation={[0.2, 0.5, 0.1]} scale={hovered ? 1.12 : 1}>
              <icosahedronGeometry args={[1.15, 1]} />
              <meshPhysicalMaterial color={hovered ? "#fde68a" : "#34d399"} roughness={0.12} metalness={0.4} transmission={0.18} thickness={1.2} clearcoat={1} clearcoatRoughness={0.08} emissive={hovered ? "#b45309" : "#047857"} emissiveIntensity={hovered ? 0.55 : 0.3} />
            </mesh>
            <mesh rotation={[0.2, 0.5, 0.1]} scale={hovered ? 1.16 : 1.04}>
              <icosahedronGeometry args={[1.15, 1]} />
              <meshBasicMaterial color="#fef3c7" transparent opacity={hovered ? 0.16 : 0.08} wireframe />
            </mesh>
          </group>
        </Float>
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={hovered ? 3.5 : 1.5} minPolarAngle={Math.PI / 2.8} maxPolarAngle={Math.PI / 1.7} />
      </Canvas>
    </div>
  );
}

function ResourceBadge({ label, value, icon: Icon, tone }: { label: string; value: number; icon: RewardIconComponent; tone: string }) {
  return (
    <motion.div whileHover={{ y: -4, scale: 1.03 }} className={`rounded-2xl border border-white/10 bg-white/6 p-3 backdrop-blur-xl ${tone}`}>
      <Icon size={17} className="mb-2" />
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value.toLocaleString("fr-FR")}</p>
    </motion.div>
  );
}

export default function RewardsPage() {
  const { notify } = useAppFeedback();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rewardsConfig, setRewardsConfig] = useState<RewardsConfigItem[]>([]);
  const [claimedDays, setClaimedDays] = useState<number[]>([]);
  const [claiming, setClaiming] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [rewardModal, setRewardModal] = useState<RewardModalState>(null);

  const currentDate = useMemo(() => new Date(), []);
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const todayDayNumber = currentDate.getDate();

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const diff = Math.max(0, tomorrow.getTime() - now.getTime());
      setTimeRemaining({ hours: Math.floor((diff / 3600000) % 24), minutes: Math.floor((diff / 60000) % 60), seconds: Math.floor((diff / 1000) % 60) });
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/connexion"); return; }
      const [profRes, rewRes] = await Promise.all([
        supabase.from("profiles").select("id, username, jetons_cp, diamonds, xp").eq("id", user.id).single(),
        supabase.from("daily_rewards_config").select("*").lte("day_number", daysInMonth).order("day_number", { ascending: true }),
      ]);
      setProfile(profRes.data ?? null);
      const configItems = rewRes.data?.length
        ? rewRes.data.map((item) => ({ ...item, reward_amount: clampCpReward(item.reward_type as RewardType, item.reward_amount) }))
        : Array.from({ length: daysInMonth }, (_, index) => {
            const day = index + 1;
            const reward = getDailyReward(day, 1) || { rewardType: "cp", rewardAmount: 10 };
            return { day_number: day, title: `Bonus Jour ${day}`, reward_amount: clampCpReward(reward.rewardType as RewardType, reward.rewardAmount), reward_type: (reward.rewardType as RewardType) || "cp" };
          });
      setRewardsConfig(configItems as RewardsConfigItem[]);
      const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString();
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString();
      const { data: claims } = await supabase.from("user_calendar_claims").select("day_number").eq("user_id", user.id).gte("claim_date", startOfMonth).lte("claim_date", endOfMonth);
      setClaimedDays(claims?.map((claim: { day_number: number }) => claim.day_number) ?? []);
    } catch (error) {
      console.error("Erreur de chargement :", error);
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentMonth, daysInMonth, router]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const handleClaimDaily = async () => {
    if (!profile || claiming || claimedDays.includes(todayDayNumber)) return;
    setClaiming(true);
    try {
      const rawReward = getDailyReward(todayDayNumber, 1);
      const rewardType = (rawReward?.rewardType || "cp") as RewardType;
      const rewardAmount = clampCpReward(rewardType, rawReward?.rewardAmount || 0);
      const { data, error } = await supabase.rpc("claim_calendar_reward", { p_user_id: profile.id });
      if (error) throw error;
      if (!data?.success) {
        notify(data?.message ?? "Impossible de réclamer le bonus.", "danger");
        return;
      }
      const result = data as { new_cp?: number; new_diamonds?: number; new_xp?: number; new_level?: number; level_up?: boolean; diamonds_rewarded?: number; next_level_xp?: number };
      const currentXp = Number(result.new_xp ?? profile.xp ?? 0);
      const newLevel = Number(result.new_level ?? profile.level ?? 1);
      setProfile((prev) => prev ? { ...prev, jetons_cp: Number(result.new_cp ?? prev.jetons_cp ?? 0), diamonds: Number(result.new_diamonds ?? prev.diamonds ?? 0), xp: currentXp } : prev);
      setClaimedDays((prev) => [...prev, todayDayNumber]);
      setRewardModal({ level: newLevel, levelUp: Boolean(result.level_up), diamondsRewarded: Number(result.diamonds_rewarded ?? 0), rewardAmount, rewardType, currentXp, nextLevelXp: Number(result.next_level_xp ?? getXpRequiredForLevel(newLevel + 1)) });
    } catch (error) {
      notify("Erreur: " + (error instanceof Error ? error.message : "Erreur inconnue"), "danger");
    } finally {
      setClaiming(false);
    }
  };

  if (loading) return <main className="min-h-screen bg-slate-950 p-6 text-slate-300"><div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col items-center justify-center gap-4"><Loader2 className="h-12 w-12 animate-spin text-emerald-400" /><p className="text-center text-xs uppercase tracking-[0.35em] text-slate-500">Chargement des récompenses...</p></div></main>;

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 pb-28 text-slate-100">
      <RewardLevelUpModal open={Boolean(rewardModal)} level={rewardModal?.level ?? 1} levelUp={rewardModal?.levelUp ?? false} diamondsRewarded={rewardModal?.diamondsRewarded ?? 0} rewardAmount={rewardModal?.rewardAmount ?? 0} rewardType={rewardModal?.rewardType ?? "cp"} currentXp={rewardModal?.currentXp ?? 0} nextLevelXp={rewardModal?.nextLevelXp ?? 1000} onClose={() => setRewardModal(null)} />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_5%,rgba(16,185,129,0.16),transparent_30%),radial-gradient(circle_at_85%_18%,rgba(245,158,11,0.12),transparent_28%)]" />
      <div className="relative mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-4xl border border-emerald-300/20 bg-linear-to-br from-amber-500/10 via-emerald-500/5 to-transparent p-5 shadow-[0_28px_100px_rgba(16,185,129,0.14)] sm:p-8">
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-amber-300/10 blur-3xl" />
          <div className="relative grid items-center gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.28em] text-amber-200"><Trophy size={14} /> Récompenses quotidiennes</div>
              <h1 className="max-w-xl text-4xl font-black uppercase leading-[0.95] tracking-tight text-white sm:text-6xl">Calendrier de récompenses</h1>
              <p className="max-w-lg text-sm leading-6 text-slate-300">Chaque jour ouvre une nouvelle chance de renforcer votre progression.</p>
              <div className="inline-flex items-center gap-3 rounded-xl border border-amber-300/30 bg-slate-950/65 px-4 py-3 shadow-[0_0_30px_rgba(251,191,36,0.12)] backdrop-blur-xl"><Clock3 size={17} className="text-amber-300" /><span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Prochain bonus</span><span className="font-mono text-sm font-black tabular-nums text-amber-200">{String(timeRemaining.hours).padStart(2, "0")}:{String(timeRemaining.minutes).padStart(2, "0")}:{String(timeRemaining.seconds).padStart(2, "0")}</span></div>
              <div className="grid max-w-lg grid-cols-3 gap-2"><ResourceBadge label="CP" value={profile?.jetons_cp ?? 0} icon={Coins} tone="text-emerald-300" /><ResourceBadge label="Diamants" value={profile?.diamonds ?? 0} icon={Gem} tone="text-sky-300" /><ResourceBadge label="XP" value={profile?.xp ?? 0} icon={Star} tone="text-amber-300" /></div>
            </div>
            <div className="relative"><div className="absolute inset-8 rounded-full bg-emerald-400/10 blur-3xl" /><TreasureGem /><div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-slate-400 backdrop-blur">Artefact du jour</div></div>
          </div>
        </section>

        <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/4 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-400/10 p-2 text-emerald-300"><CalendarDays size={19} /></div><div><h2 className="text-lg font-black uppercase tracking-tight text-white">Le calendrier</h2><p className="text-xs text-slate-500">Une récompense disponible chaque jour</p></div></div><div className="inline-flex items-center gap-2 self-start rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs font-bold text-amber-200 sm:self-auto"><Zap size={14} /> Série : {claimedDays.length} jour(s)</div></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
            {rewardsConfig.map((day, index) => {
              const isToday = day.day_number === todayDayNumber;
              const isClaimed = claimedDays.includes(day.day_number);
              const isLocked = day.day_number > todayDayNumber;
              const meta = rewardTypeMeta[day.reward_type] || rewardTypeMeta.cp;
              const RewardIcon = meta.icon;
              return <motion.article key={day.day_number} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.025 }} whileHover={!isLocked ? { y: -5 } : undefined} className={`relative flex min-h-47.5 flex-col justify-between overflow-hidden rounded-2xl border p-3.5 transition ${isClaimed ? "border-emerald-300/15 bg-emerald-950/25 opacity-75" : isToday ? "border-amber-300/70 bg-slate-900 shadow-[0_0_34px_rgba(251,191,36,0.18)] ring-1 ring-amber-300/30" : "border-white/10 bg-slate-900/60"} ${isLocked ? "opacity-35 grayscale" : ""}`}>
                {isToday && !isClaimed && <motion.div animate={{ opacity: [0.2, 0.65, 0.2] }} transition={{ repeat: Infinity, duration: 2.2 }} className="absolute inset-0 rounded-2xl border border-amber-300/50" />}
                <div className="relative flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Jour {day.day_number}</span>{isClaimed ? <CheckCircle2 size={16} className="text-emerald-300" /> : isLocked ? <LockKeyhole size={15} className="text-slate-500" /> : <Sparkles size={14} className="text-amber-300" />}</div>
                <div className="relative my-3 text-center"><div className={`mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border ${meta.iconShell} ${meta.glow} shadow-lg`}><RewardIcon size={21} className={meta.accent} /></div><p className="mt-3 truncate text-[11px] font-bold text-white">{day.title}</p><p className={`mt-1 text-sm font-black ${meta.accent}`}>+{day.reward_amount} {meta.label}</p></div>
                <div className="relative">{isToday && !isClaimed ? <button type="button" onClick={() => void handleClaimDaily()} disabled={claiming} className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-300 py-2 text-[10px] font-black uppercase tracking-wide text-slate-950 shadow-[0_8px_20px_rgba(251,191,36,0.25)] transition hover:bg-amber-200 disabled:cursor-wait disabled:opacity-60">{claiming ? <Loader2 size={14} className="animate-spin" /> : <Gift size={14} />} {claiming ? "Ouverture..." : "Réclamer le bonus"}</button> : <div className={`flex items-center justify-center gap-1 py-2 text-[10px] font-black uppercase tracking-wide ${isClaimed ? "text-emerald-300" : "text-slate-600"}`}>{isClaimed ? <><Check size={13} /> Réclamé</> : isLocked ? <><LockKeyhole size={12} /> Verrouillé</> : "Manqué"}</div>}</div>
              </motion.article>;
            })}
          </div>
        </motion.section>
        <div className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600"><Award size={14} /> Revenez demain pour poursuivre votre série</div>
      </div>
    </main>
  );
}
