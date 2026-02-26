"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Sun, Moon, Home, ChevronRight, 
  Target, TrendingUp, Wallet, CheckCircle2, LayoutGrid, Search, FileText 
} from "lucide-react";

// --- TYPES ---
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

  // Détection du scroll pour les dots du carrousel
  const handleScroll = () => {
    if (!swipeContainerRef.current) return;
    const container = swipeContainerRef.current;
    const scrollPosition = container.scrollLeft;
    // On calcule la largeur de la carte + le gap pour trouver l'index
    const cardWidth = container.offsetWidth * 0.85; 
    const newIndex = Math.round(scrollPosition / cardWidth);
    setActiveCardIndex(newIndex);
  };

  return (
    // CONTENEUR PRINCIPAL : Changement dynamique des couleurs de fond
    <div className={`h-full font-inter overflow-x-hidden min-h-screen pb-24 transition-colors duration-500 ${isDark ? 'bg-[#0a0a0f] text-white' : 'bg-gray-50 text-gray-900'}`}>
      
      {/* Background Anime (Visible surtout en mode sombre) */}
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

          <Link href="/admin-chifpam/dashboard" className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 ${isDark ? 'glass' : 'bg-gray-100'}`}>
            <Home className={`w-6 h-6 transition-colors duration-300 ${isDark ? 'text-white/80 hover:text-cyan-400' : 'text-gray-600 hover:text-indigo-600'}`} />
          </Link>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="relative z-10 flex-1 overflow-y-auto pt-24 px-4 space-y-8">
        
        {/* CAROUSEL MATCHS */}
        <section className="animate-slide-in" style={{ animationDelay: '0.1s' }}>
          <div className="mb-6">
            <h2 className={`font-orbitron text-xl font-bold inline-block ${isDark ? 'neon-underline' : 'border-b-4 border-indigo-500 pb-1'}`}>
              Match of the day
            </h2>
          </div>

          {/* CONTENEUR SWIPEABLE (Correction Tailwind) */}
          <div 
            ref={swipeContainerRef}
            onScroll={handleScroll}
            className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 -mx-4 px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {TOP_MATCHES.map((match, idx) => (
              <div key={match.id} className="snap-center shrink-0 w-[85%] sm:w-[320px] max-w-[340px]">
                {/* Carte Individuelle */}
                <div className={`rounded-2xl p-5 transition-colors duration-300 ${isDark ? 'glass ' + (idx === 0 ? 'animate-glow-pulse' : '') : 'bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100'}`}>
                  
                  {/* Badge Ligue & Live */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>{match.flag}</div>
                    <div>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{match.league}</p>
                    </div>
                    {match.isLive && (
                      <div className="ml-auto px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20">
                        <span className="text-[10px] text-red-500 font-bold">● LIVE</span>
                      </div>
                    )}
                  </div>

                  {/* Equipes */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col items-center gap-2">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-orbitron font-bold text-lg ${isDark ? 'glass' : 'bg-gray-50 border border-gray-200'}`}>
                        {match.home_team.substring(0,3).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold">{match.home_team}</span>
                    </div>
                    
                    <div className="flex flex-col items-center">
                      <div className={`text-2xl font-orbitron font-bold ${isDark ? 'neon-text' : 'text-indigo-600'}`}>VS</div>
                      <div className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{match.time}</div>
                    </div>
                    
                    <div className="flex flex-col items-center gap-2">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-orbitron font-bold text-lg ${isDark ? 'glass' : 'bg-gray-50 border border-gray-200'}`}>
                        {match.away_team.substring(0,3).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold">{match.away_team}</span>
                    </div>
                  </div>

                  {/* Cotes */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {['home', 'draw', 'away'].map((type, i) => (
                      <div key={type} className={`rounded-lg p-2 text-center transition-colors ${isDark ? 'glass hover:bg-white/10' : 'bg-gray-50 border border-gray-100 hover:bg-indigo-50'}`}>
                        <p className={`text-[10px] uppercase ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{['1', 'X', '2'][i]}</p>
                        <p className={`text-lg font-bold ${isDark ? ['text-cyan-400', 'text-white', 'text-pink-400'][i] : 'text-gray-900'}`}>
                          {match.odds[type as keyof typeof match.odds]}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Value Bet Detector */}
                  {match.value_detected && (
                    <div className={`flex items-center justify-between p-3 rounded-xl border ${isDark ? 'bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border-cyan-500/20' : 'bg-indigo-50 border-indigo-100'}`}>
                      <div className="flex items-center gap-2">
                        <Target className={`w-5 h-5 ${isDark ? 'text-cyan-400' : 'text-indigo-500'}`} />
                        <span className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Value: <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{match.value_detected.pick}</span></span>
                      </div>
                      <div className="px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30">
                        <span className="text-xs text-green-600 dark:text-green-400 font-bold">{match.value_detected.edge} Edge</span>
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
                className={`h-1.5 rounded-full transition-all duration-300 ${activeCardIndex === idx ? (isDark ? 'w-8 bg-gradient-to-r from-cyan-400 to-purple-500' : 'w-8 bg-indigo-500') : (isDark ? 'w-2 bg-white/20' : 'w-2 bg-gray-300')}`} 
              />
            ))}
          </div>
        </section>

        {/* STATS RAPIDES */}
        <section className="animate-slide-in grid grid-cols-3 gap-3" style={{ animationDelay: '0.2s' }}>
          {[
            { label: "ROI Global", value: "+18.5%", icon: TrendingUp, color: "green" },
            { label: "Winrate", value: "67%", icon: CheckCircle2, color: "blue" },
            { label: "Bankroll", value: "1,250$", icon: Wallet, color: "purple" }
          ].map((stat, i) => (
            <div key={i} className={`rounded-xl p-3 text-center transition-colors duration-300 ${isDark ? 'glass' : 'bg-white shadow-sm border border-gray-100'}`}>
              <div className={`w-10 h-10 mx-auto mb-2 rounded-lg flex items-center justify-center ${isDark ? `bg-${stat.color}-500/20` : `bg-${stat.color}-100`}`}>
                <stat.icon className={`w-5 h-5 ${isDark ? `text-${stat.color}-400` : `text-${stat.color}-600`}`} />
              </div>
              <p className={`text-xl font-bold ${isDark ? `text-${stat.color}-400` : 'text-gray-900'}`}>{stat.value}</p>
              <p className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{stat.label}</p>
            </div>
          ))}
        </section>

        {/* LISTE DES LIGUES */}
        <section className="animate-slide-in pb-10" style={{ animationDelay: '0.3s' }}>
          <h3 className="font-orbitron text-lg font-semibold mb-4 flex items-center gap-2">
            <span className={isDark ? "neon-text" : ""}>⚽</span> Ligues Disponibles
          </h3>
          <div className="space-y-3">
            {LEAGUES.map((league, idx) => (
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
          
          <Link href="/dashboard" className="nav-item flex flex-col items-center gap-1 p-2 rounded-xl">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pathname === '/pari' ? (isDark ? 'bg-gradient-to-br from-cyan-500/20 to-purple-500/20' : 'bg-indigo-50') : ''}`}>
              <LayoutGrid className={`w-6 h-6 ${pathname === '/pari' ? (isDark ? 'text-cyan-400' : 'text-indigo-600') : 'text-gray-400'}`} />
            </div>
            <span className={`text-[10px] ${pathname === '/pari' ? (isDark ? 'text-cyan-400 font-medium' : 'text-indigo-600 font-bold') : 'text-gray-400'}`}>Libre</span>
          </Link>

          <Link href="/create-ticket" className="nav-item flex flex-col items-center gap-1 p-2 rounded-xl">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pathname === '/pari/create-ticket' ? (isDark ? 'bg-gradient-to-br from-cyan-500/20 to-purple-500/20' : 'bg-indigo-50') : ''}`}>
              <FileText className={`w-6 h-6 ${pathname === '/pari/create-ticket' ? (isDark ? 'text-cyan-400' : 'text-indigo-600') : 'text-gray-400'}`} />
            </div>
            <span className={`text-[10px] ${pathname === '/pari/create-ticket' ? (isDark ? 'text-cyan-400 font-medium' : 'text-indigo-600 font-bold') : 'text-gray-400'}`}>Fiche</span>
          </Link>

          <Link href="/historique" className="nav-item flex flex-col items-center gap-1 p-2 rounded-xl">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pathname === '/pari/historique' ? (isDark ? 'bg-gradient-to-br from-cyan-500/20 to-purple-500/20' : 'bg-indigo-50') : ''}`}>
              <CalendarDays className={`w-6 h-6 ${pathname === '/pari/historique' ? (isDark ? 'text-cyan-400' : 'text-indigo-600') : 'text-gray-400'}`} />
            </div>
            <span className={`text-[10px] ${pathname === '/pari/historique' ? (isDark ? 'text-cyan-400 font-medium' : 'text-indigo-600 font-bold') : 'text-gray-400'}`}>Calendrier</span>
          </Link>

          <Link href="/analyse" className="nav-item flex flex-col items-center gap-1 p-2 rounded-xl">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pathname === '/pari/analyse' ? (isDark ? 'bg-gradient-to-br from-cyan-500/20 to-purple-500/20' : 'bg-indigo-50') : ''}`}>
              <Search className={`w-6 h-6 ${pathname === '/pari/analyse' ? (isDark ? 'text-cyan-400' : 'text-indigo-600') : 'text-gray-400'}`} />
            </div>
            <span className={`text-[10px] ${pathname === '/pari/analyse' ? (isDark ? 'text-cyan-400 font-medium' : 'text-indigo-600 font-bold') : 'text-gray-400'}`}>Analyse</span>
          </Link>

        </div>
      </nav>
    </div>
  );
}

// Composant pour l'icône calendrier
function CalendarDays(props: any) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}
