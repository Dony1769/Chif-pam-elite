"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  AlertTriangle,
  BarChart3,
  Bell,
  ChevronRight,
  Crown,
  Dices,
  Gift,
  CircleHelp,
  Home,
  History,
  LayoutDashboard,
  MessageSquare,
  MoreHorizontal,
  Shield,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Ticket,
  Trophy,
  Users,
  Wallet,
  WalletCards,
  User,
  LogIn,
  LogOut,
  UserPlus,
  X
} from "lucide-react";
import { cn } from "@/lib/cn";
import { supabase } from "@/lib/supabase";
import { signOutAndClearClientSession } from "@/lib/client-session";

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
  { href: "/admin-chif-pam/phone-duplicates", label: "Doublons tel.", icon: <ShieldAlert size={18} /> },
  { href: "/admin-chif-pam/chat", label: "Support", icon: <MessageSquare size={18} /> },
  { href: "/admin-chif-pam/notifications", label: "Notifications", icon: <Bell size={18} /> },
  { href: "/admin-chif-pam/p2p", label: "Marché P2P", icon: <Sparkles size={18} /> },
  { href: "/admin-chif-pam/market", label: "Boutique", icon: <ShoppingBag size={18} /> },
  { href: "/admin-chif-pam/mini-jeux", label: "Mini-jeux", icon: <Dices size={18} /> },
  { href: "/admin-chif-pam/loterie", label: "Loterie", icon: <Ticket size={18} /> },
  { href: "/admin-chif-pam/agent-requests", label: "Demandes agent", icon: <Users size={18} /> },
  { href: "/admin-chif-pam/phone-issues", label: "Incidents téléphone", icon: <AlertTriangle size={18} /> },
];


// Remplacement de /client/chat par /client/profile
const clientItems: ShellNavItem[] = [
  { href: "/client/home", label: "Accueil", icon: <Home size={18} /> },
  { href: "/client/rewards", label: "Récompenses", icon: <Gift size={18} /> },
  { href: "/client/challenges", label: "Défis", icon: <Shield size={18} /> },
  { href: "/client/market", label: "Offres", icon: <ShoppingBag size={18} /> },
  { href: "/live", label: "Live", icon: <Sparkles size={18} /> },
  { href: "/client/profile", label: "Profil", icon: <User size={18} /> },
  { href: "/client/vip", label: "VIP", icon: <Crown size={18} /> },
];

