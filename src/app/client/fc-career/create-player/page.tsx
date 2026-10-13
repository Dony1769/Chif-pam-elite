"use client";

/**
 * FC CAREER — Création du joueur (identité, morpho, poste, style, club)
 * Route: /client/fc-career/create-player
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Check,
  Footprints,
  Ruler,
  Shield,
  Sparkles,
  UserRound,
} from "lucide-react";
import { generatePlayer } from "../engine/player-generator";
import { emptyWallet } from "../engine/economic-engine";
import { suggestSalary } from "../engine/transfer-system";
import { saveGame } from "../utils/storage";
import { markSessionUnlocked } from "../utils/session";
import type { AcademyLevel } from "../types/player";
import type { GamePhase, GameSave, SeasonState } from "../types/game";
import type { PositionId, PlayingStyleId } from "../constants/positions";
import { PLAYING_STYLES } from "../constants/positions";
import { getStartingClubs, getClub } from "../constants/clubs";
import type { Country } from "../types/club";
import { COUNTRIES, DIVISION_INFO } from "../types/club";
import type { FootChoice, Morphology, Player } from "../types/player";
import type { Wallet } from "../types/economy";

const POSITION_GROUPS: Record<string, PositionId[]> = {
  Gardien: ["GK"],
  Défense: ["RB", "RCB", "LCB", "LB"],
  Milieu: ["CDM", "CM", "CAM"],
  Attaque: ["RW", "LW", "ST", "CF"],
};

const MORPHOLOGIES: { value: Morphology; label: string; hint: string }[] = [
  { value: "fin", label: "Fin & vif", hint: "Agilité, équilibre" },
  { value: "normal", label: "Équilibré", hint: "Polyvalent" },
  { value: "costaud", label: "Costaud", hint: "Force physique" },
  { value: "grand", label: "Grand", hint: "Duels aériens" },
  { value: "petit", label: "Petit & nerveux", hint: "Dribble, vivacité" },
];

const ACADEMIES: { value: AcademyLevel; label: string; hint: string }[] = [
  { value: "local", label: "Club amateur", hint: "Départ plus dur, gros potentiel brut" },
  { value: "regional", label: "Centre régional", hint: "+1 aux attributs" },
  { value: "national", label: "Académie nationale (INF)", hint: "+3 aux attributs" },
  { value: "elite", label: "Académie de prestige", hint: "+5 aux attributs" },
];

/** Bonus d'attributs selon la formation choisie à la création. */
const ACADEMY_BONUS: Record<AcademyLevel, number> = {
  local: -2,
  regional: 1,
  national: 3,
  elite: 5,
};

function applyAcademyBonus(player: Player, academy: AcademyLevel): Player {
  const bonus = ACADEMY_BONUS[academy];
  if (!bonus) return player;
  const attributes = { ...player.attributes };
  for (const key of Object.keys(attributes)) {
    attributes[key] = Math.max(1, Math.min(99, attributes[key] + bonus));
  }
  return {
    ...player,
    attributes,
    overall: Math.max(1, Math.min(99, player.overall + bonus)),
    potential: Math.max(1, Math.min(99, player.potential + bonus)),
  };
}

