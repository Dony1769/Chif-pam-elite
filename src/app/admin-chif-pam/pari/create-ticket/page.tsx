import React from 'react';

import { supabaseServer } from '@/lib/server-supabase';
import TicketBuilder from './TicketBuilder';

export const dynamic = 'force-dynamic'; // Force le rafraîchissement des données

export default async function CreateTicketPage() {
  const supabase = await supabaseServer(); // ✅ on appelle la fonction

  const today = new Date().toISOString();

  const { data: matches, error } = await supabase
    .from('pari_predictions')
    .select('*')
    .gte('match_date', today)
    .order('match_date', { ascending: true });

  if (error) {
    console.error("Erreur de chargement des matchs:", error);
  }

  return (
    <div className="min-h-screen bg-[#050508] text-white font-inter flex">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#00f5ff]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] right-[-10%] w-[400px] h-[400px] bg-[#bf00ff]/5 rounded-full blur-[100px]" />
      </div>

      <TicketBuilder initialMatches={matches || []} />
    </div>
  );
}
