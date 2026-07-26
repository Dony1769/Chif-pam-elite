"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  ArrowLeft,
  BarChart3,
  Bell,
  ChevronRight,
  Crown,
  Gift,
  Home,
  LayoutDashboard,
  MessageSquare,
  Shield,
  ShoppingBag,
  Sparkles,
  Ticket,
  Trophy,
  User,
  Users,
  Wallet,
  X,
  Send,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { ChatService } from "@/services/chat";
import { ChatMessage, parseMessageContent } from "@/types/chat";

// Initialisation du client Supabase pour le badge temps réel
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type ShellNavItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

const adminItems: ShellNavItem[] = [
  { href: "/admin-chif-pam/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  { href: "/admin-chif-pam/analytics", label: "Analytics", icon: <BarChart3 size={18} /> },
  { href: "/admin-chif-pam/challenges", label: "Défis", icon: <Trophy size={18} /> },
  { href: "/admin-chif-pam/coupon", label: "Coupons", icon: <Ticket size={18} /> },
  { href: "/admin-chif-pam/demandes", label: "Demandes", icon: <Wallet size={18} /> },
  { href: "/admin-chif-pam/users", label: "Utilisateurs", icon: <Users size={18} /> },
  { href: "/admin-chif-pam/chat", label: "Support", icon: <MessageSquare size={18} /> },
  { href: "/admin-chif-pam/notifications", label: "Notifications", icon: <Bell size={18} /> },
];

// REVISION : /client/chat remplacé par /client/profile
const clientItems: ShellNavItem[] = [
  { href: "/client/home", label: "Accueil", icon: <Home size={18} /> },
  { href: "/client/rewards", label: "Récompenses", icon: <Gift size={18} /> },
  { href: "/client/challenges", label: "Défis", icon: <Shield size={18} /> },
  { href: "/client/market", label: "Offres", icon: <ShoppingBag size={18} /> },
  { href: "/client/profile", label: "Profil", icon: <User size={18} /> },
  { href: "/client/vip", label: "VIP", icon: <Crown size={18} /> },
];

function BrandMark() {
  return (
    <div className="relative grid h-10 w-10 place-items-center rounded-2xl border border-white/15 bg-white/5 shadow-[0_0_40px_rgba(67,244,213,0.22)]">
      <Sparkles size={18} className="text-(--accent)" />
      <span className="pointer-events-none absolute inset-0 rounded-2xl bg-linear-to-br from-emerald-300/20 via-transparent to-cyan-300/20" />
    </div>
  );
}

function ShellNav({ items, compact = false }: { items: ShellNavItem[]; compact?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className={cn(compact ? "flex items-center justify-between gap-1" : "space-y-2")}>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              compact
                ? "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1.5 py-2 text-[9px] font-semibold uppercase tracking-[0.1em] transition-all duration-300"
                : "group relative flex items-center gap-3 overflow-hidden rounded-2xl border px-3.5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] transition-all duration-300",
              active
                ? compact
                  ? "bg-emerald-400/15 text-emerald-200 shadow-[0_10px_25px_rgba(16,185,129,0.2)]"
                  : "border-(--accent-border) bg-linear-to-r from-emerald-300/18 via-cyan-300/10 to-transparent text-(--fg-1) shadow-[0_14px_35px_rgba(45,205,164,0.2)]"
                : compact
                  ? "bg-white/4 text-(--fg-4) hover:bg-white/8 hover:text-(--fg-2)"
                  : "border-white/8 bg-white/2 text-(--fg-3) hover:border-white/18 hover:bg-white/4 hover:text-(--fg-2)"
            )}
          >
            <span className={cn("transition-transform duration-300", active ? "text-(--accent)" : compact ? "opacity-85" : "group-hover:scale-105")}>
              {item.icon}
            </span>
            <span className="leading-none truncate">{item.label}</span>
            {!compact && (
              <>
                <ChevronRight size={14} className={cn("transition-transform duration-300", active ? "translate-x-0 text-(--accent)" : "-translate-x-1 opacity-30 group-hover:translate-x-0 group-hover:opacity-80")} />
                {active ? <span className="absolute inset-y-2 left-1 w-0.5 rounded-full bg-(--accent)" /> : null}
              </>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function SectionHeadline({ role }: { role: "admin" | "client" }) {
  const pathname = usePathname();
  const section = pathname.split("/").pop()?.replace(/-/g, " ") || "home";
  const title = role === "admin" ? "Admin Control" : "Client Experience";

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-(--fg-4)">{role} zone</p>
      <h1 className="mt-1 text-xl font-semibold tracking-tight text-(--fg-1)">
        {title}
        <span className="ml-2 text-(--accent)">/ {section}</span>
      </h1>
    </div>
  );
}

/**
 * Composant de Bulle de Chat Flottante (Client)
 * Gère le badge de messages non lus en Temps Réel et l'ouverture d'un popup de support.
 */
function FloatingChatBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");

  // 1. Authentification & Récupération de l'utilisateur
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUserId(data.user.id);
      }
    });
  }, []);

  // 2. Chargement des messages et comptage des non-lus
  const loadChatData = async (uid: string) => {
    const msgs = await ChatService.fetchMessagesForClient(supabase, uid);
    setMessages(msgs);

    const unread = msgs.filter((m) => m.is_admin_message && !m.is_read_by_client).length;
    setUnreadCount(unread);
  };

  useEffect(() => {
    if (!userId) return;

    loadChatData(userId);

    // Écoute en temps réel des nouveaux messages
    const channel = ChatService.subscribeToClientMessages(supabase, userId, (newMsg) => {
      setMessages((prev) => [...prev, newMsg]);
      if (newMsg.is_admin_message) {
        setUnreadCount((prev) => prev + 1);
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // 3. Action à l'ouverture du chat
  const handleOpenToggle = async () => {
    const nextState = !isOpen;
    setIsOpen(nextState);

    if (nextState && userId && unreadCount > 0) {
      await ChatService.markConversationReadByClient(supabase, userId);
      setUnreadCount(0);
    }
  };

  // 4. Envoi rapide d'un message texte
  const handleSend = async () => {
    if (!inputText.trim() || !userId) return;
    const textToSend = inputText;
    setInputText("");

    try {
      await ChatService.sendTextMessage(supabase, userId, textToSend, false);
      loadChatData(userId);
    } catch (err) {
      console.error("Erreur d'envoi du message:", err);
    }
  };

  return (
    <div className="fixed bottom-20 left-4 z-50 md:bottom-6 md:left-6">
      {/* Fenêtre Popup de Chat */}
      {isOpen && (
        <div className="mb-3 flex h-[420px] w-[320px] flex-col overflow-hidden rounded-3xl border border-white/15 bg-slate-950/95 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl sm:w-[360px]">
          {/* Entête du Popup */}
          <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-wider text-white">Support ChifPam</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white">
              <X size={16} />
            </button>
          </div>

          {/* Liste des messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
            {messages.length === 0 ? (
              <p className="text-center text-white/40 pt-10">Un problème ? Posez votre question ici à l&apos;équipe support.</p>
            ) : (
              messages.map((m) => {
                const parsed = parseMessageContent(m.content);
                const isClientMsg = !m.is_admin_message;

                return (
                  <div key={m.id} className={cn("flex flex-col max-w-[80%]", isClientMsg ? "ml-auto items-end" : "mr-auto items-start")}>
                    <div className={cn("rounded-2xl px-3 py-2 text-white", isClientMsg ? "bg-emerald-600/80 rounded-br-none" : "bg-white/10 rounded-bl-none")}>
                      {parsed.type === "image" ? <img src={parsed.url} alt="Attachment" className="max-w-full rounded-lg" /> : parsed.text}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Saisie rapide */}
          <div className="border-t border-white/10 p-2 bg-white/5 flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Écrivez votre message..."
              className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
            />
            <button onClick={handleSend} className="rounded-xl bg-emerald-500 p-2 text-slate-950 font-bold hover:bg-emerald-400">
              <Send size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Bulle d'activation */}
      <button
        type="button"
        onClick={handleOpenToggle}
        className="relative flex h-13 w-13 items-center justify-center rounded-full border border-emerald-400/30 bg-slate-950/90 text-emerald-300 shadow-[0_10px_30px_rgba(16,185,129,0.3)] backdrop-blur-xl transition hover:scale-105 active:scale-95"
        aria-label="Ouvrir le support"
      >
        <MessageSquare size={22} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-md animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}

function DesktopShell({ children, role, items }: { children: ReactNode; role: "admin" | "client"; items: ShellNavItem[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const isClient = role === "client";
  const showBackButton = isClient && pathname !== "/client/home";

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/client/home");
  };

  return (
    <div className="relative min-h-screen text-(--fg-1)">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-30 h-110 w-110 rounded-full bg-emerald-300/15 blur-3xl" />
        <div className="absolute -right-36 top-[20%] h-130 w-130 rounded-full bg-cyan-300/12 blur-3xl" />
        <div className="absolute -bottom-55 left-[30%] h-115 w-115 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-440 gap-6 px-4 pb-6 pt-4 md:px-6 xl:gap-8 xl:px-10">
        <aside className="hidden w-72.5 shrink-0 xl:flex xl:flex-col">
          <div className="glass-strong sticky top-4 flex h-[calc(100vh-2rem)] flex-col rounded-[28px] p-4">
            <div className="mb-6 flex items-center gap-3 px-2 pt-1">
              <BrandMark />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-(--fg-4)">ChifPam</p>
                <p className="text-sm font-semibold tracking-tight text-(--fg-1)">Elite Platform</p>
              </div>
            </div>

            <ShellNav items={items} />

            <div className="mt-auto rounded-2xl border border-white/10 bg-white/3 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-(--fg-4)">Mode</p>
              <p className="mt-1 text-sm font-semibold text-(--fg-2)">{role === "admin" ? "Operations Console" : "Live Experience"}</p>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="glass sticky top-4 z-30 rounded-3xl border border-white/12 px-5 py-4 md:px-6">
            <div className="flex items-center justify-between gap-3">
              <SectionHeadline role={role} />
              <div className="hidden items-center gap-2 md:flex">
                <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                  live
                </span>
                <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100">
                  desktop optimized
                </span>
              </div>
            </div>
          </header>

          <main className="mt-4 rounded-[30px] border border-white/8 bg-black/18 p-0 shadow-[0_24px_70px_rgba(1,5,14,0.55)] backdrop-blur-sm xl:p-0">
            {children}
          </main>

          <footer className="mt-4 rounded-[20px] border border-white/8 bg-white/2 px-5 py-4 text-[11px] text-(--fg-4) backdrop-blur-xl md:px-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="uppercase tracking-[0.18em]">ChifPam Elite Interface</p>
              <p>Fluid enterprise surface for {role === "admin" ? "operations" : "players"}.</p>
            </div>
          </footer>
        </div>
      </div>

      {/* Composants spécifiques au Client */}
      {isClient ? (
        <>
          {/* Navigation Mobile Basse */}
          <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 pt-2 md:hidden">
            <div className="mx-auto flex max-w-md items-center justify-between rounded-[28px] border border-white/12 bg-slate-950/85 px-2 py-2 shadow-[0_24px_65px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
              <ShellNav items={items} compact />
            </div>
          </div>

          {/* Bulle de Chat Flottante en bas à gauche */}
          <FloatingChatBubble />

          {/* Bouton Retour en bas à droite */}
          {showBackButton ? (
            <button
              type="button"
              onClick={handleBack}
              className="fixed bottom-20 right-4 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full border border-emerald-400/25 bg-slate-950/85 text-emerald-200 shadow-[0_16px_40px_rgba(16,185,129,0.2)] backdrop-blur-xl transition hover:scale-105 md:bottom-6 md:right-6"
              aria-label="Retour"
            >
              <ArrowLeft size={18} />
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export function AdminAppShell({ children }: { children: ReactNode }) {
  return <DesktopShell role="admin" items={adminItems}>{children}</DesktopShell>;
}

export function ClientAppShell({ children }: { children: ReactNode }) {
  return <DesktopShell role="client" items={clientItems}>{children}</DesktopShell>;
}
