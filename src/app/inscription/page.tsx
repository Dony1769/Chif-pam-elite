"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Phone,
  ScrollText,
  ShieldCheck,
  UserCircle,
  Users,
} from "lucide-react";
import Link from "next/link";

import { LogoChifPam } from "@/components/LogoChifPam";
import { DSButton, DSCard, DSInput } from "@/components/ui/primitives";
import ThreeSurface from "@/components/three/ThreeSurface";
import { normalizePhoneNumber } from "@/lib/phone";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                       */
/* -------------------------------------------------------------------------- */

type Strength = {
  score: number;
  label: string;
  tone: string;
};

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                     */
/* -------------------------------------------------------------------------- */

function formatPhonePreview(digits: string): string {
  if (!digits) return "";

  const first = digits.slice(0, 4);
  const second = digits.slice(4, 8);

  return second ? `${first} ${second}` : first;
}

function getPasswordStrength(password: string): Strength {
  if (!password) {
    return {
      score: 0,
      label: "",
      tone: "",
    };
  }

  let score = 0;

  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels: Strength[] = [
    {
      score: 1,
      label: "Faible",
      tone: "bg-rose-400",
    },
    {
      score: 2,
      label: "Moyen",
      tone: "bg-amber-400",
    },
    {
      score: 3,
      label: "Solide",
      tone: "bg-emerald-400",
    },
    {
      score: 4,
      label: "Excellent",
      tone: "bg-cyan-400",
    },
  ];

  return (
    levels[Math.max(0, score - 1)] ?? {
      score: 0,
      label: "",
      tone: "",
    }
  );
}

