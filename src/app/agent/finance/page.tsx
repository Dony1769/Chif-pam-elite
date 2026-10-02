"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  Clock3,
  Copy,
  Loader2,
  Smartphone,
  Upload,
  Wallet,
  XCircle,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import {
  FINANCE_PAYMENT_METHODS,
  type FinancePaymentMethod,
} from "@/lib/constants/finance";
import { ClientFinanceService } from "@/services/client/finance";
import {
  DSButton,
  DSCard,
  DSInput,
  DSLoader,
  DSPage,
} from "@/components/ui/primitives";

type FinanceMode = "deposit" | "withdrawal";

type Transaction = {
  id: string;
  amount: number;
  type: "deposit" | "depot" | "withdrawal" | "retrait";
  status: string;
  created_at: string;
};

type FinanceMessage = {
  ok: boolean;
  text: string;
};

type Balance = {
  available: number;
  locked: number;
};

const MIN_DEPOSIT_AMOUNT = 25;
const MIN_WITHDRAWAL_AMOUNT = 100;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
] as const;

const PAYMENT_NUMBERS: Record<FinancePaymentMethod, string> = {
  NatCash: "+509 4045 1937",
  MonCash: "+509 4719 3408",
};

const TRANSACTION_LIMIT = 20;

const formatAmount = (amount: number) =>
  amount.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const formatDate = (value: string) =>
  new Date(value).toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });

const isDeposit = (type: Transaction["type"]) =>
  type === "deposit" || type === "depot";

const getTransactionStatus = (status: string) => {
  switch (status) {
    case "approved":
      return {
        label: "Approuvé",
        className: "text-emerald-300",
      };

    case "rejected":
      return {
        label: "Refusé",
        className: "text-red-300",
      };

    default:
      return {
        label: "En attente",
        className: "text-amber-300",
      };
  }
};

