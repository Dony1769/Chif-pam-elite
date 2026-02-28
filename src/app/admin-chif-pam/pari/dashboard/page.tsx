"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Sun, Moon, Home, ChevronRight, 
  Target, TrendingUp, Wallet, CheckCircle2, LayoutGrid, Search, FileText, AlertCircle
} from "lucide-react";
import { supabaseServer } from "@/lib/supabase-client";

// ============================================================================
// TYPES STRICTS
// ============================================================================

interface PredictionMatch {
  id: string;
  home_team: string;
  away_team: string;
  time: string;
  league: string;
  flag: string;
  odds: { home: number; draw: number; away: number };
  value_detected?: { pick: string; edge: string; prob: string };
  isLive?: boolean;
}

interface LeagueStat {
  name: string;
  country: string;
  flag: string;
  valueCount: number;
  matches: number;
  color: string;
}

interface DashboardStats {
  roi: string;
  winrate: string;
  bankroll: string;
}

// Interface correspondant à la table pari_predictions
interface DbPredictionRow {
  id: string;
  home_team: string;
  away_team: string;
  league: string;
  match_date: string;
  probability_home: number | null;
  probability_draw: number | null;
  probability_away: number | null;
  value_home: boolean;
  value_draw: boolean;
  value_away: boolean;
  value_detected: boolean;
  edge_home?: number;
  edge_draw?: number;
  edge_away?: number;
}

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

const getFlagFromLeague = (league: string): string => {
  const l = league.toLowerCase();
  if (l.includes("ital") || l.includes("serie")) return "🇮🇹";
  if (l.includes("englan") || l.includes("premier")) return "🏴󠁧󠁢󠁥󠁮󠁧󠁿";
  if (l.includes("spain") || l.includes("liga")) return "🇪🇸";
  if (l.includes("franc") || l.includes("ligue")) return "🇫🇷";
  if (l.includes("german") || l.includes("bundes")) return "🇩🇪";
  if (l.includes("brazil")) return "🇧🇷";
  if (l.includes("portugal")) return "🇵🇹";
  if (l.includes("netherland") || l.includes("dutch")) return "🇳🇱";
  return "⚽"; // Fallback
};

