"use client";  
import { useEffect, useState } from 'react';  
import { supabase } from '@/lib/supabase';  
import { useRouter } from 'next/navigation';  
import { Loader2 } from 'lucide-react';  
import { APP_ROUTES, isAdminRole } from '@/lib/auth-routing';
  
export default function ClientLayout({ children }: { children: React.ReactNode }) {  
  const router = useRouter();  
  const [loading, setLoading] = useState(true);  
  
  useEffect(() => {  
    const checkUser = async () => {  
      const { data: { session } } = await supabase.auth.getSession();  
      if (!session) {  
        router.replace(APP_ROUTES.login);  
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_banned')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profile?.is_banned) {
        await supabase.auth.signOut();
        router.replace(APP_ROUTES.login);
        return;
      }

      if (isAdminRole(profile?.role)) {
        router.replace(APP_ROUTES.adminDashboard);
        return;
      }  

      setLoading(false);  
    };  
    checkUser();  
  }, [router]);  
  
  if (loading) {  
    return (  
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">  
        <Loader2 className="animate-spin text-emerald-500" size={32} />  
      </div>  
    );  
  }  
  
  return <>{children}</>;  
}  
