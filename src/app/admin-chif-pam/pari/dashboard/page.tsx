"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Sun, Moon, Home, ChevronRight, 
  Target, TrendingUp, Wallet, CheckCircle2, LayoutGrid, Search, FileText 
} from "lucide-react";

// --- TYPES (Basés sur ton architecture BDD) ---
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

// --- MOCK DATA ---
const TOP_MATCHES: PredictionMatch[] = [
  {
    id: "m1", home_team: "Inter", away_team: "Milan", time: "20:45", league: "Serie A", flag: "🇮🇹",
    odds: { home: 2.10, draw: 3.40, away: 3.60 },
    value_detected: { pick: "Home", edge: "+12.3%", prob: "53%" },
    isLive: true
  },
  {
    id: "m2", home_team: "Barça", away_team: "Real", time: "21:00", league: "La Liga", flag: "🇪🇸",
    odds: { home: 2.50, draw: 3.20, away: 2.80 },
    value_detected: { pick: "Over 2.5", edge: "+8.5%", prob: "68%" }
  },
  {
    id: "m3", home_team: "PSG", away_team: "OM", time: "20:00", league: "Ligue 1", flag: "🇫🇷",
    odds: { home: 1.45, draw: 4.50, away: 6.50 },
    value_detected: { pick: "PSG xG+1.2", edge: "+5.1%", prob: "72%" }
  }
];

