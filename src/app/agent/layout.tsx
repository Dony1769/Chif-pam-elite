"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = user ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle() : { data: null };
      if (!user || profile?.role !== "agent") { router.replace("/connexion"); return; }
      setReady(true);
    };
    void check();
  }, [router]);
  if (!ready) return <div className="grid min-h-screen place-items-center bg-[#05070b]"><Loader2 className="animate-spin text-emerald-300" /></div>;
  return <div className="min-h-screen bg-[#05070b] text-white"><nav className="border-b border-white/10 bg-slate-950/90 px-4 py-4"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4"><span className="font-black tracking-widest text-emerald-200">AGENT MARKET</span><div className="flex gap-3 text-xs font-bold text-slate-300"><Link className={pathname.includes("dashboard") ? "text-emerald-200" : ""} href="/agent/dashboard">Dashboard</Link><Link className={pathname.includes("offer") ? "text-emerald-200" : ""} href="/agent/offer">Offre</Link><Link className={pathname.includes("history") ? "text-emerald-200" : ""} href="/agent/history">Historique</Link><Link href="/agent/finance">Finance</Link></div></div></nav>{children}</div>;
}