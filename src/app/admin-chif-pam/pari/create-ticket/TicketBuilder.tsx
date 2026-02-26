"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutGrid, Search, CalendarDays, BrainCircuit, 
  FileText, CheckCircle2, AlertCircle, X, Loader2, Coins
} from 'lucide-react';

// --- TYPES ---
interface Match {
  id: string;
  home_team: string;
  away_team: string;
  league: string;
  match_date: string;
  // On assume que ces colonnes existent pour le ticket
  odds_home?: number;
  odds_draw?: number;
  odds_away?: number;
}

interface Selection {
  matchId: string;
  matchName: string;
  pick: 'home' | 'draw' | 'away';
  pickLabel: string;
  odd: number;
}

export default function TicketBuilder({ initialMatches }: { initialMatches: Match[] }) {
  const pathname = usePathname();
  
  // --- ÉTATS DU TICKET ---
  const [selections, setSelections] = useState<Selection[]>([]);
  const [stake, setStake] = useState<number | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  // --- CALCULS DYNAMIQUES ---
  const totalOdds = selections.reduce((acc, curr) => acc * curr.odd, 1);
  const potentialProfit = (typeof stake === 'number' ? stake : 0) * totalOdds;

  // --- ACTIONS ---
  const toggleSelection = (match: Match, pick: 'home' | 'draw' | 'away', odd: number) => {
    setSelections(prev => {
      // Si le match est déjà sélectionné, on le retire ou on le met à jour
      const existing = prev.find(s => s.matchId === match.id);
      if (existing && existing.pick === pick) {
        return prev.filter(s => s.matchId !== match.id); // Désélectionner
      }
      
      const pickLabel = pick === 'home' ? '1' : pick === 'draw' ? 'X' : '2';
      const newSelection = {
        matchId: match.id,
        matchName: `${match.home_team} vs ${match.away_team}`,
        pick,
        pickLabel,
        odd
      };

      if (existing) {
        return prev.map(s => s.matchId === match.id ? newSelection : s); // Mise à jour du pronostic
      }
      return [...prev, newSelection]; // Ajout
    });
  };

  const removeSelection = (matchId: string) => {
    setSelections(prev => prev.filter(s => s.matchId !== matchId));
  };

  const submitTicket = async () => {
    if (selections.length === 0) {
      setFeedback({ type: 'error', msg: "Veuillez sélectionner au moins un match." });
      return;
    }
    if (!stake || stake <= 0) {
      setFeedback({ type: 'error', msg: "Veuillez entrer une mise valide." });
      return;
    }

    setIsLoading(true);
    setFeedback(null);

    try {
      const response = await fetch('/api/create-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selections,
          stake,
          total_odds: parseFloat(totalOdds.toFixed(2)),
          total_profit: parseFloat(potentialProfit.toFixed(2))
        })
      });

      if (!response.ok) throw new Error("Erreur lors de la création du ticket.");

      setFeedback({ type: 'success', msg: "Ticket validé avec succès !" });
      setSelections([]);
      setStake('');
    } catch (err) {
      setFeedback({ type: 'error', msg: "Échec de la validation. Réessayez." });
    } finally {
      setIsLoading(false);
    }
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
      <Link href="/admin-chif-pam/pari/create-ticket" className={`flex flex-col md:flex-row items-center gap-2 p-2 md:p-3 rounded-xl transition-all ${pathname.includes('/create-ticket') ? 'bg-gradient-to-r from-[#00f5ff]/20 to-[#bf00ff]/20 border border-[#00f5ff]/30 text-[#00f5ff] shadow-[0_0_15px_rgba(0,245,255,0.1)]' : 'text-gray-500 hover:bg-white/5'}`}>
        <FileText className="w-6 h-6 md:w-5 md:h-5" />
        <span className="text-[10px] md:text-sm font-medium">Fiche</span>
      </Link>
      <Link href="/admin-chif-pam/pari/historique" className={`flex flex-col md:flex-row items-center gap-2 p-2 md:p-3 rounded-xl transition-all ${pathname.includes('/historique') ? 'bg-[#00f5ff]/10 text-[#00f5ff]' : 'text-gray-500 hover:bg-white/5 hover:text-white'}`}>
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
      <main className="flex-1 md:ml-64 flex flex-col lg:flex-row gap-6 p-4 md:p-8 pb-32 md:pb-8">
        
        {/* LISTE DES MATCHS (Left/Top) */}
        <section className="flex-1 space-y-6">
          <header className="mb-6">
            <h1 className="text-2xl font-orbitron font-bold uppercase tracking-wider neon-underline inline-block">
              Créer un Ticket
            </h1>
            <p className="text-gray-400 text-sm mt-2">Sélectionnez vos pronostics pour générer la fiche.</p>
          </header>

          <div className="space-y-4">
            {initialMatches.length === 0 ? (
              <div className="p-8 text-center text-gray-500 bg-white/5 rounded-2xl border border-white/5">
                Aucun match disponible pour le moment.
              </div>
            ) : (
              initialMatches.map((match) => (
                <div key={match.id} className="bg-[#12121a]/80 backdrop-blur-md border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs text-gray-400 bg-black/50 px-3 py-1 rounded-full border border-white/5 uppercase tracking-widest">
                      {match.league}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-bold font-orbitron">{match.home_team}</span>
                    <span className="text-xs font-bold text-gray-600 bg-black px-2 py-1 rounded">VS</span>
                    <span className="text-lg font-bold font-orbitron">{match.away_team}</span>
                  </div>

                  {/* Boutons de Cotes */}
                  <div className="grid grid-cols-3 gap-3">
                    {(['home', 'draw', 'away'] as const).map((type, idx) => {
                      const oddValue = match[`odds_${type}` as keyof Match] as number || (idx === 0 ? 2.1 : idx === 1 ? 3.2 : 3.5); // Fallback si données absentes
                      const isSelected = selections.some(s => s.matchId === match.id && s.pick === type);
                      const labels = ['1', 'X', '2'];
                      
                      return (
                        <button
                          key={type}
                          onClick={() => toggleSelection(match, type, oddValue)}
                          className={`flex flex-col items-center p-2 rounded-xl transition-all duration-300 border ${
                            isSelected 
                              ? 'bg-gradient-to-br from-[#00f5ff]/20 to-[#bf00ff]/20 border-[#00f5ff]/50 shadow-[0_0_15px_rgba(0,245,255,0.2)]' 
                              : 'bg-black/30 border-white/5 hover:bg-white/5'
                          }`}
                        >
                          <span className={`text-[10px] ${isSelected ? 'text-white' : 'text-gray-500'}`}>{labels[idx]}</span>
                          <span className={`text-sm font-bold ${isSelected ? 'text-[#00f5ff]' : 'text-white'}`}>
                            {oddValue.toFixed(2)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* TICKET SLIP (Right/Bottom) */}
        <aside className="w-full lg:w-96 shrink-0">
          <div className="sticky top-8 bg-gradient-to-b from-[#12121a]/90 to-black/90 backdrop-blur-2xl border border-[#00f5ff]/20 rounded-3xl p-6 shadow-[0_0_30px_rgba(0,245,255,0.05)]">
            <h2 className="text-lg font-orbitron font-bold mb-4 flex items-center gap-2 border-b border-white/10 pb-4">
              <FileText className="text-[#00f5ff]" /> Fiche de Pari
            </h2>

            {/* Liste des sélections */}
            <div className="min-h-[150px] max-h-[300px] overflow-y-auto pr-2 space-y-3 mb-6 custom-scrollbar">
              {selections.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-2 py-8">
                  <LayoutGrid className="w-8 h-8 opacity-20" />
                  <p className="text-xs uppercase tracking-widest text-center">Fiche vide<br/>Sélectionnez une cote</p>
                </div>
              ) : (
                selections.map((sel) => (
                  <div key={sel.matchId} className="bg-white/5 border border-white/10 rounded-xl p-3 relative group">
                    <button 
                      onClick={() => removeSelection(sel.matchId)}
                      className="absolute top-2 right-2 p-1 text-gray-500 hover:text-red-400 bg-black/50 rounded-full transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <p className="text-xs font-bold mb-1 pr-6 truncate">{sel.matchName}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-[#00f5ff] uppercase bg-[#00f5ff]/10 px-2 py-0.5 rounded">
                        Choix : {sel.pickLabel}
                      </span>
                      <span className="font-mono text-sm font-bold text-white">{sel.odd.toFixed(2)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input Mise */}
            <div className="space-y-4 border-t border-white/10 pt-4">
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-widest mb-2 block">Mise (Stake)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Coins className="w-4 h-4 text-gray-500" />
                  </div>
                  <input
                    type="number"
                    min="0"
                    placeholder="Montant à parier"
                    value={stake}
                    onChange={(e) => setStake(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-[#bf00ff] focus:ring-1 focus:ring-[#bf00ff] transition-all"
                  />
                </div>
              </div>

              {/* Résumé Calculs */}
              <div className="bg-black/40 rounded-xl p-4 border border-white/5 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Cote Totale</span>
                  <span className="font-mono text-sm font-bold text-[#00f5ff]">{selections.length > 0 ? totalOdds.toFixed(2) : '0.00'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Gain Potentiel</span>
                  <span className="font-mono text-lg font-bold text-[#bf00ff]">
                    {selections.length > 0 && stake ? potentialProfit.toFixed(2) : '0.00'} $
                  </span>
                </div>
              </div>

              {/* Alert Feedback */}
              {feedback && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${feedback.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
                  {feedback.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                  {feedback.msg}
                </div>
              )}

              {/* Bouton de Validation */}
              <button
                onClick={submitTicket}
                disabled={isLoading || selections.length === 0 || !stake}
                className="w-full relative group overflow-hidden rounded-xl p-4 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#00f5ff] to-[#bf00ff] opacity-80 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center justify-center gap-2 text-black font-bold uppercase tracking-widest">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Générer le Ticket"}
                </div>
              </button>
            </div>
          </div>
        </aside>

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

