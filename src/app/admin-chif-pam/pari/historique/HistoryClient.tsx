"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutGrid, Search, CalendarDays, BrainCircuit, 
  FileText, CheckCircle2, XCircle, Clock, AlertCircle, TrendingUp, TrendingDown
} from 'lucide-react';

// --- TYPES ---
interface BetSelection {
  id: string;
  match_id: string;
  match_name?: string; // S'il est stocké. Sinon on l'adaptera.
  selected_outcome: string; // ex: 'Home', 'Draw', 'Over 2.5'
  odds: number;
}

interface BetTicket {
  id: string;
  created_at: string;
  status: 'pending' | 'won' | 'lost';
  stake: number;
  total_odds: number;
  total_profit: number;
  cumulative_roi: number;
  bet_selections: BetSelection[];
}

type FilterStatus = 'all' | 'pending' | 'won' | 'lost';

export default function HistoryClient({ initialTickets }: { initialTickets: BetTicket[] }) {
  const pathname = usePathname();
  const [filter, setFilter] = useState<FilterStatus>('all');

  // --- FILTRAGE DYNAMIQUE ---
  const filteredTickets = initialTickets.filter(ticket => 
    filter === 'all' ? true : ticket.status === filter
  );

  // --- UTILITAIRES ---
  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(new Date(dateString));
  };

  // --- COMPOSANT NAVIGATION (Réutilisable) ---
  const NavLinks = () => (
    <>
      <Link href="/admin-chif-pam/pari/dashboard" className={`flex flex-col md:flex-row items-center gap-2 p-2 md:p-3 rounded-xl transition-all ${pathname.includes('/dashboard') ? 'bg-[#00f5ff]/10 text-[#00f5ff]' : 'text-gray-500 hover:bg-white/5 hover:text-white'}`}>
        <LayoutGrid className="w-6 h-6 md:w-5 md:h-5" />
        <span className="text-[10px] md:text-sm font-medium">Dashboard</span>
      </Link>
      <Link href="/admin-chif-pam/pari/analyse" className={`flex flex-col md:flex-row items-center gap-2 p-2 md:p-3 rounded-xl transition-all ${pathname.includes('/analyse') ? 'bg-[#00f5ff]/10 text-[#00f5ff]' : 'text-gray-500 hover:bg-white/5 hover:text-white'}`}>
        <Search className="w-6 h-6 md:w-5 md:h-5" />
        <span className="text-[10px] md:text-sm font-medium">Analyse</span>
      </Link>
      <Link href="/admin-chif-pam/pari/create-ticket" className={`flex flex-col md:flex-row items-center gap-2 p-2 md:p-3 rounded-xl transition-all ${pathname.includes('/create-ticket') ? 'bg-[#00f5ff]/10 text-[#00f5ff]' : 'text-gray-500 hover:bg-white/5 hover:text-white'}`}>
        <FileText className="w-6 h-6 md:w-5 md:h-5" />
        <span className="text-[10px] md:text-sm font-medium">Fiche</span>
      </Link>
      <Link href="/admin-chif-pam/pari/historique" className={`flex flex-col md:flex-row items-center gap-2 p-2 md:p-3 rounded-xl transition-all ${pathname.includes('/historique') ? 'bg-gradient-to-r from-[#00f5ff]/20 to-[#bf00ff]/20 border border-[#00f5ff]/30 text-[#00f5ff] shadow-[0_0_15px_rgba(0,245,255,0.1)]' : 'text-gray-500 hover:bg-white/5'}`}>
        <CalendarDays className="w-6 h-6 md:w-5 md:h-5" />
        <span className="text-[10px] md:text-sm font-medium">Historique</span>
      </Link>
      <Link href="/admin-chif-pam/pari/psychologie" className={`flex flex-col md:flex-row items-center gap-2 p-2 md:p-3 rounded-xl transition-all ${pathname.includes('/psychologie') ? 'bg-[#00f5ff]/10 text-[#00f5ff]' : 'text-gray-500 hover:bg-white/5 hover:text-white'}`}>
        <BrainCircuit className="w-6 h-6 md:w-5 md:h-5" />
        <span className="text-[10px] md:text-sm font-medium">Psycho</span>
      </Link>
    </>
  );

  return (
    <div className="flex w-full relative z-10">
      
      {/* SIDEBAR (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 bg-[#12121a]/90 backdrop-blur-2xl border-r border-white/10 p-6 z-50">
        <div className="mb-10">
          <span className="font-orbitron text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-[#00f5ff] to-[#bf00ff]">BETIX</span>
          <p className="text-xs text-gray-500 tracking-[0.2em] uppercase mt-1">Console</p>
        </div>
        <nav className="flex flex-col gap-2">
          <NavLinks />
        </nav>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 md:ml-64 flex flex-col p-4 md:p-8 pb-32 md:pb-8">
        
        <header className="mb-8">
          <h1 className="text-2xl font-orbitron font-bold uppercase tracking-wider neon-underline inline-block">
            Historique des Paris
          </h1>
          <p className="text-gray-400 text-sm mt-2">Suivez vos performances et votre ROI global.</p>
        </header>

        {/* TABS DE FILTRAGE */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 custom-scrollbar">
          {[
            { id: 'all', label: 'Tous' },
            { id: 'pending', label: 'En cours', color: 'text-[#00f5ff]' },
            { id: 'won', label: 'Gagnés', color: 'text-green-400' },
            { id: 'lost', label: 'Perdus', color: 'text-[#ff00d4]' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as FilterStatus)}
              className={`px-5 py-2 rounded-xl text-sm font-bold tracking-widest uppercase transition-all duration-300 whitespace-nowrap border ${
                filter === tab.id 
                  ? 'bg-white/10 border-white/20 text-white shadow-lg' 
                  : 'bg-transparent border-transparent text-gray-500 hover:bg-white/5 hover:text-gray-300'
              } ${tab.color || ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* LISTE DES TICKETS */}
        {filteredTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md text-center">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
              <AlertCircle className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">Aucun ticket trouvé</h3>
            <p className="text-gray-400 text-sm max-w-md">
              Vous n'avez pas de ticket correspondant à ce filtre. Allez dans l'onglet "Fiche" pour placer un nouveau pari.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredTickets.map((ticket) => {
              
              // Configurations visuelles selon le statut
              const isWon = ticket.status === 'won';
              const isLost = ticket.status === 'lost';
              const isPending = ticket.status === 'pending';

              const statusColor = isWon ? 'text-green-400' : isLost ? 'text-[#ff00d4]' : 'text-[#00f5ff]';
              const statusBg = isWon ? 'bg-green-500/10 border-green-500/30' : isLost ? 'bg-[#ff00d4]/10 border-[#ff00d4]/30' : 'bg-[#00f5ff]/10 border-[#00f5ff]/30';
              const StatusIcon = isWon ? CheckCircle2 : isLost ? XCircle : Clock;
              
              const pnlValue = isWon ? `+${ticket.total_profit}$` : isLost ? `-${ticket.stake}$` : `${(ticket.stake * ticket.total_odds).toFixed(2)}$`;
              const pnlLabel = isWon ? 'Profit Net' : isLost ? 'Perte' : 'Gain Potentiel';

              return (
                <article key={ticket.id} className="bg-[#12121a]/80 backdrop-blur-xl border border-white/10 rounded-[2rem] flex flex-col relative overflow-hidden transition-all duration-300 hover:border-white/20 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
                  
                  {/* En-tête du Ticket */}
                  <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <div>
                      <p className="text-[10px] text-gray-500 tracking-widest uppercase">ID: {ticket.id.split('-')[0]}</p>
                      <p className="text-xs font-bold text-gray-300 mt-1">{formatDate(ticket.created_at)}</p>
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${statusBg} ${statusColor}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        {isWon ? 'Gagné' : isLost ? 'Perdu' : 'En cours'}
                      </span>
                    </div>
                  </div>

                  {/* Liste des Sélections (Matches) */}
                  <div className="p-5 space-y-4 flex-1">
                    {ticket.bet_selections?.map((sel) => (
                      <div key={sel.id} className="flex justify-between items-center">
                        <div className="flex-1 pr-4">
                          <p className="text-sm font-bold font-orbitron truncate">{sel.match_name || `Match #${sel.match_id.substring(0,4)}`}</p>
                          <span className="inline-block mt-1 text-[10px] text-gray-400 bg-black px-2 py-0.5 rounded border border-white/5 uppercase">
                            Pick: {sel.selected_outcome}
                          </span>
                        </div>
                        <div className="font-mono text-sm font-bold text-white bg-white/5 px-2 py-1 rounded">
                          {sel.odds.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Résumé Financier (Footer du Ticket) */}
                  <div className="p-5 bg-black/40 border-t border-white/5 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Mise Initiale</p>
                      <p className="font-mono text-lg font-bold">{ticket.stake}$</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Cote Totale</p>
                      <p className="font-mono text-lg font-bold text-[#00f5ff]">{ticket.total_odds.toFixed(2)}</p>
                    </div>
                    
                    <div className="col-span-2 flex items-center justify-between p-3 rounded-xl border bg-white/5 border-white/10 mt-2">
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{pnlLabel}</p>
                        <p className={`font-mono text-xl font-bold ${statusColor}`}>
                          {pnlValue}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">ROI Cumulé</p>
                        <div className={`flex items-center justify-end gap-1 font-mono text-sm font-bold ${ticket.cumulative_roi >= 0 ? 'text-green-400' : 'text-[#ff00d4]'}`}>
                          {ticket.cumulative_roi >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {ticket.cumulative_roi > 0 ? '+' : ''}{ticket.cumulative_roi}%
                        </div>
                      </div>
                    </div>
                  </div>
                  
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* BOTTOM NAVIGATION (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#12121a]/95 backdrop-blur-3xl border-t border-white/5 pb-safe">
        <div className="flex items-center justify-around py-2 px-2">
          <NavLinks />
        </div>
      </nav>

    </div>
  );
}

