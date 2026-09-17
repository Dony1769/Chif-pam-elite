"use client";  
import { useEffect, useState } from 'react';  
import { supabase } from '@/lib/supabase';  
import { useRouter, useSearchParams } from 'next/navigation';  
import { Loader2 } from 'lucide-react';  
import { APP_ROUTES, isAdminRole, isAgentRole } from '@/lib/auth-routing';
import { signOutAndClearClientSession } from '@/lib/client-session';
import { ClientAppShell } from '@/components/ui/app-shell';
import { EmailVerificationGate } from '@/components/auth/EmailVerificationGate';
import { useAppFeedback } from '@/components/ui/AppFeedbackProvider';
  
export default function ClientLayout({ children }: { children: React.ReactNode }) {  
  const router = useRouter();  
  const searchParams = useSearchParams();
  const { notify } = useAppFeedback();
  const [loading, setLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const authError = searchParams.get('auth_error');
    if (!authError) return;

    notify(authError, 'danger');
    router.replace(APP_ROUTES.clientHome);
  }, [notify, router, searchParams]);
  
  useEffect(() => {  
    const checkUser = async () => {  
      const { data: { session } } = await supabase.auth.getSession();  
      if (!session) {
        setAuthenticated(false);
        setLoading(false);
        return;
      }
      setAuthenticated(true);

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_banned, email_verified')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profile?.is_banned) {
        await signOutAndClearClientSession();
        router.replace(APP_ROUTES.login);
        return;
      }

      if (isAdminRole(profile?.role)) {
        router.replace(APP_ROUTES.adminDashboard);
        return;
      }  
      if (isAgentRole(profile?.role)) {
        router.replace(APP_ROUTES.agentDashboard);
        return;
      }

      setEmailVerified(profile?.email_verified === true);
      setLoading(false);  
    };  
    void checkUser();
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setAuthenticated(false);
        setEmailVerified(true);
        setLoading(false);
        router.replace(APP_ROUTES.login);
        return;
      }
      setAuthenticated(true);
    });

    return () => listener.subscription.unsubscribe();
  }, [router]);  
  
  if (loading) {  
    return (  
      <div className="relative grid min-h-screen place-items-center overflow-hidden bg-[#020617]">  
        <div className="pointer-events-none absolute -left-32 -top-40 h-96 w-96 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-48 -right-28 h-104 w-104 rounded-full bg-cyan-300/15 blur-3xl" />
        <div className="glass-strong z-10 flex items-center gap-3 rounded-3xl px-6 py-5 shadow-[0_24px_60px_rgba(2,8,20,0.52)]">
          <Loader2 className="animate-spin text-emerald-300" size={26} />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-(--fg-4)">Client session</p>
            <p className="text-sm font-semibold text-(--fg-2)">Initialisation premium...</p>
          </div>
        </div>
      </div>  
    );  
  }  
  
  if (!authenticated) return null;

  if (!emailVerified) {
    return <EmailVerificationGate onVerified={() => setEmailVerified(true)} />;
  }

  return <ClientAppShell>{children}</ClientAppShell>;
}  