const clientSecondaryItems: ShellNavItem[] = [
  { href: "/client/finance", label: "Finance", icon: <WalletCards size={18} /> },
  { href: "/client/history", label: "Historique", icon: <History size={18} /> },
  { href: "/client/help", label: "Centre d'aide", icon: <CircleHelp size={18} /> },
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

function QuickAccessNav({ compact = false, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let active = true;

    const loadUnreadCount = async (userId: string) => {
      if (pathname === "/client/chat") {
        setUnreadCount(0);
        return;
      }
      const { count, error } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_admin_message", true)
        .eq("is_read_by_client", false);
      if (!error && active) setUnreadCount(count ?? 0);
    };

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      void loadUnreadCount(user.id);
      channel = supabase
        .channel(`quick_access_chat_${user.id}_${Date.now()}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `user_id=eq.${user.id}` }, () => {
          void loadUnreadCount(user.id);
        });
      channel.subscribe();
    };

    void init();
    return () => {
      active = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [pathname]);

  const items = [
    ...clientSecondaryItems.slice(0, 2),
    { href: "/client/chat", label: "Support / Chat", icon: <MessageSquare size={18} /> },
    clientSecondaryItems[2],
  ];

  return (
    <nav className={cn(compact ? "grid grid-cols-2 gap-2" : "space-y-2")} aria-label="Accès rapides">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const isChat = item.href === "/client/chat";
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "relative flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] transition",
              active ? "border-emerald-300/35 bg-emerald-300/12 text-emerald-100" : "border-white/8 bg-white/3 text-(--fg-3) hover:border-white/18 hover:bg-white/6 hover:text-(--fg-2)"
            )}
          >
            <span className={active ? "text-(--accent)" : "opacity-85"}>{item.icon}</span>
            <span className="truncate">{item.label}</span>
            {isChat && unreadCount > 0 ? <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white">{unreadCount > 99 ? "99+" : unreadCount}</span> : null}
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
        void fetchUnreadCount(user.id);

        // Ecoute en temps réel des nouveaux messages
        const channelName = `realtime_chat_bubble_${user.id}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        channel = supabase.channel(channelName);
        channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "messages",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            void fetchUnreadCount(user.id);
          }
        );
        channel.subscribe();
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

function PhoneIssueBanner() {
  const router = useRouter();
  const [issue, setIssue] = useState<{ issue_type: 'invalid_phone' | 'unresolved_duplicate'; resolved: boolean } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase.from('phone_account_issues').select('issue_type, resolved').eq('resolved', false).maybeSingle().then(({ data }) => {
      if (active) setIssue(data as typeof issue);
    });
    return () => { active = false; };
  }, []);

  if (!issue || dismissed) return null;
  const invalid = issue.issue_type === 'invalid_phone';
  return (
    <div className="fixed inset-x-3 top-3 z-60 mx-auto flex max-w-xl items-start gap-3 rounded-2xl border border-amber-300/30 bg-slate-950/95 p-4 text-amber-100 shadow-2xl backdrop-blur-xl">
      <AlertTriangle className="mt-0.5 shrink-0 text-amber-300" size={18} />
      <p className="flex-1 text-xs leading-5">{invalid ? 'Votre numéro de téléphone doit être corrigé dans les paramètres de votre profil.' : 'Veuillez contacter le support afin de vérifier les informations de votre compte.'}</p>
      <button type="button" onClick={() => router.push(invalid ? '/client/profile' : '/client/chat')} className="shrink-0 rounded-lg bg-amber-300 px-3 py-2 text-[10px] font-black text-slate-950">{invalid ? 'Corriger' : 'Support'}</button>
      <button type="button" onClick={() => setDismissed(true)} aria-label="Fermer" className="shrink-0 p-1 text-slate-400 hover:text-white"><X size={15} /></button>
    </div>
  );
}

