"use client";

/**
 * FC CAREER — Creation du joueur (identite, morpho, poste, style, club)
 * Route: /client/fc-career/create-player
 * Design FC Career unifie + animations framer-motion
 */

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Footprints,
  Ruler,
  Shield,
  Sparkles,
  Trophy,
  UserRound,
  Zap,
  Activity,
} from "lucide-react";
import { generatePlayer } from "../engine/player-generator";
import { emptyWallet } from "../engine/economic-engine";
import { suggestSalary } from "../engine/transfer-system";
import { saveGame } from "../utils/storage";
import { markSessionUnlocked } from "../utils/session";
import type { AcademyLevel, CareerStage } from "../types/player";
import type { GamePhase, GameSave, SeasonState } from "../types/game";
import type { PositionId, PlayingStyleId } from "../constants/positions";
import { PLAYING_STYLES } from "../constants/positions";
import { getStartingClubs, getClub } from "../constants/clubs";
import type { Country } from "../types/club";
import { COUNTRIES, DIVISION_INFO } from "../types/club";
import type { FootChoice, Morphology, Player } from "../types/player";
import type { Wallet } from "../types/economy";
import { initialStageForAge, createAcademyStatus, STAGE_LABELS } from "../engine/academy";

const POSITION_GROUPS: Record<string, PositionId[]> = {
  Gardien: ["GK"],
  Defense: ["RB", "RCB", "LCB", "LB"],
  Milieu: ["CDM", "CM", "CAM"],
  Attaque: ["RW", "LW", "ST", "CF"],
};

const MORPHOLOGIES: { value: Morphology; label: string; hint: string }[] = [
  { value: "fin", label: "Fin & vif", hint: "Agilite, equilibre" },
  { value: "normal", label: "Equilibre", hint: "Polyvalent" },
  { value: "costaud", label: "Costaud", hint: "Force physique" },
  { value: "grand", label: "Grand", hint: "Duels aeriens" },
  { value: "petit", label: "Petit & nerveux", hint: "Dribble, vivacite" },
];

const ACADEMIES: { value: AcademyLevel; label: string; hint: string }[] = [
  { value: "local", label: "Club amateur", hint: "Depart plus dur, gros potentiel brut" },
  { value: "regional", label: "Centre regional", hint: "+1 aux attributs" },
  { value: "national", label: "Academie nationale (INF)", hint: "+3 aux attributs" },
  { value: "elite", label: "Academie de prestige", hint: "+5 aux attributs" },
];

const ACADEMY_BONUS: Record<AcademyLevel, number> = { local: -2, regional: 1, national: 3, elite: 5 };

function applyAcademyBonus(player: Player, academy: AcademyLevel): Player {
  const bonus = ACADEMY_BONUS[academy];
  if (!bonus) return player;
  const attributes = { ...player.attributes };
  for (const key of Object.keys(attributes)) {
    attributes[key] = Math.max(1, Math.min(99, attributes[key] + bonus));
  }
  return { ...player, attributes, overall: Math.max(1, Math.min(99, player.overall + bonus)), potential: Math.max(1, Math.min(99, player.potential + bonus)) };
}

/* --- Animations --- */
const smoothEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

const pageVariants = {
  initial: { opacity: 0, x: 60 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.5, ease: smoothEase } },
  exit: { opacity: 0, x: -60, transition: { duration: 0.3 } },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.07 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: smoothEase } },
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: smoothEase } },
};

