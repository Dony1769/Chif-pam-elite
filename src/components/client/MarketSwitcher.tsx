"use client";

import Link from "next/link";
import { Handshake, ShoppingCart, Store } from "lucide-react";
import { cn } from "@/lib/cn";

type MarketSwitcherProps = {
  active: "official" | "p2p";
};

const markets = [
  {
    key: "official" as const,
    href: "/client/market",
    label: "Boutique Officielle CP",
    description: "Achetez directement auprès de Chif-Pam avec vos diamants.",
    icon: Store,
  },
  {
    key: "p2p" as const,
    href: "/client/p2p",
    label: "Marché P2P Agent",
    description: "Achetez auprès d&apos;un agent local via NatCash ou MonCash.",
    icon: Handshake,
  },
];

export function MarketSwitcher({ active }: MarketSwitcherProps) {
  return (
    <section className="overflow-hidden rounded-[26px] border border-cyan-300/20 bg-slate-950/75 shadow-[0_18px_55px_rgba(8,47,73,0.3)]">
      <div className="border-b border-white/8 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <ShoppingCart className="text-cyan-200" size={20} />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">Choisir son marché</p>
            <p className="mt-1 text-sm text-slate-400">Deux façons simples d&apos;obtenir des CP.</p>
          </div>
        </div>
      </div>
      <div className="grid gap-px bg-white/8 sm:grid-cols-2">
        {markets.map(({ key, href, label, description, icon: Icon }) => {
          const isActive = active === key;
          return (
            <Link
              key={key}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group relative flex min-h-28 items-start gap-3 p-5 transition hover:bg-white/8",
                isActive ? "bg-emerald-300/12" : "bg-slate-950/70"
              )}
            >
              <span className={cn("mt-0.5 rounded-xl border p-2.5", isActive ? "border-emerald-300/40 bg-emerald-300/15 text-emerald-200" : "border-white/10 bg-white/5 text-slate-400 group-hover:text-cyan-200")}>
                <Icon size={19} />
              </span>
              <span className="min-w-0">
                <span className={cn("block text-sm font-black", isActive ? "text-white" : "text-slate-200")}>{label}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-400">{description}</span>
              </span>
              {isActive ? <span className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-emerald-300" /> : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