const LEAGUES = [
  { name: "Serie A", country: "Italie", flag: "🇮🇹", valueCount: 3, matches: 12, color: "from-green-600 to-green-800" },
  { name: "Premier League", country: "Angleterre", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", valueCount: 5, matches: 10, color: "from-purple-600 to-purple-800" },
  { name: "La Liga", country: "Espagne", flag: "🇪🇸", valueCount: 2, matches: 10, color: "from-orange-500 to-red-600" },
  { name: "Ligue 1", country: "France", flag: "🇫🇷", valueCount: 4, matches: 9, color: "from-blue-500 to-blue-700" },
  { name: "Bundesliga", country: "Allemagne", flag: "🇩🇪", valueCount: 1, matches: 9, color: "from-red-600 to-yellow-500" },
];

export default function PariDashboard() {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(true);
  const swipeContainerRef = useRef<HTMLDivElement>(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  // Gestion du thème
  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDark]);

  // Détection du scroll pour les dots du carrousel
  const handleScroll = () => {
    if (!swipeContainerRef.current) return;
    const container = swipeContainerRef.current;
    const scrollPosition = container.scrollLeft;
    const cardWidth = container.offsetWidth * 0.85; // 85% width based on CSS
    const newIndex = Math.round(scrollPosition / cardWidth);
    setActiveCardIndex(newIndex);
  };

  return (
    <div className="h-full font-inter bg-dark-bg text-white overflow-x-hidden min-h-screen pb-24">
      
      {/* Background Anime */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-neon-cyan/10 via-transparent to-transparent rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-neon-purple/10 via-transparent to-transparent rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
      </div>

      {/* --- HEADER --- */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-strong">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => setIsDark(!isDark)} className="relative w-12 h-12 rounded-xl glass flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 group">
            {isDark ? <Moon className="w-6 h-6 text-neon-cyan" /> : <Sun className="w-6 h-6 text-yellow-400" />}
          </button>
          
          <div className="flex flex-col items-center">
            <span className="font-orbitron text-lg font-bold neon-text tracking-wider">BETIX</span>
            <span className="text-[10px] text-gray-500 tracking-[0.3em]">ANALYTICS</span>
          </div>

          <Link href="/admin-chifpam/dashboard" className="relative w-12 h-12 rounded-xl glass flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 group">
            <Home className="w-6 h-6 text-white/80 group-hover:text-neon-cyan transition-colors duration-300" />
          </Link>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="relative z-10 flex-1 overflow-y-auto pt-24 px-4 space-y-8">
        
        {/* CAROUSEL MATCHS (pari_predictions) */}
        <section className="animate-slide-in" style={{ animationDelay: '0.1s' }}>
          <div className="mb-6">
            <h2 className="font-orbitron text-xl font-bold neon-underline inline-block">Match of the day</h2>
          </div>

          <div 
            ref={swipeContainerRef}
            onScroll={handleScroll}
            className="swipe-container flex gap-4 pb-4 -mx-4 px-4"
          >
            {TOP_MATCHES.map((match, idx) => (
              <div key={match.id} className="swipe-card w-[85%] min-w-[280px] max-w-[340px]">
                <div className={`glass rounded-2xl p-5 ${idx === 0 ? 'animate-glow-pulse' : ''}`}>
                  {/* Badge Ligue & Live */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-xs">{match.flag}</div>
                    <div>
                      <p className="text-xs text-gray-400">{match.league}</p>
                    </div>
                    {match.isLive && (
                      <div className="ml-auto px-2 py-1 rounded-full bg-red-500/20 border border-red-500/30">
                        <span className="text-[10px] text-red-400 font-medium">● LIVE</span>
                      </div>
                    )}
                  </div>

                  {/* Equipes */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-16 h-16 rounded-xl glass flex items-center justify-center font-orbitron font-bold">{match.home_team.substring(0,3).toUpperCase()}</div>
                      <span className="text-sm font-semibold">{match.home_team}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="text-2xl font-orbitron font-bold neon-text">VS</div>
                      <div className="text-xs text-gray-500 mt-1">{match.time}</div>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-16 h-16 rounded-xl glass flex items-center justify-center font-orbitron font-bold">{match.away_team.substring(0,3).toUpperCase()}</div>
                      <span className="text-sm font-semibold">{match.away_team}</span>
                    </div>
                  </div>

                  {/* Cotes */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="glass rounded-lg p-2 text-center hover:bg-neon-cyan/10">
                      <p className="text-[10px] text-gray-500">1</p>
                      <p className="text-lg font-bold text-neon-cyan">{match.odds.home}</p>
                    </div>
                    <div className="glass rounded-lg p-2 text-center hover:bg-neon-purple/10">
                      <p className="text-[10px] text-gray-500">X</p>
                      <p className="text-lg font-bold text-white">{match.odds.draw}</p>
                    </div>
                    <div className="glass rounded-lg p-2 text-center hover:bg-neon-pink/10">
                      <p className="text-[10px] text-gray-500">2</p>
                      <p className="text-lg font-bold text-neon-pink">{match.odds.away}</p>
                    </div>
                  </div>

                  {/* Value Bet Detector */}
                  {match.value_detected && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-neon-cyan/10 to-neon-purple/10 border border-neon-cyan/20">
                      <div className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-neon-cyan" />
                        <span className="text-xs text-gray-300">Value: <span className="text-white font-bold">{match.value_detected.pick}</span></span>
                      </div>
                      <div className="px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30">
                        <span className="text-xs text-green-400 font-bold">{match.value_detected.edge} Edge</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Pagination Dots */}
          <div className="flex justify-center gap-2 mt-2">
            {TOP_MATCHES.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-1.5 rounded-full transition-all duration-300 ${activeCardIndex === idx ? 'w-8 bg-gradient-to-r from-neon-cyan to-neon-purple' : 'w-2 bg-white/20'}`} 
              />
            ))}
          </div>
        </section>

        {/* STATS RAPIDES (bets_tickets) */}
        <section className="animate-slide-in grid grid-cols-3 gap-3" style={{ animationDelay: '0.2s' }}>
          <div className="glass rounded-xl p-3 text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-green-500/20 flex items-center justify-center">
              <TrendingUp className="text-green-400 w-5 h-5" />
            </div>
            <p className="text-xl font-bold text-green-400">+18.5%</p>
            <p className="text-[10px] text-gray-500">ROI Global</p>
          </div>
          <div className="glass rounded-xl p-3 text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-neon-cyan/20 flex items-center justify-center">
              <CheckCircle2 className="text-neon-cyan w-5 h-5" />
            </div>
            <p className="text-xl font-bold text-neon-cyan">67%</p>
            <p className="text-[10px] text-gray-500">Winrate</p>
          </div>
          <div className="glass rounded-xl p-3 text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-neon-purple/20 flex items-center justify-center">
              <Wallet className="text-neon-purple w-5 h-5" />
            </div>
            <p className="text-xl font-bold text-neon-purple">1,250$</p>
            <p className="text-[10px] text-gray-500">Bankroll</p>
          </div>
        </section>

        {/* LISTE DES LIGUES */}
        <section className="animate-slide-in pb-10" style={{ animationDelay: '0.3s' }}>
          <h3 className="font-orbitron text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="neon-text">⚽</span> Ligues Disponibles
          </h3>
          <div className="space-y-3">
            {LEAGUES.map((league, idx) => (
              <div key={idx} className="glass rounded-xl p-4 flex items-center gap-4 cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] hover:border-neon-cyan/30">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${league.color} flex items-center justify-center flex-shrink-0 text-2xl`}>
                  {league.flag}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-white">{league.name}</h4>
                  <p className="text-xs text-gray-500">{league.country} • {league.matches} matchs</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/20">
                    {league.valueCount} Value
                  </span>
                  <ChevronRight className="w-5 h-5 text-neon-cyan" />
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* --- BOTTOM NAVIGATION --- */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-white/5 pb-safe">
        <div className="flex items-center justify-around py-2 px-2">
          
          <Link href="/pari" className="nav-item flex flex-col items-center gap-1 p-2 rounded-xl">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pathname === '/pari' ? 'bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20' : ''}`}>
              <LayoutGrid className={`w-6 h-6 ${pathname === '/pari' ? 'text-neon-cyan' : 'text-gray-500'}`} />
            </div>
            <span className={`text-[10px] ${pathname === '/pari' ? 'text-neon-cyan font-medium' : 'text-gray-500'}`}>Libre</span>
          </Link>

          <Link href="/pari/create-ticket" className="nav-item flex flex-col items-center gap-1 p-2 rounded-xl">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pathname === '/pari/create-ticket' ? 'bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20' : ''}`}>
              <FileText className={`w-6 h-6 ${pathname === '/pari/create-ticket' ? 'text-neon-cyan' : 'text-gray-500'}`} />
            </div>
            <span className={`text-[10px] ${pathname === '/pari/create-ticket' ? 'text-neon-cyan font-medium' : 'text-gray-500'}`}>Fiche</span>
          </Link>

          <Link href="/pari/historique" className="nav-item flex flex-col items-center gap-1 p-2 rounded-xl">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pathname === '/pari/historique' ? 'bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20' : ''}`}>
              <CalendarDays className={`w-6 h-6 ${pathname === '/pari/historique' ? 'text-neon-cyan' : 'text-gray-500'}`} />
            </div>
            <span className={`text-[10px] ${pathname === '/pari/historique' ? 'text-neon-cyan font-medium' : 'text-gray-500'}`}>Calendrier</span>
          </Link>

          <Link href="/pari/analyse" className="nav-item flex flex-col items-center gap-1 p-2 rounded-xl">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pathname === '/pari/analyse' ? 'bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20' : ''}`}>
              <Search className={`w-6 h-6 ${pathname === '/pari/analyse' ? 'text-neon-cyan' : 'text-gray-500'}`} />
            </div>
            <span className={`text-[10px] ${pathname === '/pari/analyse' ? 'text-neon-cyan font-medium' : 'text-gray-500'}`}>Analyse</span>
          </Link>

        </div>
      </nav>
    </div>
  );
}

// Composant pour l'icône calendrier (si lucide-react ne l'exporte pas par défaut)
function CalendarDays(props: any) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}
