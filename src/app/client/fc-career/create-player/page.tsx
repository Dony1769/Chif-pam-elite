"use client";

/**
 * FC CAREER — Étape 3 : Création du joueur
 * Formulaire multi-étapes : identité → poste → génération
 */

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button }     from "../game/components/Button";
import { pageFade, itemFade, stagger } from "../game/design/animations";
import { useGame }    from "../game/hooks/useGame";
import { createPlayer } from "../game/domain/playerFactory";
import { createInitialCareer, generateAcademySchedule } from "../game/domain/academySchedule";
import { createEmptySave, writeSave } from "../game/persistence/saveRepository";
import type { GameSaveV1 } from "../game/persistence/saveSchema";
import { careerId }   from "../game/utils/ids";
import type { Position } from "../game/domain/player";
import { generateWorld, generateLeagueSchedule } from "../game/domain/worldGenerator";
import { COUNTRIES, LEAGUES, CLUBS } from "../game/data/world";

/* ── Données formulaire ─────────────────────────────────────────── */

const NATIONALITIES = [
  { code: "BR", flag: "🇧🇷", name: "Brésil" },
  { code: "FR", flag: "🇫🇷", name: "France" },
  { code: "ES", flag: "🇪🇸", name: "Espagne" },
  { code: "AR", flag: "🇦🇷", name: "Argentine" },
  { code: "DE", flag: "🇩🇪", name: "Allemagne" },
  { code: "PT", flag: "🇵🇹", name: "Portugal" },
  { code: "NG", flag: "🇳🇬", name: "Nigéria" },
  { code: "IT", flag: "🇮🇹", name: "Italie" },
  { code: "HT", flag: "🇭🇹", name: "Haïti" },
  { code: "SN", flag: "🇸🇳", name: "Sénégal" },
  { code: "CM", flag: "🇨🇲", name: "Cameroun" },
  { code: "MA", flag: "🇲🇦", name: "Maroc" },
  { code: "GB", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", name: "Angleterre" },
  { code: "US", flag: "🇺🇸", name: "États-Unis" },
  { code: "JP", flag: "🇯🇵", name: "Japon" },
];

const POSITIONS: { code: Position; label: string; family: string }[] = [
  { code: "GK",  label: "Gardien",      family: "Gardien" },
  { code: "CB",  label: "Défenseur C.", family: "Défenseur" },
  { code: "LB",  label: "Arrière G.",   family: "Défenseur" },
  { code: "RB",  label: "Arrière D.",   family: "Défenseur" },
  { code: "CDM", label: "Milieu Déf.", family: "Milieu" },
  { code: "CM",  label: "Milieu C.",    family: "Milieu" },
  { code: "CAM", label: "Milieu Off.", family: "Milieu" },
  { code: "LW",  label: "Ailier G.",    family: "Attaquant" },
  { code: "RW",  label: "Ailier D.",    family: "Attaquant" },
  { code: "CF",  label: "Avant-C.",     family: "Attaquant" },
  { code: "ST",  label: "Attaquant",    family: "Attaquant" },
];

const FOOT_OPTIONS = [
  { value: "right", label: "Pied droit" },
  { value: "left",  label: "Pied gauche" },
  { value: "both",  label: "Ambidextre" },
] as const;

interface FormData {
  firstName:   string;
  lastName:    string;
  nationality: string;
  position:    Position | "";
  foot:        "right" | "left" | "both";
}

/* ── Composant ─────────────────────────────────────────────────── */

export default function CreatePlayerPage() {
  const { dispatch } = useGame();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<FormData>({
    firstName:   "",
    lastName:    "",
    nationality: "BR",
    position:    "",
    foot:        "right",
  });

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const canGoStep2 =
    form.firstName.trim().length >= 2 &&
    form.lastName.trim().length >= 2 &&
    form.nationality !== "";

  const canConfirm = canGoStep2 && form.position !== "";

  const handleCreate = useCallback(async () => {
    if (!canConfirm || form.position === "" || saving) return;
    setSaving(true);

    try {
      const seed = `${form.firstName}-${form.lastName}-${Date.now()}`;
      const player = createPlayer({
        firstName:   form.firstName.trim(),
        lastName:    form.lastName.trim(),
        nationality: form.nationality,
        position:    form.position,
        foot:        form.foot,
        seed,
      });

      const id     = careerId();
      const careerRaw = createInitialCareer(id);
      // Sérialisation pour GameSaveV1 (completedMatchIds : Set → string[])
      const career: GameSaveV1["career"] = {
        ...careerRaw,
        completedMatchIds: [],
      };
      const schedule = generateAcademySchedule(id, 1);

      // Générer le monde vivant complet (déterministe depuis l'id carrière)
      const worldLiveState = generateWorld(id);

      // Construire les schedules pro pour chaque ligue (saison 1)
      // Ces schedules permettent au Dashboard, Calendrier et Monde de fonctionner
      // même quand le joueur est encore en académie (simulation du monde vivant)
      const proSchedules = LEAGUES.map(league => {
        const clubIds = CLUBS.filter(c => c.leagueId === league.id).map(c => c.id);
        const ls = generateLeagueSchedule(league.id, clubIds, 1, id);
        return {
          season: 1,
          competitionId: league.id,
          fixtures: ls.fixtures,
          currentMatchday: ls.currentMatchday,
          totalMatchdays: ls.totalMatchdays,
        } as import("../game/domain/season").SeasonSchedule;
      });

      // Standings initiaux pour chaque ligue
      const initialStandings: Record<string, import("../game/domain/club").StandingRow[]> = {};
      for (const league of LEAGUES) {
        const clubIds = CLUBS.filter(c => c.leagueId === league.id).map(c => c.id);
        initialStandings[league.id] = clubIds.map(cid => ({
          clubId: cid, position: 0, points: 0,
          played: 0, won: 0, drawn: 0, lost: 0,
          goalsFor: 0, goalsAgainst: 0, form: [],
        }));
      }

      const save = createEmptySave(
        id,
        player,
        career,
        { balance: 0, weeklyWage: 0, totalEarned: 0, totalSpent: 0 },
        {
          countries: COUNTRIES,
          leagues: LEAGUES,
          clubs: CLUBS,
          standings: initialStandings,
          schedules: [schedule, ...proSchedules],
          lastMatchResults: [],
        },
      );

      // Attacher le monde vivant à la sauvegarde
      (save as GameSaveV1).worldLiveState = worldLiveState;

      writeSave(save);
      dispatch({ type: "LOAD_SAVE", save });
      router.push("/client/fc-career/dashboard");
    } catch {
      setSaving(false);
    }
  }, [form, canConfirm, saving, dispatch, router]);

  return (
    <div style={{
      minHeight: "100dvh",
      background: "var(--fc-surface-0)",
      color: "var(--fc-text)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "var(--fc-space-5) var(--fc-space-4)",
    }}>
      <div style={{ width: "100%", maxWidth: 480 }}>

        {/* Header */}
        <motion.div
          className="fc-page-header"
          variants={pageFade}
          initial="hidden"
          animate="visible"
        >
          <h1 className="fc-page-title">Nouvelle carrière</h1>
          <p className="fc-page-meta">
            Étape {step} / 2 — {step === 1 ? "Votre identité" : "Votre poste"}
          </p>

          {/* Progress */}
          <div className="fc-progress" style={{ marginTop: "var(--fc-space-3)" }}>
            <div
              className="fc-progress__fill"
              style={{ width: step === 1 ? "50%" : "100%", transition: "width 0.4s ease" }}
            />
          </div>
        </motion.div>

        {/* Steps */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              variants={stagger}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, x: -20, transition: { duration: 0.18 } }}
            >
              <Step1 form={form} set={set} />
              <Button
                variant="primary"
                fullWidth
                size="lg"
                disabled={!canGoStep2}
                onClick={() => setStep(2)}
                style={{ marginTop: "var(--fc-space-6)" }}
              >
                Continuer →
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              variants={stagger}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, x: 20, transition: { duration: 0.18 } }}
            >
              <Step2 form={form} set={set} />
              <div style={{
                display: "flex", gap: "var(--fc-space-3)",
                marginTop: "var(--fc-space-6)"
              }}>
                <Button variant="ghost" onClick={() => setStep(1)}>← Retour</Button>
                <Button
                  variant="primary"
                  fullWidth
                  size="lg"
                  disabled={!canConfirm}
                  loading={saving}
                  onClick={handleCreate}
                >
                  Commencer la carrière
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

