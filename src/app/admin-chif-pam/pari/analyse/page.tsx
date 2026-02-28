import React from 'react';
import Link from 'next/link';
import { supabaseServer } from '@/lib/server-supabase';
import { 
  BarChart3, 
  Target, 
  TrendingUp, 
  AlertCircle, 
  CalendarDays, 
  Activity,
  Zap,
  LayoutGrid,
  Search,
  FileText
} from 'lucide-react';

// ============================================================================
// TYPES STRICTS
// ============================================================================

export type LeagueCode = 
  | "WC" | "CL" | "BL1" | "DED" | "BSA" 
  | "PD" | "FL1" | "ELC" | "PPL" | "EC" 
  | "SA" | "PL";

interface PariPrediction {
  id: string;
  home_team: string;
  away_team: string;
  league: string;
  match_date: string;
  expected_goals_home: number | null;
  expected_goals_away: number | null;
  probability_home: number | null;
  probability_draw: number | null;
  probability_away: number | null;
  over25_prob: number | null;
  value_home: boolean;
  value_draw: boolean;
  value_away: boolean;
  value_detected: boolean;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const LEAGUES: { code: LeagueCode; name: string }[] = [
  { code: "WC", name: "FIFA World Cup" },
  { code: "CL", name: "UEFA Champions League" },
  { code: "BL1", name: "Bundesliga" },
  { code: "DED", name: "Eredivisie" },
  { code: "BSA", name: "Brazil Serie A" },
  { code: "PD", name: "La Liga" },
  { code: "FL1", name: "Ligue 1" },
  { code: "ELC", name: "Championship" },
  { code: "PPL", name: "Primeira Liga" },
  { code: "EC", name: "Euro Championship" },
  { code: "SA", name: "Serie A" },
  { code: "PL", name: "Premier League" }
];

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

const formatPct = (value: number | null) => {
  if (value === null || value === undefined) return '0%';
  return `${value.toFixed(0)}%`; 
};

const formatXG = (value: number | null) => {
  if (value === null || value === undefined) return '0.00';
  return value.toFixed(2);
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

// ============================================================================
// COMPOSANT SERVEUR PRINCIPAL
// ============================================================================

export const dynamic = 'force-dynamic';

export default async function AnalysePage(props: { 
  searchParams: Promise<{ league?: LeagueCode }> | { league?: LeagueCode } 
}) {
  // Gestion de la compatibilité Next.js 14 / 15+ pour searchParams
  const searchParams = await props.searchParams;
  const selectedLeagueCode = searchParams?.league;
  
  const selectedLeagueObj = LEAGUES.find(l => l.code === selectedLeagueCode);
  const selectedLeagueName = selectedLeagueObj?.name;

  const supabase = await supabaseServer();
  const today = new Date().toISOString();

  // 1. REQUÊTE SUPABASE DYNAMIQUE
  let query = supabase
    .from('pari_predictions')
    .select('*')
    .gte('match_date', today)
    .order('probability_home', { ascending: false });

  if (selectedLeagueName) {
    // On utilise ilike pour s'assurer que ça matche même si la DB a "England - Premier League"
    query = query.ilike('league', `%${selectedLeagueName}%`);
  }

  const { data: matches, error } = await query;

  if (error) {
    console.error("Erreur lors de la récupération des prédictions :", error);
  }

  const predictions: PariPrediction[] = matches || [];

  // 2. CALCUL DES STATISTIQUES DYNAMIQUES (Côté Serveur)
  const totalMatches = predictions.length;
  const totalValueDetected = predictions.filter(p => p.value_detected).length;
  const averageProbabilityHome = totalMatches 
    ? predictions.reduce((acc, p) => acc + (p.probability_home || 0), 0) / totalMatches 
    : 0;
  const averageOver25 = totalMatches 
    ? predictions.reduce((acc, p) => acc + (p.over25_prob || 0), 0) / totalMatches 
    : 0;

  // 3. COMPOSANT NAVIGATION (Réutilisable)
  const NavLinks = () => (
    <>
      <Link href="/admin-chif-pam/pari/dashboard" className="flex flex-col md:flex-row items-center gap-2 p-2 md:p-3 rounded-xl transition-all text-gray-500 hover:bg-white/5 hover:text-white">
        <LayoutGrid className="w-6 h-6 md:w-5 md:h-5" />
        <span className="text-[10px] md:text-sm font-medium">Dashboard</span>
      </Link>
      <Link href="/admin-chif-pam/pari/analyse" className="flex flex-col md:flex-row items-center gap-2 p-2 md:p-3 rounded-xl transition-all bg-[#00f5ff]/10 text-[#00f5ff] border border-[#00f5ff]/30 shadow-[0_0_15px_rgba(0,245,255,0.1)]">
        <Search className="w-6 h-6 md:w-5 md:h-5" />
        <span className="text-[10px] md:text-sm font-medium">Analyse</span>
      </Link>
      <Link href="/admin-chif-pam/pari/create-ticket" className="flex flex-col md:flex-row items-center gap-2 p-2 md:p-3 rounded-xl transition-all text-gray-500 hover:bg-white/5 hover:text-white">
        <FileText className="w-6 h-6 md:w-5 md:h-5" />
        <span className="text-[10px] md:text-sm font-medium">Fiche</span>
      </Link>
      <Link href="/admin-chif-pam/pari/historique" className="flex flex-col md:flex-row items-center gap-2 p-2 md:p-3 rounded-xl transition-all text-gray-500 hover:bg-white/5 hover:text-white">
        <CalendarDays className="w-6 h-6 md:w-5 md:h-5" />
        <span className="text-[10px] md:text-sm font-medium">Historique</span>
      </Link>
    </>
  );

  return (
    <div className="flex min-h-screen bg-[#050508] text-white font-inter">
      
      {/* Background Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#00f5ff]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] right-[-10%] w-[400px] h-[400px] bg-[#bf00ff]/5 rounded-full blur-[100px]" />
      </div>

      {/* SIDEBAR ADMIN FIXE (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 bg-[#12121a]/90 backdrop-blur-2xl border-r border-white/10 p-6 z-50">
        <div className="mb-10">
          <span className="font-orbitron text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-[#00f5ff] to-[#bf00ff]">BETIX</span>
          <p className="text-xs text-gray-500 tracking-[0.2em] uppercase mt-1">Console</p>
        </div>
        <nav className="flex flex-col gap-2">
          <NavLinks />
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="relative z-10 flex-1 md:ml-64 px-4 pt-8 pb-32">
        <div className="max-w-7xl mx-auto">
          
          {/* HEADER */}
          <header className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
                <BarChart3 className="w-6 h-6 text-[#00f5ff]" />
              </div>
              <div>
                <h1 className="text-2xl font-orbitron font-bold uppercase tracking-wider">
                  Betting <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#00f5ff] to-[#bf00ff]">Engine</span>
                </h1>
                <p className="text-xs text-gray-400 tracking-widest uppercase mt-1">
                  Analyse Statistique Avancée
                </p>
              </div>
            </div>
          </header>

          {/* STATS DYNAMIQUES */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md text-center">
              <Activity className="w-5 h-5 text-gray-400 mx-auto mb-2" />
              <p className="text-2xl font-bold">{totalMatches}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Matchs Analysés</p>
            </div>
            <div className="bg-[#00f5ff]/10 border border-[#00f5ff]/20 rounded-2xl p-4 backdrop-blur-md text-center">
              <Zap className="w-5 h-5 text-[#00f5ff] mx-auto mb-2" />
              <p className="text-2xl font-bold text-[#00f5ff]">{totalValueDetected}</p>
              <p className="text-[10px] text-[#00f5ff]/70 uppercase tracking-widest mt-1">Value Bets</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md text-center">
              <Target className="w-5 h-5 text-gray-400 mx-auto mb-2" />
              <p className="text-2xl font-bold">{formatPct(averageProbabilityHome)}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Moy. Proba Home</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md text-center">
              <TrendingUp className="w-5 h-5 text-gray-400 mx-auto mb-2" />
              <p className="text-2xl font-bold">{formatPct(averageOver25)}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Moy. Over 2.5</p>
            </div>
          </section>

          {/* FILTRE CHAMPIONNATS (100% SSR via URL) */}
          <section className="mb-8">
            <div className="flex gap-2 overflow-x-auto pb-4 custom-scrollbar">
              <Link 
                href="/admin-chif-pam/pari/analyse"
                className={`px-4 py-2 rounded-xl text-xs font-bold tracking-widest uppercase transition-all whitespace-nowrap border ${
                  !selectedLeagueCode 
                    ? 'bg-white/10 border-white/20 text-white shadow-lg' 
                    : 'bg-transparent border-transparent text-gray-500 hover:bg-white/5 hover:text-gray-300'
                }`}
              >
                Tous
              </Link>
              {LEAGUES.map((league) => (
                <Link 
                  key={league.code}
                  href={`/admin-chif-pam/pari/analyse?league=${league.code}`}
                  className={`px-4 py-2 rounded-xl text-xs font-bold tracking-widest uppercase transition-all whitespace-nowrap border ${
                    selectedLeagueCode === league.code 
                      ? 'bg-[#00f5ff]/10 border-[#00f5ff]/30 text-[#00f5ff] shadow-[0_0_10px_rgba(0,245,255,0.1)]' 
                      : 'bg-transparent border-transparent text-gray-500 hover:bg-white/5 hover:text-gray-300'
                  }`}
                >
                  {league.name}
                </Link>
              ))}
            </div>
          </section>

          {/* EMPTY STATE */}
          {predictions.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center p-12 mt-10 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md text-center">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
                <AlertCircle className="w-10 h-10 text-gray-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">Aucun match analysé</h3>
              <p className="text-gray-400 text-sm max-w-md">
                Le moteur de prédiction n'a trouvé aucun match correspondant à vos critères pour le moment.
              </p>
            </div>
          )}

          {/* GRILLE DES MATCHS (UI Inchangée) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {predictions.map((match) => (
              <article 
                key={match.id} 
                className="bg-[#12121a]/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 flex flex-col relative overflow-hidden transition-all duration-300 hover:border-white/20 hover:shadow-[0_8px_30px_rgba(0,245,255,0.05)]"
              >
                
                {match.value_detected && (
                  <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 blur-[50px] pointer-events-none rounded-full" />
                )}

                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                      {match.league}
                    </span>
                    <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                      <CalendarDays className="w-3.5 h-3.5" />
                      {formatDate(match.match_date)}
                    </div>
                  </div>

                  {match.value_detected && (
                    <div className="flex items-center gap-1.5 bg-green-500/20 border border-green-500/30 text-green-400 px-3 py-1.5 rounded-full shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                      <Zap className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Value</span>
                    </div>
                  )}
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold font-orbitron">{match.home_team}</span>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-gray-500 uppercase">xG Home</span>
                      <span className="font-mono text-[#00f5ff] font-bold bg-[#00f5ff]/10 px-2 py-0.5 rounded text-sm">
                        {formatXG(match.expected_goals_home)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-full h-px bg-white/10" />
                    <span className="bg-[#12121a] px-3 text-xs text-gray-600 font-bold italic z-10">VS</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold font-orbitron">{match.away_team}</span>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-gray-500 uppercase">xG Away</span>
                      <span className="font-mono text-[#bf00ff] font-bold bg-[#bf00ff]/10 px-2 py-0.5 rounded text-sm">
                        {formatXG(match.expected_goals_away)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 mb-4">
                  <h4 className="text-[10px] text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5" /> Probabilités du modèle
                  </h4>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div className={`flex flex-col items-center justify-center p-2 rounded-xl border ${match.value_home ? 'bg-[#00f5ff]/10 border-[#00f5ff]/30 shadow-[0_0_10px_rgba(0,245,255,0.1)]' : 'bg-black/20 border-white/5'}`}>
                      <span className="text-[9px] text-gray-500 mb-1">1</span>
                      <span className={`text-sm font-bold ${match.value_home ? 'text-[#00f5ff]' : 'text-white'}`}>
                        {formatPct(match.probability_home)}
                      </span>
                      {match.value_home && <span className="text-[8px] text-[#00f5ff] uppercase mt-1">Edge</span>}
                    </div>
                    
                    <div className={`flex flex-col items-center justify-center p-2 rounded-xl border ${match.value_draw ? 'bg-green-500/10 border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.1)]' : 'bg-black/20 border-white/5'}`}>
                      <span className="text-[9px] text-gray-500 mb-1">X</span>
                      <span className={`text-sm font-bold ${match.value_draw ? 'text-green-400' : 'text-white'}`}>
                        {formatPct(match.probability_draw)}
                      </span>
                      {match.value_draw && <span className="text-[8px] text-green-400 uppercase mt-1">Edge</span>}
                    </div>
                    
                    <div className={`flex flex-col items-center justify-center p-2 rounded-xl border ${match.value_away ? 'bg-[#bf00ff]/10 border-[#bf00ff]/30 shadow-[0_0_10px_rgba(191,0,255,0.1)]' : 'bg-black/20 border-white/5'}`}>
                      <span className="text-[9px] text-gray-500 mb-1">2</span>
                      <span className={`text-sm font-bold ${match.value_away ? 'text-[#bf00ff]' : 'text-white'}`}>
                        {formatPct(match.probability_away)}
                      </span>
                      {match.value_away && <span className="text-[8px] text-[#bf00ff] uppercase mt-1">Edge</span>}
                    </div>
                  </div>
                </div>

                <div className="mt-auto flex items-center justify-between p-3 bg-black/30 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-400">Over 2.5 Goals</span>
                  </div>
                  <div className="font-mono text-sm font-bold text-white">
                    {formatPct(match.over25_prob)}
                  </div>
                </div>

              </article>
            ))}
          </div>

        </div>
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