export default function CreatePlayerPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState(15);
  const [heightCm, setHeightCm] = useState(178);
  const [weightKg, setWeightKg] = useState(72);
  const [morphology, setMorphology] = useState<Morphology>("normal");
  const [position, setPosition] = useState<PositionId>("CM");
  const [style, setStyle] = useState<PlayingStyleId>("complete");
  const [foot, setFoot] = useState<FootChoice>("right");
  const [academy, setAcademy] = useState<AcademyLevel>("regional");
  const [country, setCountry] = useState<Country>("gallia");
  const startingClubs = getStartingClubs(country);
  const [clubId, setClubId] = useState<string>(startingClubs[0]?.id ?? "");
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<Player | null>(null);

  const TOTAL_STEPS = 4;
  const canProceedStep1 = firstName.trim().length >= 2 && lastName.trim().length >= 2;

  function handleGenerate() {
    setError(null);
    setGenerating(true);
    setTimeout(() => {
      try {
        let player = generatePlayer({
          firstName, lastName, age, position, secondaryPositions: [], style, morphology, heightCm, weightKg, nationality: "FR",
        });
        player = { ...player, foot };
        player = applyAcademyBonus(player, academy);
        const stage = initialStageForAge(age);
        player = {
          ...player,
          academyLevel: academy,
          academy: createAcademyStatus(stage),
        };
        const club = getClub(clubId);
        const isPro = stage === "pro";
        const wage = isPro && club ? Math.round(suggestSalary(club.division, player.overall)) : stage === "reserve" ? 400 : stage === "u19" ? 100 : 50;
        player = { ...player, contract: { ...player.contract, clubId, salaryPerWeek: wage, isProfessional: isPro, releaseClause: isPro ? Math.round(player.marketValue * 1.8) : 0 } };

        const nowIso = new Date().toISOString();
        const meta: GameSave = { version: 1, createdAt: nowIso, lastPlayedAt: nowIso, pinHash: null, phase: "hub" as GamePhase, season: null as SeasonState | null, clubId, coachRelationship: null, squad: null, objectives: null, activeLoan: null, agentState: null, mercatoState: null, lifestyleState: null, endorsements: null, lifeEvents: null, mentalState: null, activeInjury: null, sanctionState: null, pressConferences: null, awardsState: null, internationalState: null, phoneState: null, worldState: null, fansState: null, immersionState: null };
        const wallet: Wallet = emptyWallet();
        saveGame({ meta, player, wallet });
        markSessionUnlocked();
        setGenerated(player);
        setTimeout(() => router.push("/client/fc-career/dashboard"), 2500);
      } catch (e) {
        setError((e as Error).message || "Impossible de generer le joueur.");
        setGenerating(false);
      }
    }, 1200);
  }

  // Update clubId when country changes
  useEffect(() => {
    const clubs = getStartingClubs(country);
    if (clubs.length > 0) setClubId(clubs[0].id);
  }, [country]);

  return (
    <div className="fcl" style={{ minHeight: '100vh', background: 'var(--background)', color: 'var(--foreground)', fontFamily: "var(--fcl-body, 'Manrope', sans-serif)", overflow: 'hidden' }}>
      {/* Background particles */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            style={{
              position: 'absolute',
              width: 200 + i * 80,
              height: 200 + i * 80,
              borderRadius: '50%',
              background: i % 2 === 0
                ? 'radial-gradient(circle, oklch(.91 .19 112 / .04), transparent 70%)'
                : 'radial-gradient(circle, oklch(.73 .13 246 / .03), transparent 70%)',
              left: `${10 + i * 15}%`,
              top: `${5 + (i % 3) * 30}%`,
            }}
            animate={{
              y: [0, -30, 0],
              scale: [1, 1.1, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{ duration: 6 + i * 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 680, margin: '0 auto', padding: '40px 20px 80px' }}>
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: smoothEase }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}
        >
          <button
            onClick={() => step === 1 ? router.push('/client/fc-career') : setStep(step - 1)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}
          >
            <ArrowLeft size={16} /> {step === 1 ? 'Retour' : `Etape ${step - 1}`}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {[1, 2, 3, 4].map(s => (
              <motion.div
                key={s}
                style={{
                  width: s === step ? 32 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: s === step ? 'var(--primary)' : s < step ? 'var(--primary)' : 'var(--secondary)',
                }}
                layout
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            ))}
          </div>
        </motion.header>

        {/* Title */}
        <motion.div {...fadeUp} style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 9, fontWeight: 600, color: 'var(--primary)', marginBottom: 12 }}>
            <span style={{ width: 4, height: 4, background: 'var(--primary)', display: 'inline-block' }} />
            FC CAREER &middot; CREATION
          </div>
          <h1 style={{ fontFamily: "'Barlow', sans-serif", fontSize: 'clamp(28px, 5vw, 38px)', fontWeight: 600, lineHeight: 1.15 }}>
            {generating ? 'Generation en cours...' : generated ? 'Votre legende commence.' : step === 1 ? 'Qui etes-vous ?' : step === 2 ? 'Votre physique.' : step === 3 ? 'Quel joueur serez-vous ?' : 'Ou commence votre histoire ?'}
          </h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: 11, marginTop: 12, lineHeight: 1.7 }}>
            {generating ? 'Calcul des attributs, placement en academie...' : generated ? `${generated.firstName} ${generated.lastName} · ${STAGE_LABELS[initialStageForAge(age)]} · Overall ${generated.overall}` : step === 1 ? 'Chaque detail compte. Votre identite definit votre histoire.' : step === 2 ? 'Taille, poids, morphologie. Le corps forge le joueur.' : step === 3 ? 'Poste, style de jeu, pied fort.' : 'Pays de depart, academie, club.'}
          </p>
        </motion.div>

        {/* Generating animation */}
        {generating && !generated && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ textAlign: 'center', padding: '60px 0' }}
          >
            <motion.div
              style={{ width: 120, height: 120, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', margin: '0 auto 30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            >
              <Zap size={40} style={{ color: 'var(--primary)' }} />
            </motion.div>
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ fontSize: 13, color: 'var(--muted-foreground)' }}
            >
              Analyse du potentiel...
            </motion.div>
          </motion.div>
        )}

        {/* Generated result */}
        {generated && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: smoothEase }}
            style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 32, textAlign: 'center' }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
              style={{ width: 80, height: 80, borderRadius: '50%', background: 'color-mix(in oklab, var(--primary) 15%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}
            >
              <Trophy size={36} style={{ color: 'var(--primary)' }} />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              style={{ fontFamily: "'Barlow', sans-serif", fontSize: 28, fontWeight: 600 }}
            >
              {generated.firstName} {generated.lastName}
            </motion.h2>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 20, fontSize: 11, color: 'var(--muted-foreground)' }}
            >
              <span>Overall <strong style={{ color: 'var(--primary)', fontSize: 20, fontFamily: "'Barlow', sans-serif", display: 'block', marginTop: 4 }}>{generated.overall}</strong></span>
              <span>Potentiel <strong style={{ color: 'var(--foreground)', fontSize: 20, fontFamily: "'Barlow', sans-serif", display: 'block', marginTop: 4 }}>{generated.potential}</strong></span>
              <span>Poste <strong style={{ color: 'var(--foreground)', fontSize: 20, fontFamily: "'Barlow', sans-serif", display: 'block', marginTop: 4 }}>{generated.position}</strong></span>
              <span>Niveau <strong style={{ color: 'var(--foreground)', fontSize: 14, fontFamily: "'Barlow', sans-serif", display: 'block', marginTop: 4 }}>{STAGE_LABELS[generated.academy.stage]}</strong></span>
            </motion.div>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ delay: 0.9, duration: 1.2, ease: smoothEase }}
              style={{ height: 3, background: 'var(--primary)', borderRadius: 3, margin: '24px auto 0', maxWidth: 200 }}
            />
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.3 }}
              style={{ fontSize: 10, color: 'var(--muted-foreground)', marginTop: 16 }}
            >
              Redirection vers le tableau de bord...
            </motion.p>
          </motion.div>
        )}

        {/* Form steps */}
        {!generating && !generated && (
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <motion.div variants={stagger} initial="initial" animate="animate" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <FormCard>
                    <FieldLabel icon={<UserRound size={14} />} label="Prenom" />
                    <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Kylian" className="fcl-create-input" />
                  </FormCard>
                  <FormCard>
                    <FieldLabel icon={<UserRound size={14} />} label="Nom" />
                    <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Lumina" className="fcl-create-input" />
                  </FormCard>
                  <FormCard>
                    <FieldLabel icon={<Activity size={14} />} label={`Age au depart : ${age} ans`} />
                    <input type="range" min={14} max={16} value={age} onChange={e => setAge(Number(e.target.value))} className="fcl-create-range" />
                    <span style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>Vous commencerez en {STAGE_LABELS[initialStageForAge(age)]}</span>
                  </FormCard>
                  <motion.button variants={fadeUp} disabled={!canProceedStep1} onClick={() => canProceedStep1 && setStep(2)} className="fcl-create-cta" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    Continuer <ArrowRight size={16} />
                  </motion.button>
                </motion.div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <motion.div variants={stagger} initial="initial" animate="animate" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <FormCard>
                      <FieldLabel icon={<Ruler size={14} />} label={`Taille : ${heightCm} cm`} />
                      <input type="range" min={155} max={205} value={heightCm} onChange={e => setHeightCm(Number(e.target.value))} className="fcl-create-range" />
                    </FormCard>
                    <FormCard>
                      <FieldLabel icon={<Ruler size={14} />} label={`Poids : ${weightKg} kg`} />
                      <input type="range" min={50} max={100} value={weightKg} onChange={e => setWeightKg(Number(e.target.value))} className="fcl-create-range" />
                    </FormCard>
                  </div>
                  <FormCard>
                    <FieldLabel icon={<Footprints size={14} />} label="Morphologie" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
                      {MORPHOLOGIES.map(m => (
                        <OptionButton key={m.value} active={morphology === m.value} onClick={() => setMorphology(m.value)} label={m.label} hint={m.hint} />
                      ))}
                    </div>
                  </FormCard>
                  <FormCard>
                    <FieldLabel icon={<Footprints size={14} />} label="Pied fort" />
                    <div style={{ display: 'flex', gap: 8 }}>
                      {(["left", "right", "both"] as FootChoice[]).map(f => (
                        <motion.button key={f} onClick={() => setFoot(f)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} style={{ flex: 1, padding: '10px 12px', borderRadius: 6, border: `1px solid ${foot === f ? 'var(--primary)' : 'var(--border)'}`, background: foot === f ? 'color-mix(in oklab, var(--primary) 15%, transparent)' : 'var(--card)', color: foot === f ? 'var(--primary)' : 'var(--foreground)', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                          {f === "left" ? "Gaucher" : f === "right" ? "Droitier" : "Les deux"}
                        </motion.button>
                      ))}
                    </div>
                  </FormCard>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <motion.button onClick={() => setStep(1)} className="fcl-create-back" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}><ArrowLeft size={16} /></motion.button>
                    <motion.button onClick={() => setStep(3)} className="fcl-create-cta" style={{ flex: 1 }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                      Continuer <ArrowRight size={16} />
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <motion.div variants={stagger} initial="initial" animate="animate" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <FormCard>
                    <FieldLabel icon={<Shield size={14} />} label="Poste principal" />
                    {Object.entries(POSITION_GROUPS).map(([group, ids]) => (
                      <div key={group} style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6, textTransform: 'uppercase' }}>{group}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {ids.map(id => (
                            <motion.button key={id} onClick={() => setPosition(id as PositionId)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} style={{ padding: '8px 14px', borderRadius: 6, border: `1px solid ${position === id ? 'var(--primary)' : 'var(--border)'}`, background: position === id ? 'color-mix(in oklab, var(--primary) 15%, transparent)' : 'var(--card)', color: position === id ? 'var(--primary)' : 'var(--foreground)', fontSize: 12, fontWeight: 600, fontFamily: "'Barlow', sans-serif", cursor: 'pointer' }}>
                              {id}
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </FormCard>
                  <FormCard>
                    <FieldLabel icon={<Sparkles size={14} />} label="Style de jeu" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
                      {PLAYING_STYLES.map(s => (
                        <OptionButton key={s.id} active={style === s.id} onClick={() => setStyle(s.id)} label={s.label} hint={s.description} />
                      ))}
                    </div>
                  </FormCard>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <motion.button onClick={() => setStep(2)} className="fcl-create-back" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}><ArrowLeft size={16} /></motion.button>
                    <motion.button onClick={() => setStep(4)} className="fcl-create-cta" style={{ flex: 1 }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                      Continuer <ArrowRight size={16} />
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <motion.div variants={stagger} initial="initial" animate="animate" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <FormCard>
                    <FieldLabel icon={<Shield size={14} />} label="Formation (academie)" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {ACADEMIES.map(a => (
                        <OptionButton key={a.value} active={academy === a.value} onClick={() => setAcademy(a.value)} label={a.label} hint={a.hint} />
                      ))}
                    </div>
                  </FormCard>
                  <FormCard>
                    <FieldLabel icon={<Shield size={14} />} label="Dans quel pays veux-tu commencer ?" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
                      {COUNTRIES.map(c => (
                        <OptionButton key={c.id} active={country === c.id} onClick={() => setCountry(c.id)} label={`${c.flag} ${c.name}`} hint={c.inspired} />
                      ))}
                    </div>
                  </FormCard>
                  <FormCard>
                    <FieldLabel icon={<Shield size={14} />} label="Club (academie)" />
                    <select value={clubId} onChange={e => setClubId(e.target.value)} className="fcl-create-input">
                      {startingClubs.map(c => (
                        <option key={c.id} value={c.id}>{c.name} — {DIVISION_INFO[c.division]?.shortName ?? c.division}</option>
                      ))}
                    </select>
                  </FormCard>
                  <FormCard>
                    <div style={{ textAlign: 'center', padding: '8px 0' }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 4 }}>VOTRE PARCOURS</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)', fontFamily: "'Barlow', sans-serif" }}>
                        {STAGE_LABELS[initialStageForAge(age)]}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--muted-foreground)', marginTop: 4 }}>
                        {age <= 16 ? "Vous commencez en academie. Votre performance decidera de votre avenir." : "Vous commencez directement en equipe premiere."}
                      </div>
                    </div>
                  </FormCard>

                  {error && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: 'color-mix(in oklab, var(--coral) 12%, var(--card))', color: 'var(--coral)', padding: 14, borderRadius: 8, fontSize: 12 }}>
                      {error}
                    </motion.p>
                  )}

                  <div style={{ display: 'flex', gap: 12 }}>
                    <motion.button onClick={() => setStep(3)} className="fcl-create-back" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}><ArrowLeft size={16} /></motion.button>
                    <motion.button onClick={handleGenerate} className="fcl-create-cta" style={{ flex: 1 }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                      <Zap size={16} /> Generer mon joueur <ArrowRight size={16} />
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      <style>{`
        .fcl-create-input {
          width: 100%;
          padding: 12px 14px;
          background: var(--secondary);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--foreground);
          font-size: 13px;
          font-family: inherit;
          outline: none;
          transition: border-color 0.2s;
        }
        .fcl-create-input:focus {
          border-color: var(--primary);
        }
        .fcl-create-range {
          width: 100%;
          accent-color: var(--primary);
          height: 6px;
        }
        .fcl-create-cta {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          height: 48px;
          background: var(--primary);
          color: var(--primary-foreground);
          border: none;
          border-radius: 8px;
          font-family: 'Barlow', sans-serif;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          margin-top: 8px;
        }
        .fcl-create-cta:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .fcl-create-back {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--muted-foreground);
          cursor: pointer;
          font-family: inherit;
        }
        @media (max-width: 600px) {
          .fcl-create-input { padding: 10px 12px; font-size: 14px; }
        }
      `}</style>
    </div>
  );
}

function FormCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={fadeUp}
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {children}
    </motion.div>
  );
}

function FieldLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)' }}>
      {icon} {label}
    </span>
  );
}

function OptionButton({ active, onClick, label, hint }: { active: boolean; onClick: () => void; label: string; hint: string }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      style={{
        padding: '12px 14px',
        borderRadius: 8,
        border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
        background: active ? 'color-mix(in oklab, var(--primary) 12%, transparent)' : 'transparent',
        color: active ? 'var(--primary)' : 'var(--foreground)',
        textAlign: 'left',
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'border-color 0.2s, background 0.2s',
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 9, color: 'var(--muted-foreground)', marginTop: 3 }}>{hint}</div>
    </motion.button>
  );
}

const fadeUp2 = fadeUp; // alias
