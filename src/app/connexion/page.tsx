"use client";

import React, {
  Suspense,
  useCallback,
  useEffect,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";
import { getHomeRouteForRole } from "@/lib/auth-routing";
import { normalizePhoneNumber } from "@/lib/phone";

import { useSearchParams } from "next/navigation";

import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Phone,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import Link from "next/link";

import { LogoChifPam } from "@/components/LogoChifPam";
import {
  DSButton,
  DSCard,
  DSInput,
} from "@/components/ui/primitives";

import ThreeSurface from "@/components/three/ThreeSurface";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                       */
/* -------------------------------------------------------------------------- */

interface ProfileData {
  is_banned: boolean | null;
  ban_reason: string | null;
  role: string | null;
}

/* -------------------------------------------------------------------------- */
/* PHONE                                                                       */
/* -------------------------------------------------------------------------- */

function formatPhonePreview(digits: string): string {
  if (!digits) return "";

  const first = digits.slice(0, 4);
  const second = digits.slice(4, 8);

  return second ? `${first} ${second}` : first;
}

/* -------------------------------------------------------------------------- */
/* SECURITY VISUAL                                                             */
/* -------------------------------------------------------------------------- */

function SecurityBadge() {
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06]">
      <ShieldCheck
        size={21}
        className="text-emerald-300"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* LOGIN FORM                                                                  */
/* -------------------------------------------------------------------------- */

function LoginFormContent() {
  const searchParams = useSearchParams();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [focused, setFocused] = useState<
    "phone" | "password" | null
  >(null);

  useEffect(() => {
    if (searchParams.get("signup") === "success") {
      setSuccessMessage(
        "Inscription réussie. Vous pouvez maintenant vous connecter."
      );
    }

    const authError =
      searchParams.get("auth_error");

    if (authError) {
      setErrorMessage(authError);
    }
  }, [searchParams]);

  const handlePhoneChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setPhone(
        event.target.value
          .replace(/\D/g, "")
          .slice(0, 8)
      );
    },
    []
  );

  const handleSupportRequest = async (
    reason: "banni" | "pass"
  ) => {
    if (loading) return;

    if (!/^\d{8}$/.test(phone)) {
      setErrorMessage(
        "Veuillez saisir votre numéro à 8 chiffres avant de contacter le support."
      );
      return;
    }

    setLoading(true);

    try {
      const ADMIN_PHONE = "50940451937";

      const intent =
        reason === "banni"
          ? "COMPTE SUSPENDU"
          : "MOT DE PASSE OUBLIÉ";

      const messageText =
        `Bonjour Support CHIF-PAM,\n\n` +
        `J'ai besoin d'aide concernant : ${intent}\n` +
        `Numéro : +509 ${phone}\n\n` +
        `Merci de m'aider à accéder à mon compte.`;

      const whatsappUrl =
        `https://api.whatsapp.com/send?phone=${ADMIN_PHONE}` +
        `&text=${encodeURIComponent(messageText)}`;

      window.open(
        whatsappUrl,
        "_blank",
        "noopener,noreferrer"
      );
    } catch {
      setErrorMessage(
        "Impossible d'ouvrir le support pour le moment."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (loading) return;

    setErrorMessage("");
    setSuccessMessage("");

    if (!/^\d{8}$/.test(phone)) {
      setErrorMessage(
        "Le numéro de téléphone doit contenir exactement 8 chiffres."
      );
      return;
    }

    if (!password) {
      setErrorMessage(
        "Veuillez entrer votre mot de passe."
      );
      return;
    }

    setLoading(true);

    try {
      /* -------------------------------------------------------------- */
      /* Resolve phone -> email                                         */
      /* -------------------------------------------------------------- */

      const resolveResponse = await fetch(
        "/api/auth/resolve-phone",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phone: normalizePhoneNumber(
              `+509${phone}`
            ),
          }),
        }
      );

      const resolved =
        (await resolveResponse.json()) as {
          success?: boolean;
          email?: string;
          message?: string;
        };

      if (
        !resolveResponse.ok ||
        !resolved.success ||
        !resolved.email
      ) {
        throw new Error(
          resolved.message ||
            "Numéro ou mot de passe incorrect."
        );
      }

      /* -------------------------------------------------------------- */
      /* Supabase authentication                                        */
      /* -------------------------------------------------------------- */

      const {
        data: authData,
        error: authError,
      } =
        await supabase.auth.signInWithPassword({
          email: resolved.email,
          password,
        });

      if (authError) {
        throw authError;
      }

      const user = authData?.user;

      if (!user) {
        throw new Error(
          "Impossible de créer la session."
        );
      }

      /* -------------------------------------------------------------- */
      /* Profile verification                                           */
      /* -------------------------------------------------------------- */

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(
          "is_banned, ban_reason, role"
        )
        .eq("id", user.id)
        .maybeSingle<ProfileData>();

      if (profileError) {
        await supabase.auth.signOut();

        throw new Error(
          "Impossible de vérifier les autorisations du profil."
        );
      }

      /* -------------------------------------------------------------- */
      /* Account suspension                                             */
      /* -------------------------------------------------------------- */

      if (profile?.is_banned) {
        await supabase.auth.signOut();

        setErrorMessage(
          `Compte suspendu : ${
            profile.ban_reason ||
            "Votre accès est actuellement suspendu."
          }`
        );

        return;
      }

      /* -------------------------------------------------------------- */
      /* Role routing                                                   */
      /* -------------------------------------------------------------- */

      const targetPath =
        getHomeRouteForRole(profile?.role);

      window.location.replace(targetPath);
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (
          err.message.includes(
            "Invalid login credentials"
          )
        ) {
          setErrorMessage(
            "Numéro ou mot de passe incorrect."
          );
        } else {
          setErrorMessage(err.message);
        }
      } else {
        setErrorMessage(
          "Identifiants incorrects ou service indisponible."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full">
      <DSCard className="relative overflow-hidden rounded-[28px] p-6 sm:p-8">
        {/* Top ambient light */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-emerald-400/[0.07] via-cyan-400/[0.025] to-transparent"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-cyan-400/[0.05] blur-3xl"
        />

        <div className="relative">
          {/* Mobile logo */}
          <div className="mb-7 flex justify-center md:hidden">
            <Link
              href="/"
              aria-label="Retour à l'accueil ChifPam"
              className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
            >
              <LogoChifPam />
            </Link>
          </div>

          {/* Header */}
          <div className="mb-7 flex items-start gap-4">
            <SecurityBadge />

            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300/80">
                Authentification
              </p>

              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-[28px]">
                Bon retour
              </h1>

              <p className="mt-1.5 text-sm leading-5 text-slate-500">
                Connectez-vous à votre espace ChifPam.
              </p>
            </div>
          </div>

          {/* Success */}
          {successMessage && (
            <div
              role="status"
              className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] p-4 text-sm text-emerald-200"
            >
              <CheckCircle2
                size={18}
                className="mt-0.5 shrink-0 text-emerald-400"
              />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error */}
          {errorMessage && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-400/15 bg-rose-400/[0.06] p-4 text-sm text-rose-200"
            >
              <AlertCircle
                size={18}
                className="mt-0.5 shrink-0 text-rose-400"
              />
              <span>{errorMessage}</span>
            </div>
          )}

          <form
            onSubmit={handleLogin}
            className="relative space-y-5"
          >
            {/* Phone */}
            <div className="space-y-2">
              <label
                htmlFor="login-phone"
                className="ml-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400"
              >
                Téléphone
              </label>

              <div
                className={`group relative rounded-2xl transition-shadow duration-200 ${
                  focused === "phone"
                    ? "shadow-[0_0_0_3px_rgba(110,231,200,0.08)]"
                    : ""
                }`}
              >
                <Phone
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-emerald-300"
                />

                <span className="pointer-events-none absolute left-11 top-1/2 z-10 -translate-y-1/2 border-r border-white/10 pr-3 text-sm font-semibold text-slate-400">
                  +509
                </span>

                <DSInput
                  id="login-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="0000 0000"
                  value={phone}
                  onChange={handlePhoneChange}
                  onFocus={() =>
                    setFocused("phone")
                  }
                  onBlur={() => setFocused(null)}
                  maxLength={8}
                  required
                  disabled={loading}
                  className="rounded-2xl py-4 pl-[92px] pr-14 font-medium tracking-[0.12em] transition-[border,box-shadow] duration-200 focus-visible:ring-2 focus-visible:ring-emerald-400/25"
                />

                {phone.length > 0 && (
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-semibold tabular-nums text-slate-600">
                    {phone.length}/8
                  </span>
                )}
              </div>

              <div className="flex min-h-4 items-center justify-between px-1">
                <p className="text-[10px] text-slate-600">
                  {phone
                    ? `+509 ${formatPhonePreview(phone)}`
                    : "Numéro utilisé lors de l'inscription"}
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
                htmlFor="login-password"
                className="ml-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400"
              >
                Mot de passe
              </label>

              <div
                className={`group relative rounded-2xl transition-shadow duration-200 ${
                  focused === "password"
                    ? "shadow-[0_0_0_3px_rgba(110,231,200,0.08)]"
                    : ""
                }`}
              >
                <Lock
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-emerald-300"
                />

                <DSInput
                  id="login-password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  autoComplete="current-password"
                  placeholder="Votre mot de passe"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  onFocus={() =>
                    setFocused("password")
                  }
                  onBlur={() => setFocused(null)}
                  required
                  disabled={loading}
                  className="rounded-2xl py-4 pl-12 pr-12 font-medium transition-[border,box-shadow] duration-200 focus-visible:ring-2 focus-visible:ring-emerald-400/25"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (value) => !value
                    )
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
            </div>

            {/* Submit */}
            <DSButton
              type="submit"
              disabled={loading}
              className="group mt-2 flex w-full items-center justify-center gap-3 rounded-2xl py-4 font-semibold uppercase tracking-[0.14em] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
            >
              {loading ? (
                <>
                  <Loader2
                    size={19}
                    className="animate-spin"
                  />
                  <span>Connexion...</span>
                </>
              ) : (
                <>
                  <span>Se connecter</span>
                  <ArrowRight
                    size={18}
                    className="transition-transform duration-200 group-hover:translate-x-1"
                  />
                </>
              )}
            </DSButton>
          </form>

          {/* Support */}
          <div className="mt-6 flex items-center justify-center gap-5 border-t border-white/[0.06] pt-5">
            <button
              type="button"
              onClick={() =>
                handleSupportRequest("pass")
              }
              disabled={loading}
              className="flex items-center gap-2 rounded-lg text-[10px] font-medium uppercase tracking-[0.1em] text-slate-500 outline-none transition-colors hover:text-emerald-300 focus-visible:ring-2 focus-visible:ring-emerald-400/50 disabled:opacity-50"
            >
              <KeyRound size={13} />
              Mot de passe oublié
            </button>

            <span className="h-4 w-px bg-white/[0.08]" />

            <button
              type="button"
              onClick={() =>
                handleSupportRequest("banni")
              }
              disabled={loading}
              className="flex items-center gap-2 rounded-lg text-[10px] font-medium uppercase tracking-[0.1em] text-slate-500 outline-none transition-colors hover:text-rose-300 focus-visible:ring-2 focus-visible:ring-rose-400/50 disabled:opacity-50"
            >
              <ShieldAlert size={13} />
              Accès suspendu
            </button>
          </div>

          {/* Register */}
          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500">
              Vous n'avez pas encore de compte ?{" "}
              <Link
                href="/inscription"
                className="font-semibold text-emerald-300 underline decoration-emerald-300/30 underline-offset-4 transition-colors hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
              >
                Créer un compte
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

function LoginSidePanel() {
  return (
    <div className="relative hidden max-w-xl flex-1 md:block">
      <div className="relative">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/10 bg-cyan-400/[0.045] px-3 py-1.5">
          <UserRound
            size={13}
            className="text-cyan-300"
          />

          <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-300/80">
            Espace personnel
          </span>
        </div>

        <h1 className="max-w-xl text-5xl font-semibold leading-[0.98] tracking-[-0.04em] text-white lg:text-6xl">
          Continuez là où
          <br />
          <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-emerald-200 bg-clip-text text-transparent">
            vous vous êtes arrêté.
          </span>
        </h1>

        <p className="mt-6 max-w-lg text-sm leading-7 text-slate-400">
          Retrouvez votre espace ChifPam avec une
          authentification simple et sécurisée.
        </p>
      </div>

      {/* System cards */}
      <div className="mt-10 grid gap-3">
        <div className="group rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-400/15 hover:bg-white/[0.04]">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/10 bg-emerald-400/[0.05]">
              <Lock
                size={18}
                className="text-emerald-300"
              />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-200">
                Connexion sécurisée
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Votre session est protégée par le système
                d'authentification de la plateforme.
              </p>
            </div>
          </div>
        </div>

        <div className="group rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-400/15 hover:bg-white/[0.04]">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/10 bg-cyan-400/[0.05]">
              <ShieldCheck
                size={18}
                className="text-cyan-300"
              />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-200">
                Contrôle d'accès
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Les autorisations de votre compte sont
                vérifiées avant l'accès à votre espace.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Minimal system indicator */}
      <div className="mt-8 flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-600">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/40" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400/70" />
        </span>

        Système d'accès ChifPam

        <div className="h-px flex-1 bg-white/[0.05]" />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                        */
/* -------------------------------------------------------------------------- */

export default function Connexion() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--slate-0)] text-slate-100">
      {/* Main background */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-[var(--grad-hero)]"
      />

      {/* Three.js ambient surface */}
      <ThreeSurface
        variant="auth"
        className="pointer-events-none fixed -right-20 top-0 z-0 h-full w-[55%] opacity-30"
      />

      {/* Ambient lights */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed left-[5%] top-[18%] z-0 h-72 w-72 rounded-full bg-emerald-400/[0.035] blur-[120px]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none fixed bottom-[10%] right-[10%] z-0 h-80 w-80 rounded-full bg-cyan-400/[0.025] blur-[130px]"
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
            href="/inscription"
            className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 outline-none transition-all duration-200 hover:border-emerald-400/20 hover:bg-white/[0.05] hover:text-white focus-visible:ring-2 focus-visible:ring-emerald-400/50"
          >
            Créer un compte
          </Link>
        </div>
      </nav>

      {/* Main */}
      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-77px)] w-full max-w-7xl items-center px-6 py-12 md:px-10 lg:px-12 lg:py-16">
        <div className="flex w-full flex-col items-center gap-12 lg:flex-row lg:justify-between lg:gap-20">
          <LoginSidePanel />

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
              <LoginFormContent />
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
