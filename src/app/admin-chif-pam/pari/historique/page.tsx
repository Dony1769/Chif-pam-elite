import React from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import HistoryClient from './HistoryClient';

export const dynamic = 'force-dynamic'; // Force la mise à jour à chaque visite

export default async function HistoriquePage() {
  // Récupération des tickets de l'utilisateur avec leurs sélections (Relation One-to-Many)
  // Note: Si RLS est activé, supabase-client ne remontera que les tickets du user connecté
  const { data: tickets, error } = await supabaseClient
    .from('bets_tickets')
    .select(`
      *,
      bet_selections (*)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Erreur lors de la récupération de l'historique :", error);
  }

  return (
    <div className="min-h-screen bg-[#050508] text-white font-inter flex relative">
      {/* Background Anime (Glassmorphism Neon) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#00f5ff]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] right-[-10%] w-[400px] h-[400px] bg-[#bf00ff]/5 rounded-full blur-[100px]" />
      </div>

      {/* Rendu du Client Component interactif */}
      <HistoryClient initialTickets={tickets || []} />
    </div>
  );
}