const getLeagueColor = (index: number): string => {
  const colors = [
    "from-green-600 to-green-800",
    "from-purple-600 to-purple-800",
    "from-orange-500 to-red-600",
    "from-blue-500 to-blue-700",
    "from-red-600 to-yellow-500",
    "from-cyan-600 to-blue-800"
  ];
  return colors[index % colors.length];
};

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export default function PariDashboard() {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(true);
  
  // États de données
  const [matches, setMatches] = useState<PredictionMatch[]>([]);
  const [leagues, setLeagues] = useState<LeagueStat[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ roi: "—", winrate: "—", bankroll: "—" });
  
  // États de chargement et d'erreur
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const swipeContainerRef = useRef<HTMLDivElement>(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  // --- LOGIQUE DE RÉCUPÉRATION DES DONNÉES (FETCH) ---
  useEffect(() => {
    let isMounted = true;

    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 1. Définition des bornes de la journée (Aujourd'hui)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // 2. Fetch des matchs du jour (pari_predictions)
        const { data: dbMatches, error: matchError } = await supabase
          .from("pari_predictions")
          .select("*")
          .gte("match_date", today.toISOString())
          .lt("match_date", tomorrow.toISOString())
          .order("value_detected", { ascending: false }) // Les Value Bets en premier
          .limit(10); // Limite au carousel

        if (matchError) throw matchError;

        // 3. Transformation des données
        const mappedMatches: PredictionMatch[] = (dbMatches as DbPredictionRow[] || []).map((row) => {
          // Calcul des cotes implicites depuis les probabilités
          const probH = row.probability_home || 33.33;
          const probD = row.probability_draw || 33.33;
          const probA = row.probability_away || 33.33;

          const oddsHome = Number((1 / (probH / 100)).toFixed(2));
          const oddsDraw = Number((1 / (probD / 100)).toFixed(2));
          const oddsAway = Number((1 / (probA / 100)).toFixed(2));

          // Extraction du Value Bet
          let pick = "";
          let edgeVal = "+Value";
          let probStr = "";

          if (row.value_home) {
            pick = "Home";
            edgeVal = row.edge_home ? `+${row.edge_home}%` : "+Value";
            probStr = `${probH.toFixed(0)}%`;
          } else if (row.value_draw) {
            pick = "Draw";
            edgeVal = row.edge_draw ? `+${row.edge_draw}%` : "+Value";
            probStr = `${probD.toFixed(0)}%`;
          } else if (row.value_away) {
            pick = "Away";
            edgeVal = row.edge_away ? `+${row.edge_away}%` : "+Value";
            probStr = `${probA.toFixed(0)}%`;
          }

          const time = new Date(row.match_date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

          return {
            id: row.id,
            home_team: row.home_team,
            away_team: row.away_team,
            time: time,
            league: row.league,
            flag: getFlagFromLeague(row.league),
            odds: { home: oddsHome, draw: oddsDraw, away: oddsAway },
            value_detected: row.value_detected && pick ? { pick, edge: edgeVal, prob: probStr } : undefined,
            isLive: false // Peut être dynamisé plus tard avec l'API temps réel
          };
        });

        // 4. Génération dynamique des ligues
        const leagueMap = new Map<string, LeagueStat>();
        (dbMatches as DbPredictionRow[] || []).forEach((row, index) => {
          const leagueName = row.league.split(' - ')[1] || row.league; // Simplifie "England - Premier League"
          const country = row.league.split(' - ')[0] || "International";

          if (!leagueMap.has(leagueName)) {
            leagueMap.set(leagueName, {
              name: leagueName,
              country: country,
              flag: getFlagFromLeague(row.league),
              valueCount: 0,
              matches: 0,
              color: getLeagueColor(leagueMap.size)
            });
          }
          
          const lStat = leagueMap.get(leagueName)!;
          lStat.matches += 1;
          if (row.value_detected) lStat.valueCount += 1;
        });

        // 5. Fetch des statistiques globales (bets_tickets)
        const { data: tickets } = await supabase.from("bets_tickets").select("status, total_profit, stake");
        
        let calcRoi = "—";
        let calcWinrate = "—";
        let calcBankroll = "—";

        if (tickets && tickets.length > 0) {
          const wonTickets = tickets.filter(t => t.status === 'won');
          const lostTickets = tickets.filter(t => t.status === 'lost');
          const resolvedTickets = wonTickets.length + lostTickets.length;

          if (resolvedTickets > 0) {
            const winR = (wonTickets.length / resolvedTickets) * 100;
            calcWinrate = `${winR.toFixed(0)}%`;
            
            // Simulation simple: PnL net
            let totalStaked = 0;
            let netProfit = 0;
            
            tickets.forEach(t => {
              if (t.status !== 'pending') totalStaked += t.stake;
              if (t.status === 'won') netProfit += (t.total_profit - t.stake);
              if (t.status === 'lost') netProfit -= t.stake;
            });

            if (totalStaked > 0) {
              const roiVal = (netProfit / totalStaked) * 100;
              calcRoi = `${roiVal > 0 ? '+' : ''}${roiVal.toFixed(1)}%`;
            }

            // Estimation Bankroll (Base 1000 + PnL)
            calcBankroll = `${(1000 + netProfit).toFixed(0)}$`;
          }
        }

        if (isMounted) {
          setMatches(mappedMatches);
          setLeagues(Array.from(leagueMap.values()));
          setStats({ roi: calcRoi, winrate: calcWinrate, bankroll: calcBankroll });
        }

      } catch (err: any) {
        console.error("Erreur Fetch Dashboard:", err);
        if (isMounted) setError("Impossible de charger les données du jour.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchDashboardData();

    return () => { isMounted = false; };
  }, []);

  // Détection du scroll pour les dots du carrousel
  const handleScroll = () => {
    if (!swipeContainerRef.current) return;
    const container = swipeContainerRef.current;
    const scrollPosition = container.scrollLeft;
    const cardWidth = container.offsetWidth * 0.85; 
    const newIndex = Math.round(scrollPosition / cardWidth);
    setActiveCardIndex(newIndex);
  };

  return (
    <div className={`h-full font-inter overflow-x-hidden min-h-screen pb-24 transition-colors duration-500 ${isDark ? 'bg-[#0a0a0f] text-white' : 'bg-gray-50 text-gray-900'}`}>
      
      {/* Background Anime */}
      <div className={`fixed inset-0 pointer-events-none overflow-hidden z-0 transition-opacity duration-500 ${isDark ? 'opacity-100' : 'opacity-30'}`}>
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-cyan-500/10 via-transparent to-transparent rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-purple-500/10 via-transparent to-transparent rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
      </div>

      {/* --- HEADER --- */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${isDark ? 'glass-strong' : 'bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm'}`}>
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => setIsDark(!isDark)} className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 ${isDark ? 'glass' : 'bg-gray-100'}`}>
            {isDark ? <Sun className="w-6 h-6 text-yellow-400" /> : <Moon className="w-6 h-6 text-indigo-600" />}
          </button>
          
          <div className="flex flex-col items-center">
            <span className={`font-orbitron text-lg font-bold tracking-wider ${isDark ? 'neon-text' : 'bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600'}`}>BETIX</span>
            <span className="text-[10px] text-gray-500 tracking-[0.3em]">ANALYTICS</span>
          </div>

          <Link href="/admin-chif-pam/dashboard" className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 ${isDark ? 'glass' : 'bg-gray-100'}`}>
            <Home className={`w-6 h-6 transition-colors duration-300 ${isDark ? 'text-white/80 hover:text-cyan-400' : 'text-gray-600 hover:text-indigo-600'}`} />
          </Link>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="relative z-10 flex-1 overflow-y-auto pt-24 px-4 space-y-8">
        
        {/* CAROUSEL MATCHS */}
        <section className="animate-slide-in" style={{ animationDelay: '0.1s' }}>
          <div className="mb-6 flex justify-between items-end">
            <h2 className={`font-orbitron text-xl font-bold inline-block ${isDark ? 'neon-underline' : 'border-b-4 border-indigo-500 pb-1'}`}>
              Match of the day
            </h2>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" /> {error}
            </div>
          )}

          {!error && matches.length === 0 && !isLoading && (
            <div className={`p-8 text-center rounded-2xl border ${isDark ? 'bg-white/5 border-white/10 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>
              Aucun match disponible aujourd'hui.
            </div>
          )}

          <div 
            ref={swipeContainerRef}
            onScroll={handleScroll}
            className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 -mx-4 px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {/* SKELETON LOADER */}
            {isLoading && Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="snap-center shrink-0 w-[85%] sm:w-[320px] max-w-[340px]">
                <div className={`rounded-2xl p-5 h-[220px] animate-pulse ${isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-200'}`}>
                  <div className="h-4 w-1/3 bg-gray-500/20 rounded mb-6"></div>
                  <div className="flex justify-between items-center mb-6">
                    <div className="w-12 h-12 bg-gray-500/20 rounded-xl"></div>
                    <div className="w-8 h-8 bg-gray-500/20 rounded-full"></div>
                    <div className="w-12 h-12 bg-gray-500/20 rounded-xl"></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="h-12 bg-gray-500/20 rounded-lg"></div>
                    <div className="h-12 bg-gray-500/20 rounded-lg"></div>
                    <div className="h-12 bg-gray-500/20 rounded-lg"></div>
                  </div>
                </div>
              </div>
            ))}

            {/* DYNAMIC MATCHES */}
            {!isLoading && matches.map((match, idx) => (
              <div key={match.id} className="snap-center shrink-0 w-[85%] sm:w-[320px] max-w-[340px]">
                <div className={`rounded-2xl p-5 transition-colors duration-300 ${isDark ? 'glass ' + (idx === 0 && match.value_detected ? 'animate-glow-pulse' : '') : 'bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100'}`}>
                  
                  {/* Badge Ligue & Live */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>{match.flag}</div>
                    <div className="w-32 truncate">
                      <p className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{match.league}</p>
                    </div>
                    {match.isLive && (
                      <div className="ml-auto px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20">
                        <span className="text-[10px] text-red-500 font-bold">● LIVE</span>
                      </div>
                    )}
                  </div>

                  {/* Equipes */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col items-center gap-2 w-1/3">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-orbitron font-bold text-lg ${isDark ? 'glass' : 'bg-gray-50 border border-gray-200'}`}>
                        {match.home_team.substring(0,3).toUpperCase()}
                      </div>
                      <span className="text-[11px] font-semibold text-center truncate w-full">{match.home_team}</span>
                    </div>
                    
                    <div className="flex flex-col items-center w-1/3">
                      <div className={`text-xl font-orbitron font-bold ${isDark ? 'neon-text' : 'text-indigo-600'}`}>VS</div>
                      <div className={`text-xs mt-1 font-mono ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{match.time}</div>
                    </div>
                    
                    <div className="flex flex-col items-center gap-2 w-1/3">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-orbitron font-bold text-lg ${isDark ? 'glass' : 'bg-gray-50 border border-gray-200'}`}>
                        {match.away_team.substring(0,3).toUpperCase()}
                      </div>
                      <span className="text-[11px] font-semibold text-center truncate w-full">{match.away_team}</span>
                    </div>
                  </div>

                  {/* Cotes */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {['home', 'draw', 'away'].map((type, i) => (
                      <div key={type} className={`rounded-lg p-2 text-center transition-colors ${isDark ? 'glass hover:bg-white/10' : 'bg-gray-50 border border-gray-100 hover:bg-indigo-50'}`}>
                        <p className={`text-[10px] uppercase ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{['1', 'X', '2'][i]}</p>
                        <p className={`text-sm font-bold font-mono ${isDark ? ['text-cyan-400', 'text-white', 'text-pink-400'][i] : 'text-gray-900'}`}>
                          {match.odds[type as keyof typeof match.odds].toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Value Bet Detector */}
                  {match.value_detected ? (
                    <div className={`flex items-center justify-between p-3 rounded-xl border ${isDark ? 'bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border-cyan-500/20' : 'bg-indigo-50 border-indigo-100'}`}>
                      <div className="flex items-center gap-2">
                        <Target className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-indigo-500'}`} />
                        <span className={`text-[11px] ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Value: <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{match.value_detected.pick}</span></span>
                      </div>
                      <div className="px-2 py-1 rounded-full bg-green-500/20 border border-green-500/30">
                        <span className="text-[10px] text-green-600 dark:text-green-400 font-bold">{match.value_detected.edge}</span>
                      </div>
                    </div>
                  ) : (
                    <div className={`flex items-center justify-center p-3 rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                      <span className="text-[11px] text-gray-500">Pas de valeur détectée</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Pagination Dots */}
          {!isLoading && matches.length > 0 && (
            <div className="flex justify-center gap-2 mt-2">
              {matches.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${activeCardIndex === idx ? (isDark ? 'w-8 bg-gradient-to-r from-cyan-400 to-purple-500' : 'w-8 bg-indigo-500') : (isDark ? 'w-2 bg-white/20' : 'w-2 bg-gray-300')}`} 
                />
              ))}
            </div>
          )}
        </section>

        {/* STATS RAPIDES */}
        <section className="animate-slide-in grid grid-cols-3 gap-3" style={{ animationDelay: '0.2s' }}>
          {[
            { label: "ROI Global", value: stats.roi, icon: TrendingUp, color: "green" },
            { label: "Winrate", value: stats.winrate, icon: CheckCircle2, color: "blue" },
            { label: "Bankroll", value: stats.bankroll, icon: Wallet, color: "purple" }
          ].map((stat, i) => (
            <div key={i} className={`rounded-xl p-3 text-center transition-colors duration-300 ${isDark ? 'glass' : 'bg-white shadow-sm border border-gray-100'}`}>
              <div className={`w-10 h-10 mx-auto mb-2 rounded-lg flex items-center justify-center ${isDark ? `bg-${stat.color}-500/20` : `bg-${stat.color}-100`}`}>
                <stat.icon className={`w-5 h-5 ${isDark ? `text-${stat.color}-400` : `text-${stat.color}-600`}`} />
              </div>
              <p className={`text-lg font-bold ${isDark ? `text-${stat.color}-400` : 'text-gray-900'}`}>{isLoading ? "..." : stat.value}</p>
              <p className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{stat.label}</p>
            </div>
          ))}
        </section>

        {/* LISTE DES LIGUES */}
        <section className="animate-slide-in pb-10" style={{ animationDelay: '0.3s' }}>
          <h3 className="font-orbitron text-lg font-semibold mb-4 flex items-center gap-2">
            <span className={isDark ? "neon-text" : ""}>⚽</span> Ligues du jour
          </h3>
          
          <div className="space-y-3">
            {isLoading && Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`rounded-xl p-4 h-20 animate-pulse ${isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-200'}`}></div>
            ))}

            {!isLoading && leagues.length === 0 && (
              <p className="text-sm text-gray-500 italic">Aucune ligue analysée aujourd'hui.</p>
            )}

            {!isLoading && leagues.map((league, idx) => (
              <div key={idx} className={`rounded-xl p-4 flex items-center gap-4 cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${isDark ? 'glass hover:border-cyan-500/30' : 'bg-white shadow-sm border border-gray-100 hover:border-indigo-300'}`}>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${league.color} flex items-center justify-center flex-shrink-0 text-2xl shadow-inner`}>
                  {league.flag}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">{league.name}</h4>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{league.country} • {league.matches} matchs</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full border ${isDark ? 'bg-green-500/20 text-green-400 border-green-500/20' : 'bg-green-50 text-green-600 border-green-100'}`}>
                    {league.valueCount} Value
                  </span>
                  <ChevronRight className={`w-5 h-5 ${isDark ? 'text-cyan-400' : 'text-gray-400'}`} />
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* --- BOTTOM NAVIGATION --- */}
      <nav className={`fixed bottom-0 left-0 right-0 z-50 transition-colors duration-300 pb-safe ${isDark ? 'glass-strong border-t border-white/5' : 'bg-white/90 backdrop-blur-md border-t border-gray-200 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]'}`}>
        <div className="flex items-center justify-around py-2 px-2">
          
          <Link href="/admin-chif-pam/pari/dashboard" className="nav-item flex flex-col items-center gap-1 p-2 rounded-xl">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pathname.includes('/dashboard') ? (isDark ? 'bg-gradient-to-br from-cyan-500/20 to-purple-500/20' : 'bg-indigo-50') : ''}`}>
              <LayoutGrid className={`w-6 h-6 ${pathname.includes('/dashboard') ? (isDark ? 'text-cyan-400' : 'text-indigo-600') : 'text-gray-400'}`} />
            </div>
            <span className={`text-[10px] ${pathname.includes('/dashboard') ? (isDark ? 'text-cyan-400 font-medium' : 'text-indigo-600 font-bold') : 'text-gray-400'}`}>Libre</span>
          </Link>

          <Link href="/admin-chif-pam/pari/create-ticket" className="nav-item flex flex-col items-center gap-1 p-2 rounded-xl">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pathname.includes('/create-ticket') ? (isDark ? 'bg-gradient-to-br from-cyan-500/20 to-purple-500/20' : 'bg-indigo-50') : ''}`}>
              <FileText className={`w-6 h-6 ${pathname.includes('/create-ticket') ? (isDark ? 'text-cyan-400' : 'text-indigo-600') : 'text-gray-400'}`} />
            </div>
            <span className={`text-[10px] ${pathname.includes('/create-ticket') ? (isDark ? 'text-cyan-400 font-medium' : 'text-indigo-600 font-bold') : 'text-gray-400'}`}>Fiche</span>
          </Link>

          <Link href="/admin-chif-pam/pari/historique" className="nav-item flex flex-col items-center gap-1 p-2 rounded-xl">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pathname.includes('/historique') ? (isDark ? 'bg-gradient-to-br from-cyan-500/20 to-purple-500/20' : 'bg-indigo-50') : ''}`}>
              <CalendarDays className={`w-6 h-6 ${pathname.includes('/historique') ? (isDark ? 'text-cyan-400' : 'text-indigo-600') : 'text-gray-400'}`} />
            </div>
            <span className={`text-[10px] ${pathname.includes('/historique') ? (isDark ? 'text-cyan-400 font-medium' : 'text-indigo-600 font-bold') : 'text-gray-400'}`}>Calendrier</span>
          </Link>

          <Link href="/admin-chif-pam/pari/analyse" className="nav-item flex flex-col items-center gap-1 p-2 rounded-xl">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pathname.includes('/analyse') ? (isDark ? 'bg-gradient-to-br from-cyan-500/20 to-purple-500/20' : 'bg-indigo-50') : ''}`}>
              <Search className={`w-6 h-6 ${pathname.includes('/analyse') ? (isDark ? 'text-cyan-400' : 'text-indigo-600') : 'text-gray-400'}`} />
            </div>
            <span className={`text-[10px] ${pathname.includes('/analyse') ? (isDark ? 'text-cyan-400 font-medium' : 'text-indigo-600 font-bold') : 'text-gray-400'}`}>Analyse</span>
          </Link>

        </div>
      </nav>
    </div>
  );
}

// Composant pour l'icône calendrier
function CalendarDays(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}
