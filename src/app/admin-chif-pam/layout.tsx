"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const ADMIN_ID = "9e141172-93db-4df4-a72b-47b89211b46e";

      if (!user || user.id !== ADMIN_ID) {
        router.replace("/connexion");
      } else {
        setAuthorized(true);
      }
    };
    checkAdmin();
  }, [router]);

  if (!authorized) return <div className="min-h-screen bg-[#020617] flex items-center justify-center text-emerald-500 font-bold">VÉRIFICATION ÉLITE...</div>;

  return <>{children}</>;
}

