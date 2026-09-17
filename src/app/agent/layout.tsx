"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { signOutAndClearClientSession } from "@/lib/client-session";
import { APP_ROUTES, isAgentRole } from "@/lib/auth-routing";
import { BarChart3, ClipboardList, Landmark, LogOut, Store, Loader2 } from "lucide-react";

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const checkAgentRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace(APP_ROUTES.login);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!profile || !isAgentRole(profile.role)) {
        const message = encodeURIComponent("Accès réservé aux agents agréés");
        router.replace(`${APP_ROUTES.clientHome}?auth_error=${message}`);
        return;
      }

      setReady(true);
    };

    void checkAgentRole();
  }, [router]);
  if (!ready) return <div className="grid min-h-screen place-items-center bg-[#05070b]"><Loader2 className="animate-spin text-emerald-300" /></div>;
  const signOut = async () => {
    try {
      await signOutAndClearClientSession();
    } finally {
      router.replace("/connexion");
    }
  };
  const items = [
    ["/agent/dashboard", "Dashboard", BarChart3],
    ["/agent/offer", "Offre", Store],
    ["/agent/history", "Historique", ClipboardList],
    ["/agent/finance", "Finance", Landmark],
  ] as const;
  return <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_32%),#05070b] text-white"><nav className="border-b border-white/10 bg-slate-950/90 px-4 py-4 backdrop-blur-xl"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4"><Link href="/agent/dashboard" className="font-black tracking-widest text-emerald-200">AGENT MARKET</Link><div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-300">{items.map(([href, label, Icon]) => <Link key={href} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 transition hover:bg-white/10 ${pathname.includes(label.toLowerCase()) || (label === "Dashboard" && pathname.includes("dashboard")) ? "bg-emerald-300/10 text-emerald-200" : ""}`} href={href}><Icon size={15} />{label}</Link>)}<button type="button" onClick={signOut} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-slate-300 transition hover:border-rose-300/40 hover:text-rose-200"><LogOut size={15} />Déconnexion</button></div></div></nav>{children}</div>;
}