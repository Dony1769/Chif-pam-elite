"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { BarChart3, ClipboardList, Landmark, LogOut, Store, Loader2 } from "lucide-react";

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/connexion");
      else setReady(true);
    });
  }, [router]);
  if (!ready) return <div className="grid min-h-screen place-items-center bg-[#05070b]"><Loader2 className="animate-spin text-emerald-300" /></div>;
  const signOut = async () => { await supabase.auth.signOut(); router.replace("/connexion"); };
  const items = [
    ["/agent/dashboard", "Dashboard", BarChart3],
    ["/agent/offer", "Offre", Store],
    ["/agent/history", "Historique", ClipboardList],
    ["/agent/finance", "Finance", Landmark],
  ] as const;
  return <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_32%),#05070b] text-white"><nav className="border-b border-white/10 bg-slate-950/90 px-4 py-4 backdrop-blur-xl"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4"><Link href="/agent/dashboard" className="font-black tracking-widest text-emerald-200">AGENT MARKET</Link><div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-300">{items.map(([href, label, Icon]) => <Link key={href} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 transition hover:bg-white/10 ${pathname.includes(label.toLowerCase()) || (label === "Dashboard" && pathname.includes("dashboard")) ? "bg-emerald-300/10 text-emerald-200" : ""}`} href={href}><Icon size={15} />{label}</Link>)}<button type="button" onClick={signOut} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-slate-300 transition hover:border-rose-300/40 hover:text-rose-200"><LogOut size={15} />Déconnexion</button></div></div></nav>{children}</div>;
}