export default function CreatePlayerPage() {
  const router = useRouter();

  // Étape 1 — identité
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState(18);
  const [heightCm, setHeightCm] = useState(178);
  const [weightKg, setWeightKg] = useState(72);
  const [morphology, setMorphology] = useState<Morphology>("normal");

  // Étape 2 — footballe
  const [position, setPosition] = useState<PositionId>("CM");
  const [style, setStyle] = useState<PlayingStyleId>("complete");
  const [foot, setFoot] = useState<FootChoice>("right");
  const [academy, setAcademy] = useState<AcademyLevel>("regional");
  const [country, setCountry] = useState<Country>("gallia");
  const startingClubs = getStartingClubs(country);
  const [clubId, setClubId] = useState<string>(startingClubs[0]?.id ?? "");

  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const canProceedStep1 = firstName.trim().length >= 2 && lastName.trim().length >= 2;

  function handleGenerate() {
    setError(null);
    try {
      let player = generatePlayer({
        firstName,
        lastName,
        age,
        position,
        secondaryPositions: [],
        style,
        morphology,
        heightCm,
        weightKg,
        nationality: "FR",
      });

      // Pied choisi par l'utilisateur (le générateur aléatoire est ignoré ici).
      player = { ...player, foot };
      // Bonus de formation selon l'académie sélectionnée.
      player = applyAcademyBonus(player, academy);

      // Contrat dans le club de départ.
      const club = getClub(clubId);
      const wage = club
        ? Math.round(suggestSalary(club.division, player.overall))
        : 300;
      player = {
        ...player,
        contract: {
          ...player.contract,
          clubId,
          salaryPerWeek: wage,
          isProfessional: true,
          releaseClause: Math.round(player.marketValue * 1.8),
        },
      };

      const nowIso = new Date().toISOString();
      const meta: GameSave = {
        version: 1,
        createdAt: nowIso,
        lastPlayedAt: nowIso,
        pinHash: null,
        phase: "hub" as GamePhase,
        season: null as SeasonState | null,
        clubId,
      };

      const wallet: Wallet = emptyWallet();

      saveGame({ meta, player, wallet });
      markSessionUnlocked();
      router.push("/client/fc-career/dashboard");
    } catch (e) {
      setError((e as Error).message || "Impossible de générer le joueur.");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-4 py-8">
      {/* En-tête */}
      <header className="flex items-center justify-between">
        <Link
          href="/client/fc-career"
          className="inline-flex items-center gap-2 text-sm opacity-70 hover:opacity-100"
        >
          <ArrowLeft size={16} /> Retour
        </Link>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest opacity-60">
          <span className={step === 1 ? "text-emerald-400" : ""}>1. Identité</span>
          <span>—</span>
          <span className={step === 2 ? "text-emerald-400" : ""}>2. Profil</span>
        </div>
      </header>

      <h1 className="text-2xl font-bold">Crée ton joueur</h1>

      {step === 1 ? (
        <section className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/5 p-5">
          <Field icon={<UserRound size={16} />} label="Prénom">
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Kylian"
              className="fc-input"
            />
          </Field>
          <Field icon={<UserRound size={16} />} label="Nom">
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Lumina"
              className="fc-input"
            />
          </Field>

          <Field icon={<Activity size={16} />} label={`Âge au départ : ${age} ans`}>
            <input
              type="range"
              min={16}
              max={30}
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              className="w-full accent-emerald-400"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field icon={<Ruler size={16} />} label={`Taille : ${heightCm} cm`}>
              <input
                type="range"
                min={155}
                max={205}
                value={heightCm}
                onChange={(e) => setHeightCm(Number(e.target.value))}
                className="w-full accent-emerald-400"
              />
            </Field>
            <Field icon={<Ruler size={16} />} label={`Poids : ${weightKg} kg`}>
              <input
                type="range"
                min={50}
                max={100}
                value={weightKg}
                onChange={(e) => setWeightKg(Number(e.target.value))}
                className="w-full accent-emerald-400"
              />
            </Field>
          </div>

          <Field icon={<Footprints size={16} />} label="Morphologie">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {MORPHOLOGIES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMorphology(m.value)}
                  className={`rounded-xl border p-3 text-left transition ${
                    morphology === m.value
                      ? "border-emerald-400 bg-emerald-400/10"
                      : "border-white/10 bg-white/5 hover:border-white/25"
                  }`}
                >
                  <div className="text-sm font-semibold">{m.label}</div>
                  <div className="text-xs opacity-60">{m.hint}</div>
                </button>
              ))}
            </div>
          </Field>

          <button
            type="button"
            disabled={!canProceedStep1}
            onClick={() => {
              if (canProceedStep1) setStep(2);
            }}
            className="fc-btn-primary mt-2"
          >
            Continuer <ArrowRight size={16} />
          </button>
          {!canProceedStep1 && (
            <p className="text-center text-xs opacity-50">
              Prénom et nom requis (2 lettres minimum).
            </p>
          )}
        </section>
      ) : (
        <section className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/5 p-5">
          <Field icon={<Shield size={16} />} label="Poste principal">
            <div className="flex flex-col gap-3">
              {Object.entries(POSITION_GROUPS).map(([group, ids]) => (
                <div key={group}>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-50">
                    {group}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ids.map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setPosition(id as PositionId)}
                        className={`fc-chip ${position === id ? "fc-chip-active" : ""}`}
                      >
                        {id}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Field>

          <Field icon={<Sparkles size={16} />} label="Style de jeu">
            <div className="grid grid-cols-2 gap-2">
              {PLAYING_STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStyle(s.id)}
                  className={`rounded-xl border p-3 text-left transition ${
                    style === s.id
                      ? "border-emerald-400 bg-emerald-400/10"
                      : "border-white/10 bg-white/5 hover:border-white/25"
                  }`}
                >
                  <div className="text-sm font-semibold">{s.label}</div>
                  <div className="text-xs opacity-60">{s.description}</div>
                </button>
              ))}
            </div>
          </Field>

          <Field icon={<Footprints size={16} />} label="Pied fort">
            <div className="flex gap-2">
              {(["left", "right", "both"] as FootChoice[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFoot(f)}
                  className={`fc-chip ${foot === f ? "fc-chip-active" : ""}`}
                >
                  {f === "left" ? "Gaucher" : f === "right" ? "Droitier" : "Les deux"}
                </button>
              ))}
            </div>
          </Field>

          <Field icon={<Shield size={16} />} label="Formation (académie)">
            <div className="grid grid-cols-2 gap-2">
              {ACADEMIES.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => setAcademy(a.value)}
                  className={`rounded-xl border p-3 text-left transition ${
                    academy === a.value
                      ? "border-emerald-400 bg-emerald-400/10"
                      : "border-white/10 bg-white/5 hover:border-white/25"
                  }`}
                >
                  <div className="text-sm font-semibold">{a.label}</div>
                  <div className="text-xs opacity-60">{a.hint}</div>
                </button>
              ))}
            </div>
          </Field>

          <Field icon={<Shield size={16} />} label="Pays de départ">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {COUNTRIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { setCountry(c.id); setClubId(getStartingClubs(c.id)[0]?.id ?? ""); }}
                  className={`rounded-xl border p-3 text-left transition ${
                    country === c.id
                      ? "border-emerald-400 bg-emerald-400/10"
                      : "border-white/10 bg-white/5 hover:border-white/25"
                  }`}
                >
                  <div className="text-sm font-semibold">{c.flag} {c.name}</div>
                  <div className="text-xs opacity-60">{c.inspired}</div>
                </button>
              ))}
            </div>
          </Field>

          <Field icon={<Shield size={16} />} label="Club (académie)">
            <select
              value={clubId}
              onChange={(e) => setClubId(e.target.value)}
              className="fc-input"
            >
              {startingClubs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {DIVISION_INFO[c.division]?.shortName ?? c.division}
                </option>
              ))}
            </select>
          </Field>

          {error && (
            <p className="rounded-lg bg-red-500/15 p-3 text-sm text-red-400">{error}</p>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)} className="fc-btn-secondary">
              <ArrowLeft size={16} /> Retour
            </button>
            <button type="button" onClick={handleGenerate} className="fc-btn-primary flex-1">
              <Check size={16} /> Générer mon joueur
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="flex items-center gap-2 text-sm font-semibold opacity-80">
        {icon} {label}
      </span>
      {children}
    </label>
  );
}