function DesktopShell({ children, role, items }: { children: ReactNode; role: "admin" | "client"; items: ShellNavItem[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const isClient = role === "client";
  const showBackButton = isClient && pathname !== "/client/home";
  // Pages du jeu FC Career : plein écran, sans la navigation du site (le jeu fournit
  // sa propre navigation et un lien de retour vers /client/home).
  const immersive = isClient && pathname.startsWith("/client/fc-career");
  const [authUser, setAuthUser] = useState<{ id: string } | null>(null);
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted) setAuthUser(session?.user ? { id: session.user.id } : null);
    };

    loadSession();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setAuthUser(session?.user ? { id: session.user.id } : null);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const redirectAnonymousAction = (event: React.SyntheticEvent) => {
    if (!isClient || authUser) return;

    const target = event.target as HTMLElement;
    const actionControl = target.closest("button, input, textarea, select, [contenteditable='true']");
    if (!actionControl || actionControl.closest("[data-public-action='true']")) return;

    event.preventDefault();
    event.stopPropagation();
    router.push(`/connexion?redirect=${encodeURIComponent(pathname)}`);
  };

  const handleLogout = async () => {
    try {
      await signOutAndClearClientSession();
    } finally {
      router.replace("/connexion");
      router.refresh();
    }
  };

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/client/home");
  };

  if (immersive) {
    return (
      <div className="relative min-h-screen text-(--fg-1)" data-shell="immersive"
        onClickCapture={redirectAnonymousAction} onSubmitCapture={redirectAnonymousAction}>
        {children}
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen text-(--fg-1)"
      onClickCapture={redirectAnonymousAction}
      onSubmitCapture={redirectAnonymousAction}
    >
      {/* Arrière-plan décoratif */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-30 h-110 w-110 rounded-full bg-emerald-300/15 blur-3xl" />
        <div className="absolute -right-36 top-[20%] h-130 w-130 rounded-full bg-cyan-300/12 blur-3xl" />
        <div className="absolute -bottom-55 left-[30%] h-115 w-115 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-440 gap-6 px-4 pb-6 pt-4 md:px-6 lg:gap-8 lg:px-10">
        {/* Menu latéral ordinateur */}
        <aside className="hidden w-72.5 shrink-0 lg:flex lg:flex-col">
          <div className="glass-strong sticky top-4 flex h-[calc(100vh-2rem)] flex-col rounded-[28px] p-4">
            <div className="mb-6 flex items-center gap-3 px-2 pt-1">
              <BrandMark />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-(--fg-4)">ChifPam</p>
                <p className="text-sm font-semibold tracking-tight text-(--fg-1)">Elite Platform</p>
              </div>
            </div>

            <ShellNav items={items} />

            {isClient ? (
              <div className="mt-6 border-t border-white/8 pt-5">
                <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-(--fg-4)">Accès rapides</p>
                <QuickAccessNav />
              </div>
            ) : null}

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
              <div className="flex items-center gap-2">
                {isClient && !authUser ? (
                  <>
                    <Link
                      href="/connexion"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-(--fg-2) transition hover:border-emerald-300/30 hover:text-emerald-200"
                    >
                      <LogIn size={14} />
                      Connexion
                    </Link>
                    <Link
                      href="/inscription"
                      className="hidden items-center gap-1.5 rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-200 transition hover:bg-emerald-300/20 sm:inline-flex"
                    >
                      <UserPlus size={14} />
                      Inscription
                    </Link>
                  </>
                ) : isClient ? (
                  <>
                    <Link
                      href="/client/profile"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-(--fg-2) transition hover:border-emerald-300/30 hover:text-emerald-200"
                    >
                      <User size={14} />
                      Profil
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-(--fg-3) transition hover:border-rose-300/30 hover:text-rose-200"
                      data-public-action="true"
                    >
                      <LogOut size={14} />
                      Déconnexion
                    </button>
                  </>
                ) : null}
                <div className="hidden items-center gap-2 md:flex">
                <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                  live
                </span>
                <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100">
                  desktop optimized
                </span>
                </div>
              </div>
            </div>
          </header>

          <main className="mt-4 rounded-[30px] border border-white/8 bg-black/18 p-0 shadow-[0_24px_70px_rgba(1,5,14,0.55)] backdrop-blur-sm lg:p-0">
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
          <PhoneIssueBanner />

          {/* Navigation inférieure mobile */}
          <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 pt-2 lg:hidden">
            <div className="mx-auto flex max-w-md items-center justify-between rounded-[28px] border border-white/12 bg-slate-950/85 px-2 py-2 shadow-[0_24px_65px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
              <ShellNav items={items} compact />
              <button
                type="button"
                onClick={() => setQuickMenuOpen((open) => !open)}
                aria-expanded={quickMenuOpen}
                aria-controls="client-quick-access"
                className={cn("flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[9px] font-semibold uppercase tracking-[0.08em] transition", quickMenuOpen ? "bg-cyan-300/15 text-cyan-100" : "bg-white/4 text-(--fg-4) hover:bg-white/8 hover:text-(--fg-2)")}
              >
                {quickMenuOpen ? <X size={18} /> : <MoreHorizontal size={18} />}
                <span>Plus</span>
              </button>
            </div>
          </div>

          {quickMenuOpen ? (
            <div id="client-quick-access" className="fixed inset-x-4 bottom-24 z-40 rounded-[26px] border border-cyan-300/20 bg-slate-950/95 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-2xl lg:hidden">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200">Accès rapides</p>
              <QuickAccessNav compact onNavigate={() => setQuickMenuOpen(false)} />
            </div>
          ) : null}

          {/* Bouton de retour en arrière */}
          {showBackButton ? (
            <button
              type="button"
              onClick={handleBack}
              data-public-action="true"
              className="fixed bottom-20 right-4 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full border border-emerald-400/25 bg-slate-950/85 text-emerald-200 shadow-[0_16px_40px_rgba(16,185,129,0.2)] backdrop-blur-xl transition hover:scale-105 active:scale-95 lg:bottom-6 lg:right-6"
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
