"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState, useCallback } from "react";
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
  Users,
  Wallet,
  User,
  X
} from "lucide-react";
import { cn } from "@/lib/cn";
import { supabase } from "@/lib/supabase";

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

// Remplacement de /client/chat par /client/profile
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
    <nav className={cn(compact ? "flex items-center justify-between gap-1 w-full" : "space-y-2")}>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              compact
                ? "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[9px] font-semibold uppercase tracking-[0.08em] transition-all duration-300"
                : "group relative flex items-center gap-3 overflow-hidden rounded-2xl border px-3.5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] transition-all duration-300",
              active
                ? compact
                  ? "bg-emerald-400/15 text-emerald-200 shadow-[0_10px_25px_rgba(16,185,129,0.2)] font-bold"
                  : "border-(--accent-border) bg-linear-to-r from-emerald-300/18 via-cyan-300/10 to-transparent text-(--fg-1) shadow-[0_14px_35px_rgba(45,205,164,0.2)]"
                : compact
                  ? "bg-white/4 text-(--fg-4) hover:bg-white/8 hover:text-(--fg-2)"
                  : "border-white/8 bg-white/2 text-(--fg-3) hover:border-white/18 hover:bg-white/4 hover:text-(--fg-2)"
            )}
          >
            <span className={cn("transition-transform duration-300", active ? "text-(--accent)" : compact ? "opacity-85" : "group-hover:scale-105")}>
              {item.icon}
            </span>
            <span className="leading-none truncate max-w-full">{item.label}</span>
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
 * Composant : Bulle de Chat Flottante
 * Gère le temps réel via Supabase et affiche les messages non lus de l'administration.
 */
function FloatingChatBubble() {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const pathname = usePathname();
  const router = useRouter();

  // Ne pas afficher la bulle si l'utilisateur est sur la page chat
  const isChatPage = pathname === "/client/chat";

  const fetchUnreadCount = useCallback(async (uid: string) => {
    if (isChatPage) {
      setUnreadCount(0);
      return;
    }
    const { count, error } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("user_id", uid)
      .eq("is_admin_message", true)
      .eq("is_read_by_client", false);

    if (!error) {
      setUnreadCount(count || 0);
    }
  }, [isChatPage]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const initAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        fetchUnreadCount(user.id);

        // Ecoute en temps réel des nouveaux messages
        channel = supabase.channel(`realtime_chat_bubble_${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "messages",
              filter: `user_id=eq.${user.id}`,
            },
            () => {
              fetchUnreadCount(user.id);
            }
          )
          .subscribe();
      }
    };

    initAuth();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchUnreadCount]);

  if (isChatPage || isDismissed) return null;

  return (
    <div className="fixed bottom-20 left-4 z-50 md:bottom-6 md:left-6 flex items-center gap-2">
      <div className="relative group">
        <button
          onClick={() => router.push("/client/chat")}
          className="relative flex h-13 w-13 items-center justify-center rounded-2xl border border-emerald-400/30 bg-slate-950/90 text-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.25)] backdrop-blur-xl transition-all duration-300 hover:scale-110 active:scale-95"
          aria-label="Support Chat"
        >
          <MessageSquare size={22} className="transition-transform group-hover:rotate-6" />

          {/* Badge du compteur de messages non lus */}
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-black text-white shadow-[0_0_12px_rgba(239,68,68,0.6)] animate-bounce">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}

          {/* Effet d'impulsion si un message est non lu */}
          {unreadCount > 0 && (
            <span className="absolute inset-0 rounded-2xl border-2 border-emerald-400 animate-ping opacity-40 pointer-events-none" />
          )}
        </button>

        {/* Info-bulle indicative au survol sur ordinateur */}
        <div className="pointer-events-none absolute left-16 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-xl border border-white/10 bg-slate-900/90 px-3 py-1.5 text-[10px] font-semibold text-slate-200 opacity-0 shadow-lg backdrop-blur-md transition-opacity duration-200 group-hover:opacity-100 hidden md:block">
          {unreadCount > 0 ? `${unreadCount} nouveau(x) message(s)` : "Besoin d'aide ? Chattez avec nous"}
        </div>
      </div>

      {/* Option de fermeture temporaire de la bulle */}
      <button
        onClick={() => setIsDismissed(true)}
        className="flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition"
        title="Masquer la bulle"
      >
        <X size={12} />
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
      {/* Arrière-plan décoratif */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-30 h-110 w-110 rounded-full bg-emerald-300/15 blur-3xl" />
        <div className="absolute -right-36 top-[20%] h-130 w-130 rounded-full bg-cyan-300/12 blur-3xl" />
        <div className="absolute -bottom-55 left-[30%] h-115 w-115 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-440 gap-6 px-4 pb-6 pt-4 md:px-6 xl:gap-8 xl:px-10">
        {/* Menu latéral ordinateur */}
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

        {/* Zone de contenu principal */}
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

      {/* Éléments d'interface utilisateur client */}
      {isClient ? (
        <>
          {/* Bulle de chat flottante */}
          <FloatingChatBubble />

          {/* Navigation inférieure mobile */}
          <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 pt-2 md:hidden">
            <div className="mx-auto flex max-w-md items-center justify-between rounded-[28px] border border-white/12 bg-slate-950/85 px-2 py-2 shadow-[0_24px_65px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
              <ShellNav items={items} compact />
            </div>
          </div>

          {/* Bouton de retour en arrière */}
          {showBackButton ? (
            <button
              type="button"
              onClick={handleBack}
              className="fixed bottom-20 right-4 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full border border-emerald-400/25 bg-slate-950/85 text-emerald-200 shadow-[0_16px_40px_rgba(16,185,129,0.2)] backdrop-blur-xl transition hover:scale-105 active:scale-95 md:bottom-6 md:right-6"
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
