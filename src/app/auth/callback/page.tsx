"use client";

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('Validation de votre adresse email...');

  useEffect(() => {
    const confirm = async () => {
      const code = searchParams.get('code');
      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type') as 'email' | null;
      const result = code
        ? await supabase.auth.exchangeCodeForSession(code)
        : tokenHash && type
          ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
          : { error: new Error('Lien de confirmation invalide.') };
      if (result.error) {
        setMessage(result.error.message);
        return;
      }
      router.replace('/client/home');
    };
    void confirm();
  }, [router, searchParams]);

  return <main className="grid min-h-screen place-items-center bg-[#020617] p-6 text-center text-white"><p className="text-sm font-semibold">{message}</p></main>;
}

export default function AuthCallbackPage() {
  return <Suspense fallback={<main className="grid min-h-screen place-items-center bg-[#020617] text-white"><p>Validation...</p></main>}><AuthCallbackContent /></Suspense>;
}