function TransactionItem({
  transaction,
}: {
  transaction: Transaction;
}) {
  const deposit = isDeposit(transaction.type);
  const status = getTransactionStatus(transaction.status);

  return (
    <div className="group flex items-center justify-between gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3.5 transition-colors duration-200 hover:border-white/[0.12] hover:bg-white/[0.045]">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
            deposit
              ? "border-emerald-300/15 bg-emerald-300/[0.08]"
              : "border-amber-300/15 bg-amber-300/[0.08]"
          }`}
        >
          {deposit ? (
            <ArrowUpCircle
              size={18}
              strokeWidth={2}
              className="text-emerald-300"
            />
          ) : (
            <ArrowDownCircle
              size={18}
              strokeWidth={2}
              className="text-amber-300"
            />
          )}
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">
            {deposit ? "Dépôt" : "Retrait"}
          </p>

          <p className="mt-0.5 text-[11px] text-slate-500">
            {formatDate(transaction.created_at)}
          </p>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-sm font-black tracking-tight text-white">
          {formatAmount(Number(transaction.amount))} HTG
        </p>

        <p className={`mt-0.5 text-[11px] font-bold ${status.className}`}>
          {status.label}
        </p>
      </div>
    </div>
  );
}

export default function AgentFinancePage() {
  const prefersReducedMotion = useReducedMotion();

  const [mode, setMode] = useState<FinanceMode>("deposit");
  const [method, setMethod] = useState<FinancePaymentMethod>(
    FINANCE_PAYMENT_METHODS[0],
  );

  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [balance, setBalance] = useState<Balance>({
    available: 0,
    locked: 0,
  });

  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<FinanceMessage | null>(null);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /*
   * Empêche plusieurs refreshs Realtime simultanés.
   * Supabase peut recevoir plusieurs événements rapprochés
   * lorsqu'un profil/une transaction évolue.
   */
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const selectedPaymentNumber = useMemo(
    () => PAYMENT_NUMBERS[method],
    [method],
  );

  const minimumAmount =
    mode === "deposit" ? MIN_DEPOSIT_AMOUNT : MIN_WITHDRAWAL_AMOUNT;

  const loadFinance = useCallback(async () => {
    if (!mountedRef.current) return;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      if (!mountedRef.current) return;

      setMessage({
        ok: false,
        text: "Session agent introuvable.",
      });
      setLoading(false);
      return;
    }

    const [profileResult, transactionsResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("balance, locked_balance")
        .eq("id", user.id)
        .maybeSingle(),

      supabase
        .from("transactions")
        .select("id, amount, type, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(TRANSACTION_LIMIT),
    ]);

    if (!mountedRef.current) return;

    if (profileResult.error) {
      setMessage({
        ok: false,
        text: profileResult.error.message,
      });
    } else {
      const total = Number(profileResult.data?.balance ?? 0);
      const locked = Number(profileResult.data?.locked_balance ?? 0);

      setBalance({
        available: Math.max(0, total - locked),
        locked: Math.max(0, locked),
      });
    }

    if (transactionsResult.error) {
      setMessage({
        ok: false,
        text: "Impossible de charger l'historique financier.",
      });
    } else {
      setTransactions((transactionsResult.data ?? []) as Transaction[]);
    }

    setLoading(false);
  }, []);

  /*
   * Un seul refresh différé pour une rafale d'événements Realtime.
   * Cela évite les appels réseau en cascade et les micro-freezes.
   */
  const scheduleFinanceRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null;
      void loadFinance();
    }, 180);
  }, [loadFinance]);

  useEffect(() => {
    mountedRef.current = true;

    void loadFinance();

    return () => {
      mountedRef.current = false;

      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }

      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = null;
      }
    };
  }, [loadFinance]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const subscribe = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || cancelled || !mountedRef.current) return;

      channel = supabase
        .channel(`agent-finance-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${user.id}`,
          },
          scheduleFinanceRefresh,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "transactions",
            filter: `user_id=eq.${user.id}`,
          },
          scheduleFinanceRefresh,
        )
        .subscribe();
    };

    void subscribe();

    return () => {
      cancelled = true;

      if (channel) {
        void supabase.removeChannel(channel);
        channel = null;
      }
    };
  }, [scheduleFinanceRefresh]);

  const resetForm = useCallback(() => {
    setAmount("");
    setPhone("");
    setFile(null);
    setCopied(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const selectMode = useCallback(
    (nextMode: FinanceMode) => {
      if (nextMode === mode) return;

      setMode(nextMode);
      setMessage(null);
      resetForm();
    },
    [mode, resetForm],
  );

  const copyPaymentNumber = useCallback(async () => {
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }

    try {
      await navigator.clipboard.writeText(selectedPaymentNumber);

      if (!mountedRef.current) return;

      setCopied(true);

      copyTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setCopied(false);
        }
      }, 2000);
    } catch {
      setMessage({
        ok: false,
        text: "Impossible de copier automatiquement le numéro.",
      });
    }
  }, [selectedPaymentNumber]);

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0];

      if (!selectedFile) {
        setFile(null);
        return;
      }

      if (
        !ALLOWED_IMAGE_TYPES.includes(
          selectedFile.type as (typeof ALLOWED_IMAGE_TYPES)[number],
        )
      ) {
        setFile(null);
        setMessage({
          ok: false,
          text: "Format non supporté. Utilisez JPG, PNG, WEBP ou HEIC.",
        });

        event.target.value = "";
        return;
      }

      if (selectedFile.size > MAX_FILE_SIZE) {
        setFile(null);
        setMessage({
          ok: false,
          text: "La preuve de paiement ne doit pas dépasser 5 Mo.",
        });

        event.target.value = "";
        return;
      }

      setMessage(null);
      setFile(selectedFile);
    },
    [],
  );

  const submit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (submitting) return;

      const numericAmount =
        Math.round(Number.parseFloat(amount.replace(",", ".")) * 100) / 100;

      const cleanPhone = phone.replace(/\D/g, "");

      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        setMessage({
          ok: false,
          text: "Saisissez un montant valide.",
        });
        return;
      }

      if (numericAmount < minimumAmount) {
        setMessage({
          ok: false,
          text: `Le ${
            mode === "deposit" ? "dépôt" : "retrait"
          } minimum est de ${minimumAmount} HTG.`,
        });
        return;
      }

      if (mode === "deposit" && !file) {
        setMessage({
          ok: false,
          text: "Ajoutez une preuve de paiement.",
        });
        return;
      }

      if (mode === "withdrawal" && cleanPhone.length !== 8) {
        setMessage({
          ok: false,
          text: "Le numéro doit contenir 8 chiffres.",
        });
        return;
      }

      if (mode === "withdrawal" && numericAmount > balance.available) {
        setMessage({
          ok: false,
          text: "Solde disponible insuffisant.",
        });
        return;
      }

      setSubmitting(true);
      setMessage(null);

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          throw new Error("Votre session a expiré.");
        }

        if (mode === "deposit") {
          if (!file) {
            throw new Error("Ajoutez une preuve de paiement.");
          }

          const extension =
            file.name
              .split(".")
              .pop()
              ?.toLowerCase()
              .replace(/[^a-z0-9]/g, "") || "png";

          const path = `proofs/${user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

          const { error: uploadError } = await supabase.storage
            .from("payment-proofs")
            .upload(path, file, {
              cacheControl: "3600",
              upsert: false,
            });

          if (uploadError) {
            throw new Error(
              "Échec de l'envoi de la preuve de paiement.",
            );
          }

          const result = await ClientFinanceService.submitDeposit(
            numericAmount,
            method,
            path,
          );

          if (!result.success) {
            throw new Error(result.message);
          }

          setMessage({
            ok: true,
            text: result.message || "Demande de dépôt envoyée.",
          });
        } else {
          const result = await ClientFinanceService.submitWithdrawal(
            numericAmount,
            method,
            cleanPhone,
          );

          if (!result.success) {
            throw new Error(result.message);
          }

          setMessage({
            ok: true,
            text: result.message || "Demande de retrait envoyée.",
          });
        }

        resetForm();
        await loadFinance();
      } catch (error) {
        if (!mountedRef.current) return;

        setMessage({
          ok: false,
          text:
            error instanceof Error
              ? error.message
              : "La demande a échoué.",
        });
      } finally {
        if (mountedRef.current) {
          setSubmitting(false);
        }
      }
    },
    [
      amount,
      balance.available,
      file,
      loadFinance,
      method,
      minimumAmount,
      mode,
      phone,
      resetForm,
      submitting,
    ],
  );

  if (loading) {
    return (
      <DSPage className="mx-auto max-w-5xl px-4 py-10">
        <DSLoader label="Chargement du portefeuille agent..." />
      </DSPage>
    );
  }

  return (
    <DSPage className="relative mx-auto max-w-5xl overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      {/* Atmosphère premium statique : aucun moteur d'animation continu. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] overflow-hidden"
      >
        <div className="absolute left-[12%] top-[-180px] h-[360px] w-[360px] rounded-full bg-emerald-400/[0.045] blur-3xl" />
        <div className="absolute right-[8%] top-[-220px] h-[420px] w-[420px] rounded-full bg-cyan-400/[0.025] blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/20 to-transparent" />
      </div>

      <motion.header
        initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : { duration: 0.35, ease: "easeOut" }
        }
        className="mb-6"
      >
        <div className="flex items-center gap-2">
          <span className="h-px w-8 bg-emerald-300/70" />
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-emerald-300">
            Finance agent
          </p>
        </div>

        <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
          Dépôts et retraits
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          Gérez les fonds de votre compte agent depuis cet espace sécurisé.
        </p>
      </motion.header>

      {/* Balance */}
      <DSCard className="relative mb-5 overflow-hidden border-white/[0.08] bg-white/[0.035] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.16)] sm:p-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-[-70px] top-[-90px] h-52 w-52 rounded-full bg-emerald-300/[0.06] blur-3xl"
        />

        <div className="relative flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
              Disponible
            </p>

            <p className="mt-2 text-3xl font-black tracking-tight text-emerald-200 sm:text-4xl">
              {formatAmount(balance.available)}{" "}
              <span className="text-base font-bold text-emerald-300/70">
                HTG
              </span>
            </p>

            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-300/70" />
              Bloqué : {formatAmount(balance.locked)} HTG
            </div>
          </div>

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.07]">
            <Wallet
              size={24}
              strokeWidth={1.8}
              className="text-emerald-300"
            />
          </div>
        </div>
      </DSCard>

      {/* Mode selector */}
      <div
        className="relative z-10 mb-5 grid gap-3 sm:grid-cols-2"
        role="group"
        aria-label="Choisir une opération financière"
      >
        <button
          type="button"
          aria-pressed={mode === "deposit"}
          onClick={() => selectMode("deposit")}
          className={`group relative min-h-[126px] overflow-hidden rounded-2xl border p-5 text-left outline-none transition-[border-color,background-color,box-shadow,transform] duration-200 focus-visible:ring-2 focus-visible:ring-emerald-300/70 ${
            mode === "deposit"
              ? "border-emerald-300/45 bg-emerald-300/[0.075] shadow-[0_12px_36px_rgba(52,211,153,0.08)]"
              : "border-white/[0.08] bg-white/[0.025] hover:border-emerald-300/25 hover:bg-white/[0.04]"
          }`}
        >
          <div
            className={`absolute right-[-35px] top-[-35px] h-28 w-28 rounded-full blur-2xl transition-opacity duration-200 ${
              mode === "deposit"
                ? "bg-emerald-300/10 opacity-100"
                : "opacity-0"
            }`}
          />

          <div className="relative">
            <ArrowUpCircle
              size={25}
              strokeWidth={1.8}
              className="text-emerald-300"
            />

            <p className="mt-4 font-black tracking-tight text-white">
              Déposer des fonds
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-400">
              Avec preuve de paiement, minimum {MIN_DEPOSIT_AMOUNT} HTG
            </p>
          </div>
        </button>

        <button
          type="button"
          aria-pressed={mode === "withdrawal"}
          onClick={() => selectMode("withdrawal")}
          className={`group relative min-h-[126px] overflow-hidden rounded-2xl border p-5 text-left outline-none transition-[border-color,background-color,box-shadow,transform] duration-200 focus-visible:ring-2 focus-visible:ring-amber-300/70 ${
            mode === "withdrawal"
              ? "border-amber-300/45 bg-amber-300/[0.075] shadow-[0_12px_36px_rgba(251,191,36,0.07)]"
              : "border-white/[0.08] bg-white/[0.025] hover:border-amber-300/25 hover:bg-white/[0.04]"
          }`}
        >
          <div
            className={`absolute right-[-35px] top-[-35px] h-28 w-28 rounded-full blur-2xl transition-opacity duration-200 ${
              mode === "withdrawal"
                ? "bg-amber-300/10 opacity-100"
                : "opacity-0"
            }`}
          />

          <div className="relative">
            <ArrowDownCircle
              size={25}
              strokeWidth={1.8}
              className="text-amber-300"
            />

            <p className="mt-4 font-black tracking-tight text-white">
              Retirer des fonds
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-400">
              Vers un portefeuille mobile, minimum {MIN_WITHDRAWAL_AMOUNT} HTG
            </p>
          </div>
        </button>
      </div>

      {/* Feedback */}
      {message && (
        <div
          role="status"
          aria-live="polite"
          className={`mb-5 flex items-start gap-3 rounded-2xl border p-4 text-sm ${
            message.ok
              ? "border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-200"
              : "border-red-300/20 bg-red-300/[0.07] text-red-200"
          }`}
        >
          <div className="mt-0.5 shrink-0">
            {message.ok ? (
              <CheckCircle2 size={18} />
            ) : (
              <XCircle size={18} />
            )}
          </div>

          <span className="leading-5">{message.text}</span>
        </div>
      )}

      {/* Main form */}
      <DSCard className="relative z-10 mb-5 border-white/[0.08] bg-white/[0.035] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.14)] sm:p-6">
        <form onSubmit={submit} className="space-y-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
              {mode === "deposit"
                ? "Formulaire de dépôt"
                : "Formulaire de retrait"}
            </p>

            <h2 className="mt-1 text-xl font-black tracking-tight text-white">
              {mode === "deposit"
                ? "Ajouter des fonds"
                : "Demander un retrait"}
            </h2>
          </div>

          {/* Payment methods */}
          <div
            className="grid grid-cols-2 gap-2"
            role="group"
            aria-label="Méthode de paiement"
          >
            {FINANCE_PAYMENT_METHODS.map((item) => {
              const selected = method === item;

              return (
                <button
                  type="button"
                  key={item}
                  aria-pressed={selected}
                  onClick={() => {
                    setMethod(item);
                    setMessage(null);
                  }}
                  className={`rounded-xl border px-3 py-3 text-sm font-black outline-none transition-[border-color,background-color,color] duration-200 focus-visible:ring-2 focus-visible:ring-emerald-300/60 ${
                    selected
                      ? "border-emerald-300/40 bg-emerald-300/[0.08] text-emerald-200"
                      : "border-white/[0.08] bg-white/[0.02] text-slate-400 hover:border-white/[0.16] hover:text-slate-200"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>

          {/* Deposit payment number */}
          {mode === "deposit" && (
            <div>
              <p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                <Smartphone size={14} />
                Numéro de dépôt
              </p>

              <button
                type="button"
                onClick={copyPaymentNumber}
                className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.055] px-4 py-3.5 text-left outline-none transition-[border-color,background-color] duration-200 hover:border-emerald-300/40 hover:bg-emerald-300/[0.08] focus-visible:ring-2 focus-visible:ring-emerald-300/60"
                aria-label={`Copier le numéro ${selectedPaymentNumber}`}
              >
                <span className="font-black tracking-[0.12em] text-white">
                  {selectedPaymentNumber}
                </span>

                {copied ? (
                  <CheckCircle2
                    size={18}
                    className="shrink-0 text-emerald-300"
                  />
                ) : (
                  <Copy
                    size={18}
                    className="shrink-0 text-slate-400 transition-colors group-hover:text-emerald-300"
                  />
                )}
              </button>

              <p className="mt-2 text-[11px] text-slate-500">
                Cliquez sur le numéro pour le copier.
              </p>
            </div>
          )}

          {mode === "withdrawal" && (
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 text-xs text-slate-400">
              <Smartphone size={15} className="shrink-0 text-amber-300" />
              <span>
                Méthode de retrait :{" "}
                <strong className="text-slate-200">{method}</strong>
              </span>
            </div>
          )}

          {/* Amount */}
          <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            Montant (HTG)

            <DSInput
              type="number"
              min={minimumAmount}
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                if (message) setMessage(null);
              }}
              className="mt-2"
              placeholder={mode === "deposit" ? "Ex : 250" : "Ex : 500"}
              aria-label="Montant en HTG"
            />
          </label>

          {/* Deposit proof */}
          {mode === "deposit" ? (
            <label
              className={`group flex min-h-[130px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed p-6 text-center transition-[border-color,background-color] duration-200 ${
                file
                  ? "border-emerald-300/30 bg-emerald-300/[0.045]"
                  : "border-white/[0.12] bg-slate-950/30 hover:border-emerald-300/30 hover:bg-white/[0.025]"
              }`}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-300/15 bg-emerald-300/[0.06]">
                {file ? (
                  <CheckCircle2
                    size={21}
                    className="text-emerald-300"
                  />
                ) : (
                  <Upload
                    size={21}
                    className="text-emerald-300 transition-transform duration-200 group-hover:-translate-y-0.5"
                  />
                )}
              </div>

              <span className="max-w-full truncate px-4 text-xs font-semibold text-slate-300">
                {file?.name ||
                  "Importer la preuve de paiement · 5 Mo maximum"}
              </span>

              {file && (
                <span className="mt-1 text-[10px] text-emerald-300/70">
                  {(file.size / 1024 / 1024).toFixed(2)} Mo
                </span>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_IMAGE_TYPES.join(",")}
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          ) : (
            <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              Numéro récepteur

              <DSInput
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={8}
                value={phone}
                onChange={(event) => {
                  setPhone(
                    event.target.value
                      .replace(/\D/g, "")
                      .slice(0, 8),
                  );

                  if (message) setMessage(null);
                }}
                className="mt-2"
                placeholder="0000 0000"
                aria-label="Numéro du récepteur"
              />
            </label>
          )}

          <DSButton
            type="submit"
            disabled={submitting}
            className="w-full"
          >
            {submitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CheckCircle2 size={16} />
            )}

            {submitting
              ? "Validation..."
              : mode === "deposit"
                ? "Confirmer le dépôt"
                : "Confirmer le retrait"}
          </DSButton>
        </form>
      </DSCard>

      {/* Transaction history */}
      <DSCard className="relative z-10 border-white/[0.08] bg-white/[0.03] p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-px w-5 bg-slate-600" />
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                Suivi
              </p>
            </div>

            <h2 className="mt-1 text-xl font-black tracking-tight text-white">
              Historique financier
            </h2>
          </div>

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025]">
            <Clock3 size={18} className="text-slate-500" />
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.015] px-5 py-10 text-center">
            <Clock3
              size={24}
              className="mx-auto mb-3 text-slate-600"
            />

            <p className="text-sm font-semibold text-slate-400">
              Aucune transaction récente.
            </p>

            <p className="mt-1 text-xs text-slate-600">
              Vos opérations apparaîtront ici.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {transactions.map((transaction) => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
              />
            ))}
          </div>
        )}
      </DSCard>
    </DSPage>
  );
    }
