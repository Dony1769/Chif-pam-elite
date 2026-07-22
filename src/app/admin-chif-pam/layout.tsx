"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { APP_ROUTES, isAdminRole } from "@/lib/auth-routing";

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

  if (!authorized) return <div className="min-h-screen bg-[#020617] flex items-center justify-center text-emerald-500 font-bold">VÉRIFICATION ÉLITE...</div>;

  return <>{children}</>;
}

