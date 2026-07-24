"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronRight,
  Crown,
  Gamepad2,
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
} from "lucide-react";
import { cn } from "@/lib/cn";

type ShellNavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

const adminItems: ShellNavItem[] = [
  { href: "/admin-chif-pam/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  { href: "/admin-chif-pam/challenges", label: "Défis", icon: <Trophy size={18} /> },
  { href: "/admin-chif-pam/coupon", label: "Coupons", icon: <Ticket size={18} /> },
  { href: "/admin-chif-pam/demandes", label: "Demandes", icon: <Wallet size={18} /> },
  { href: "/admin-chif-pam/users", label: "Utilisateurs", icon: <Users size={18} /> },
  { href: "/admin-chif-pam/chat", label: "Support", icon: <MessageSquare size={18} /> },
  { href: "/admin-chif-pam/notifications", label: "Notifications", icon: <Bell size={18} /> },
];

const clientItems: ShellNavItem[] = [
  { href: "/client/home", label: "Accueil", icon: <Home size={18} /> },
  { href: "/client/list", label: "Explorer", icon: <Gamepad2 size={18} /> },
  { href: "/client/challenges", label: "Défis", icon: <Shield size={18} /> },
  { href: "/client/market", label: "Offres", icon: <ShoppingBag size={18} /> },
  { href: "/client/chat", label: "Chat", icon: <MessageSquare size={18} /> },
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

function ShellNav({ items }: { items: ShellNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-2">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group relative flex items-center gap-3 overflow-hidden rounded-2xl border px-3.5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] transition-all duration-300",
              active
                ? "border-(--accent-border) bg-linear-to-r from-emerald-300/18 via-cyan-300/10 to-transparent text-(--fg-1) shadow-[0_14px_35px_rgba(45,205,164,0.2)]"
                : "border-white/8 bg-white/2 text-(--fg-3) hover:border-white/18 hover:bg-white/4 hover:text-(--fg-2)"
            )}
          >
            <span className={cn("transition-transform duration-300", active ? "text-(--accent)" : "group-hover:scale-105")}>{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            <ChevronRight size={14} className={cn("transition-transform duration-300", active ? "translate-x-0 text-(--accent)" : "-translate-x-1 opacity-30 group-hover:translate-x-0 group-hover:opacity-80")} />
            {active ? <span className="absolute inset-y-2 left-1 w-0.5 rounded-full bg-(--accent)" /> : null}
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

function DesktopShell({ children, role, items }: { children: React.ReactNode; role: "admin" | "client"; items: ShellNavItem[] }) {
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
    </div>
  );
}

export function AdminAppShell({ children }: { children: React.ReactNode }) {
  return <DesktopShell role="admin" items={adminItems}>{children}</DesktopShell>;
}

export function ClientAppShell({ children }: { children: React.ReactNode }) {
  return <DesktopShell role="client" items={clientItems}>{children}</DesktopShell>;
}