/* -------------------------------------------------------------------------- */
/* FORM                                                                        */
/* -------------------------------------------------------------------------- */

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [refDetected, setRefDetected] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const strength = useMemo(
    () => getPasswordStrength(password),
    [password]
  );

  useEffect(() => {
    const ref = searchParams.get("ref");

    if (ref) {
      setReferralCode(ref.toUpperCase());
      setRefDetected(true);
    }
  }, [searchParams]);

  const handlePhoneChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setPhone(
      event.target.value
        .replace(/\D/g, "")
        .slice(0, 8)
    );
  };

  const handleSignup = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (loading) return;

    setError("");

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!/^\d{8}$/.test(phone)) {
      setError(
        "Le numéro de téléphone doit contenir exactement 8 chiffres."
      );
      return;
    }

    if (password.length < 8) {
      setError(
        "Le mot de passe doit contenir au moins 8 caractères."
      );
      return;
    }

    if (cleanUsername.length < 3) {
      setError(
        "Le pseudo doit contenir au moins 3 caractères."
      );
      return;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)
    ) {
      setError(
        "Veuillez saisir une adresse email valide."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: normalizePhoneNumber(`+509${phone}`),
          password,
          username: cleanUsername,
          email: cleanEmail,
          referralCode,
        }),
      });

      const result = (await response.json()) as {
        success?: boolean;
        message?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Une erreur est survenue lors de l'inscription."
        );
      }

      router.push("/connexion?signup=success");
    } catch (err: unknown) {
      let rawMessage = "";

      if (err instanceof Error) {
        rawMessage = err.message;
      } else if (
        typeof err === "object" &&
        err !== null &&
        "message" in err
      ) {
        rawMessage = String(
          (err as { message: unknown }).message
        );
      }

      const lowerMessage = rawMessage.toLowerCase();

      if (
        lowerMessage.includes("user already registered") ||
        lowerMessage.includes("profiles_phone_key") ||
        lowerMessage.includes("already exists")
      ) {
        setError(
          "Ce numéro est déjà associé à un compte. Vous pouvez vous connecter."
        );
      } else if (
        lowerMessage.includes("profiles_username_key")
      ) {
        setError(
          "Ce pseudo est déjà utilisé. Veuillez en choisir un autre."
        );
      } else {
        setError(
          rawMessage ||
            "Une erreur est survenue lors de l'inscription. Veuillez réessayer."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full">
      <DSCard className="relative overflow-hidden rounded-[28px] p-6 sm:p-8">
        {/* Ambient top light */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-emerald-400/[0.07] via-cyan-400/[0.025] to-transparent"
        />

        {/* Subtle corner glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-cyan-400/[0.06] blur-3xl"
        />

        <div className="relative">
          {/* Mobile brand */}
          <div className="mb-7 flex justify-center md:hidden">
            <Link
              href="/"
              aria-label="Retour à l'accueil ChifPam"
              className="rounded-xl outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-emerald-400/60"
            >
              <LogoChifPam />
            </Link>
          </div>

          {/* Header */}
          <div className="mb-7">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.07]">
              <UserCircle
                size={21}
                className="text-emerald-300"
              />
            </div>

            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300/80">
              Création de compte
            </p>

            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-[28px]">
              Créer votre espace
            </h1>

            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
              Configurez votre compte ChifPam en quelques étapes.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-400/15 bg-rose-400/[0.07] p-4 text-sm text-rose-200"
            >
              <AlertCircle
                size={18}
                className="mt-0.5 shrink-0 text-rose-400"
              />
              <span>{error}</span>
            </div>
          )}

          <form
            onSubmit={handleSignup}
            className="relative space-y-5"
          >
            {/* Username */}
            <div className="space-y-2">
              <label
                htmlFor="signup-username"
                className="ml-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400"
              >
                Pseudo
              </label>

              <div className="group relative">
                <UserCircle
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-emerald-300"
                />

                <DSInput
                  id="signup-username"
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(event) =>
                    setUsername(event.target.value)
                  }
                  placeholder="Votre pseudo"
                  disabled={loading}
                  className="rounded-2xl py-4 pl-12 font-medium transition-[border,box-shadow] duration-200 focus-visible:ring-2 focus-visible:ring-emerald-400/25"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label
                htmlFor="signup-email"
                className="ml-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400"
              >
                Adresse email
              </label>

              <div className="group relative">
                <Mail
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-emerald-300"
                />

                <DSInput
                  id="signup-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="vous@exemple.com"
                  disabled={loading}
                  className="rounded-2xl py-4 pl-12 font-medium transition-[border,box-shadow] duration-200 focus-visible:ring-2 focus-visible:ring-emerald-400/25"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label
                htmlFor="signup-phone"
                className="ml-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400"
              >
                Téléphone
              </label>

              <div className="group relative">
                <Phone
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-emerald-300"
                />

                <span className="pointer-events-none absolute left-11 top-1/2 z-10 -translate-y-1/2 border-r border-white/10 pr-3 text-sm font-semibold text-slate-400">
                  +509
                </span>

                <DSInput
                  id="signup-phone"
                  type="tel"
                  inputMode="numeric"
                  required
                  autoComplete="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  maxLength={8}
                  placeholder="0000 0000"
                  disabled={loading}
                  className="rounded-2xl py-4 pl-[92px] font-medium tracking-[0.12em] transition-[border,box-shadow] duration-200 focus-visible:ring-2 focus-visible:ring-emerald-400/25"
                />
              </div>

              <div className="flex min-h-4 items-center justify-between px-1">
                <p className="text-[10px] text-slate-600">
                  {phone
                    ? `+509 ${formatPhonePreview(phone)}`
                    : "Votre numéro haïtien"}
                </p>

                {phone.length === 8 && (
                  <CheckCircle2
                    size={14}
                    className="text-emerald-400"
                  />
                )}
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label
                htmlFor="signup-password"
                className="ml-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400"
              >
                Mot de passe
              </label>

              <div className="group relative">
                <Lock
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-emerald-300"
                />

                <DSInput
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Minimum 8 caractères"
                  disabled={loading}
                  className="rounded-2xl py-4 pl-12 pr-12 font-medium transition-[border,box-shadow] duration-200 focus-visible:ring-2 focus-visible:ring-emerald-400/25"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((value) => !value)
                  }
                  disabled={loading}
                  aria-label={
                    showPassword
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                  className="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 outline-none transition-colors hover:bg-white/[0.04] hover:text-slate-200 focus-visible:ring-2 focus-visible:ring-emerald-400/50"
                >
                  {showPassword ? (
                    <EyeOff size={17} />
                  ) : (
                    <Eye size={17} />
                  )}
                </button>
              </div>

              {password.length > 0 && (
                <div className="px-1 pt-1">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-1 gap-1">
                      {[0, 1, 2, 3].map((index) => (
                        <div
                          key={index}
                          className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                            index < strength.score
                              ? strength.tone
                              : "bg-white/[0.07]"
                          }`}
                        />
                      ))}
                    </div>

                    <span className="w-16 text-right text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                      {strength.label}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Referral */}
            <div className="border-t border-white/[0.06] pt-5">
              <div className="mb-2 flex items-center justify-between px-1">
                <label
                  htmlFor="signup-referral"
                  className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400"
                >
                  Code de parrainage
                </label>

                <span className="text-[9px] uppercase tracking-wider text-slate-600">
                  Optionnel
                </span>
              </div>

              <div className="group relative">
                <Users
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-cyan-300"
                />

                <DSInput
                  id="signup-referral"
                  type="text"
                  value={referralCode}
                  onChange={(event) =>
                    setReferralCode(
                      event.target.value.toUpperCase()
                    )
                  }
                  placeholder="CODE"
                  disabled={loading}
                  className="rounded-2xl py-4 pl-12 pr-24 font-medium uppercase tracking-wider transition-[border,box-shadow] duration-200 focus-visible:ring-2 focus-visible:ring-cyan-400/20"
                />

                {refDetected && (
                  <span className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-lg border border-emerald-400/10 bg-emerald-400/[0.06] px-2 py-1 text-[9px] font-semibold text-emerald-300">
                    <CheckCircle2 size={11} />
                    Détecté
                  </span>
                )}
              </div>
            </div>

            {/* Terms */}
            <div className="px-1 pt-1">
              <p className="text-center text-[10px] leading-5 text-slate-500">
                En créant votre compte, vous acceptez les{" "}
                <Link
                  href="/legal/conditions"
                  className="font-medium text-emerald-300 underline decoration-emerald-300/30 underline-offset-2 transition-colors hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
                >
                  Conditions d'Utilisation
                </Link>{" "}
                et certifiez avoir plus de 18 ans.
              </p>
            </div>

            {/* Submit */}
            <DSButton
              type="submit"
              disabled={loading}
              className="group mt-1 flex w-full items-center justify-center gap-3 rounded-2xl py-4 font-semibold uppercase tracking-[0.14em] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
            >
              {loading ? (
                <>
                  <Loader2
                    size={19}
                    className="animate-spin"
                  />
                  <span>Création...</span>
                </>
              ) : (
                <>
                  <span>Créer mon compte</span>
                  <ArrowRight
                    size={18}
                    className="transition-transform duration-200 group-hover:translate-x-1"
                  />
                </>
              )}
            </DSButton>
          </form>

          {/* Login */}
          <div className="mt-7 border-t border-white/[0.06] pt-6 text-center">
            <p className="text-xs text-slate-500">
              Vous avez déjà un compte ?{" "}
              <Link
                href="/connexion"
                className="font-semibold text-emerald-300 underline decoration-emerald-300/30 underline-offset-4 transition-colors hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
              >
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </DSCard>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* SIDE PANEL                                                                  */
/* -------------------------------------------------------------------------- */

function SignupSidePanel() {
  return (
    <div className="relative hidden max-w-xl flex-1 md:block">
      <div className="relative">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/10 bg-emerald-400/[0.05] px-3 py-1.5">
          <ShieldCheck
            size={13}
            className="text-emerald-300"
          />
          <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-emerald-300/80">
            Espace sécurisé
          </span>
        </div>

        <h1 className="max-w-xl text-5xl font-semibold leading-[0.98] tracking-[-0.04em] text-white lg:text-6xl">
          Votre espace.
          <br />
          <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-emerald-200 bg-clip-text text-transparent">
            Votre identité.
          </span>
        </h1>

        <p className="mt-6 max-w-lg text-sm leading-7 text-slate-400">
          Un compte unique pour accéder à votre environnement
          ChifPam, conserver vos informations et utiliser les
          fonctionnalités disponibles sur la plateforme.
        </p>
      </div>

      <div className="mt-10 grid gap-3">
        {[
          {
            icon: ShieldCheck,
            title: "Protection des données",
            description:
              "Vos informations sont traitées dans un espace conçu pour rester privé.",
          },
          {
            icon: UserCircle,
            title: "Profil personnel",
            description:
              "Votre identité et vos préférences restent associées à votre compte.",
          },
          {
            icon: Lock,
            title: "Accès sécurisé",
            description:
              "Un système d'authentification protège l'accès à votre espace.",
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="group flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-400/15 hover:bg-white/[0.04]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/10 bg-emerald-400/[0.05]">
                <Icon
                  size={18}
                  className="text-emerald-300"
                />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-200">
                  {item.title}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-600">
        <div className="h-px w-8 bg-emerald-400/20" />
        CHIFPAM
        <div className="h-px flex-1 bg-white/[0.05]" />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                        */
/* -------------------------------------------------------------------------- */

export default function Inscription() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--slate-0)] text-slate-100">
      {/* Ambient background */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-[var(--grad-hero)]"
      />

      <ThreeSurface
        variant="auth"
        className="pointer-events-none fixed -right-20 top-12 z-0 h-[34rem] w-[38rem] opacity-35"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none fixed left-[8%] top-[20%] z-0 h-72 w-72 rounded-full bg-emerald-400/[0.035] blur-[110px]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none fixed bottom-[5%] right-[10%] z-0 h-72 w-72 rounded-full bg-cyan-400/[0.025] blur-[120px]"
      />

      {/* Technical grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage:
            "radial-gradient(ellipse at center, black 0%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 0%, transparent 75%)",
        }}
      />

      {/* Navigation */}
      <nav className="relative z-20 border-b border-white/[0.05]">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5 md:px-10 lg:px-12">
          <Link
            href="/"
            aria-label="Accueil ChifPam"
            className="rounded-xl outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-emerald-400/60"
          >
            <LogoChifPam />
          </Link>

          <Link
            href="/connexion"
            className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 outline-none transition-all duration-200 hover:border-emerald-400/20 hover:bg-white/[0.05] hover:text-white focus-visible:ring-2 focus-visible:ring-emerald-400/50"
          >
            Connexion
          </Link>
        </div>
      </nav>

      {/* Main */}
      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-77px)] w-full max-w-7xl items-center px-6 py-12 md:px-10 lg:px-12 lg:py-16">
        <div className="flex w-full flex-col items-center gap-12 lg:flex-row lg:justify-between lg:gap-20">
          <SignupSidePanel />

          <div className="w-full max-w-[440px]">
            <Suspense
              fallback={
                <div className="flex min-h-[500px] items-center justify-center">
                  <Loader2
                    size={32}
                    className="animate-spin text-emerald-300"
                  />
                </div>
              }
            >
              <SignupForm />
            </Suspense>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.05]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-7 text-[9px] font-medium uppercase tracking-[0.13em] text-slate-600 md:flex-row md:px-10 lg:px-12">
          <p>© 2026 ChifPam. Tous droits réservés.</p>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <Link
              href="/legal/confidentialite"
              className="transition-colors hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
            >
              Confidentialité
            </Link>

            <Link
              href="/legal/conditions"
              className="transition-colors hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
            >
              Conditions
            </Link>

            <Link
              href="/legal/mention-legales"
              className="flex items-center gap-1 transition-colors hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
            >
              <ScrollText size={11} />
              Mentions légales
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
                    }
