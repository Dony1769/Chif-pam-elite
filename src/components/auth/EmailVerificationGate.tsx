"use client";

import { FormEvent, useEffect, useState } from 'react';
import { Loader2, LogOut, MailCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { signOutAndClearClientSession } from '@/lib/client-session';
import { appUrl } from '@/lib/app-url';
import { DSButton, DSCard, DSInput } from '@/components/ui/primitives';

export function EmailVerificationGate({ onVerified }: { onVerified: () => void }) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event !== 'USER_UPDATED' || !session?.user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('email_verified')
        .eq('id', session.user.id)
        .maybeSingle();
      if (profile?.email_verified === true) onVerified();
    });
    return () => listener.subscription.unsubscribe();
  }, [onVerified]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Session expirée. Reconnectez-vous.');
      const response = await fetch('/api/auth/email-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email }),
      });
      const result = (await response.json()) as { success?: boolean; message?: string; email?: string };
      if (!response.ok || !result.success || !result.email) throw new Error(result.message || 'Impossible de préparer la confirmation.');
      const { error: updateError } = await supabase.auth.updateUser(
        { email: result.email },
        { emailRedirectTo: `${appUrl}/auth/callback` }
      );
      if (updateError) throw updateError;
      setMessage('Vérifiez votre boîte mail pour confirmer votre adresse. Cette fenêtre restera active jusqu’à la confirmation.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 grid min-h-screen place-items-center bg-[#020617]/95 p-4 backdrop-blur-xl">
      <DSCard className="w-full max-w-lg border-amber-300/30 bg-slate-950 p-6 shadow-[0_0_45px_rgba(251,191,36,0.12)] sm:p-8">
        <div className="mb-6 flex items-start gap-4">
          <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-3 text-amber-300"><MailCheck size={24} /></div>
          <div>
            <h1 className="text-xl font-black uppercase text-white">Sécurisez votre compte</h1>
            <p className="mt-2 text-sm font-normal normal-case leading-6 text-slate-300">Ajoutez une adresse email réelle pour sécuriser votre compte et récupérer votre mot de passe si nécessaire.</p>
          </div>
        </div>
        {message && <p className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm font-normal normal-case text-emerald-200">{message}</p>}
        {error && <p className="mb-4 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm font-normal normal-case text-rose-200">{error}</p>}
        <form onSubmit={submit} className="space-y-4">
          <DSInput type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="vous@exemple.com" autoComplete="email" />
          <DSButton type="submit" disabled={loading} variant="success" className="w-full">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <MailCheck size={18} />}
            Envoyer le lien de confirmation
          </DSButton>
        </form>
        <button type="button" onClick={() => void signOutAndClearClientSession()} className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white">
          <LogOut size={14} /> Se déconnecter
        </button>
      </DSCard>
    </div>
  );
}