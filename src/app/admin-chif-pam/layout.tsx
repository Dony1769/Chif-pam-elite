"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { APP_ROUTES, isAdminRole } from "@/lib/auth-routing";
import { AdminAppShell } from "@/components/ui/app-shell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAdmin = async () => {
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

      if (!profile || !isAdminRole(profile.role)) {
        router.replace(APP_ROUTES.clientHome);
        return;
      }

      setAuthorized(true);
    };
    checkAdmin();
  }, [router]);

  if (!authorized) {
    return (
      <div className="relative grid min-h-screen place-items-center overflow-hidden bg-[#020617]">
        <div className="pointer-events-none absolute -left-24 -top-32.5 h-96 w-96 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 -bottom-40 h-112 w-md rounded-full bg-cyan-300/15 blur-3xl" />
        <div className="glass-strong z-10 rounded-3xl px-8 py-6 text-center shadow-[0_24px_60px_rgba(2,8,20,0.52)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-(--fg-4)">Admin access</p>
          <p className="mt-2 text-lg font-semibold tracking-tight text-(--accent)">Vérification Elite...</p>
        </div>
      </div>
    );
  }

  return <AdminAppShell>{children}</AdminAppShell>;
}