/* ── Étape 1 : Identité ─────────────────────────────────────────── */
function Step1({
  form, set,
}: {
  form: FormData;
  set: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
}) {
  return (
    <>
      <motion.div className="fc-field" variants={itemFade}>
        <label className="fc-label" htmlFor="firstName">Prénom</label>
        <input
          id="firstName"
          className="fc-input"
          placeholder="ex: Luca"
          value={form.firstName}
          onChange={e => set("firstName", e.target.value)}
          maxLength={20}
          autoFocus
        />
      </motion.div>

      <motion.div className="fc-field" variants={itemFade}>
        <label className="fc-label" htmlFor="lastName">Nom de famille</label>
        <input
          id="lastName"
          className="fc-input"
          placeholder="ex: Ferreira"
          value={form.lastName}
          onChange={e => set("lastName", e.target.value)}
          maxLength={25}
        />
      </motion.div>

      <motion.div className="fc-field" variants={itemFade}>
        <label className="fc-label">Nationalité</label>
        <NationalityGrid value={form.nationality} onChange={v => set("nationality", v)} />
      </motion.div>

      <motion.div className="fc-field" variants={itemFade}>
        <label className="fc-label">Pied fort</label>
        <div style={{ display: "flex", gap: "var(--fc-space-2)" }}>
          {FOOT_OPTIONS.map(f => (
            <button
              key={f.value}
              onClick={() => set("foot", f.value)}
              style={{
                flex: 1,
                padding: "var(--fc-space-3)",
                borderRadius: "var(--fc-radius)",
                border: `1px solid ${form.foot === f.value ? "var(--fc-emerald)" : "var(--fc-border-mid)"}`,
                background: form.foot === f.value ? "var(--fc-emerald-10)" : "var(--fc-surface-3)",
                color: form.foot === f.value ? "var(--fc-emerald)" : "var(--fc-text-2)",
                fontSize: "var(--fc-text-sm)",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </motion.div>
    </>
  );
}

function NationalityGrid({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(5, 1fr)",
      gap: "var(--fc-space-2)",
    }}>
      {NATIONALITIES.map(n => (
        <button
          key={n.code}
          onClick={() => onChange(n.code)}
          title={n.name}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            padding: "var(--fc-space-2)",
            borderRadius: "var(--fc-radius)",
            border: `1px solid ${value === n.code ? "var(--fc-emerald)" : "var(--fc-border)"}`,
            background: value === n.code ? "var(--fc-emerald-10)" : "var(--fc-surface-3)",
            cursor: "pointer",
            fontSize: "1.4rem",
            transition: "all 0.15s ease",
          }}
        >
          <span>{n.flag}</span>
          <span style={{ fontSize: "var(--fc-text-xs)", color: value === n.code ? "var(--fc-emerald)" : "var(--fc-text-3)" }}>
            {n.code}
          </span>
        </button>
      ))}
    </div>
  );
}

/* ── Étape 2 : Poste ────────────────────────────────────────────── */
function Step2({
  form, set,
}: {
  form: FormData;
  set: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
}) {
  const families = [...new Set(POSITIONS.map(p => p.family))];

  return (
    <motion.div variants={itemFade}>
      <p style={{ fontSize: "var(--fc-text-sm)", color: "var(--fc-text-2)", marginBottom: "var(--fc-space-4)" }}>
        Choisissez votre poste de prédilection. Vos attributs de départ seront adaptés en conséquence.
      </p>

      {families.map(family => (
        <div key={family} style={{ marginBottom: "var(--fc-space-5)" }}>
          <p style={{
            fontSize: "var(--fc-text-xs)",
            color: "var(--fc-text-3)",
            marginBottom: "var(--fc-space-2)",
            letterSpacing: "0.05em",
          }}>
            {family}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--fc-space-2)" }}>
            {POSITIONS.filter(p => p.family === family).map(pos => (
              <button
                key={pos.code}
                onClick={() => set("position", pos.code)}
                style={{
                  padding: "var(--fc-space-2) var(--fc-space-3)",
                  borderRadius: "var(--fc-radius)",
                  border: `1px solid ${form.position === pos.code ? "var(--fc-emerald)" : "var(--fc-border-mid)"}`,
                  background: form.position === pos.code ? "var(--fc-emerald-10)" : "var(--fc-surface-3)",
                  color: form.position === pos.code ? "var(--fc-emerald)" : "var(--fc-text-2)",
                  fontFamily: "var(--fc-font-display)",
                  fontWeight: 700,
                  fontSize: "var(--fc-text-sm)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <span style={{ fontWeight: 800, marginRight: 4 }}>{pos.code}</span>
                <span style={{ fontWeight: 400, opacity: 0.8 }}>{pos.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {form.position && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="fc-panel"
          style={{ background: "var(--fc-emerald-10)", borderColor: "rgba(55,217,154,0.2)" }}
        >
          <p style={{ fontSize: "var(--fc-text-sm)", color: "var(--fc-emerald)" }}>
            <strong>{POSITIONS.find(p => p.code === form.position)?.label}</strong> sélectionné.
            Vos attributs offensifs et votre vitesse seront développés en priorité.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
