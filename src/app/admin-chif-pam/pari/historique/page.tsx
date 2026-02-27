import React from 'react';
import { supabaseServer } from '@/lib/server-supabase';
import HistoryClient from './HistoryClient';

export const dynamic = 'force-dynamic';

export default async function HistoriquePage() {
  const supabase = await supabaseServer();

  const { data: tickets, error } = await supabase
    .from('bets_tickets')
    .select(`
      *,
      bet_selections (*)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Erreur récupération historique :", error);
  }

  return (
    <div className="min-h-screen bg-[#050508] text-white font-inter flex relative">
      
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#00f5ff]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] right-[-10%] w-[400px] h-[400px] bg-[#bf00ff]/5 rounded-full blur-[100px]" />
      </div>

      <HistoryClient initialTickets={tickets || []} />
    </div>
  );
}
