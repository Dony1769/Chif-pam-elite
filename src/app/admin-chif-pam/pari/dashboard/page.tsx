"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import {
  Sun,
  Moon,
  Home,
  ChevronRight,
  Wind,
  Receipt,
  CalendarDays,
  Search,
} from "lucide-react";

// --- Types & Interfaces ---
interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  time: string;
  odds: { home: number; draw: number; away: number };
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

// --- Mock Data ---
const MATCHES: Match[] = [
  { id: "1", homeTeam: "Inter", awayTeam: "Milan", time: "20:45", odds: { home: 2.1, draw: 3.2, away: 3.5 } },
  { id: "2", homeTeam: "Real Madrid", awayTeam: "Barcelone", time: "21:00", odds: { home: 2.5, draw: 3.4, away: 2.7 } },
  { id: "3", homeTeam: "Arsenal", awayTeam: "Man City", time: "17:30", odds: { home: 2.8, draw: 3.1, away: 2.4 } },
];

const LEAGUES: string[] = ["Serie A", "Premier League", "La Liga", "Ligue 1", "Bundesliga"];

const NAV_ITEMS: NavItem[] = [
  { id: "libre", label: "Libre", icon: Wind },
  { id: "fiche", label: "Fiche", icon: Receipt },
  { id: "calendrier", label: "Calendrier", icon: CalendarDays },
  { id: "analyse", label: "Analyse", icon: Search },
];

export default function PariDashboard() {
  // --- States ---
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("libre");
  
  // Carousel State
  const [matchIndex, setMatchIndex] = useState<number>(0);
  const [direction, setDirection] = useState<number>(0);

  // --- Theme Toggle Logic ---
  // Gère le basculement d'une classe "dark" sur le conteneur principal.
  // Par défaut, le design est pensé pour le dark mode (Glassmorphism sur fond noir).
  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  // --- Swipe Logic (Framer Motion) ---
  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => Math.abs(offset) * velocity;

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setMatchIndex((prev) => {
      let nextIndex = prev + newDirection;
      if (nextIndex < 0) nextIndex = MATCHES.length - 1;
      if (nextIndex >= MATCHES.length) nextIndex = 0;
      return nextIndex;
    });
  };

  const handleDragEnd = (e: Event, { offset, velocity }: PanInfo) => {
    const swipe = swipePower(offset.x, velocity.x);
    if (swipe < -swipeConfidenceThreshold) {
      paginate(1); // Swipe left
    } else if (swipe > swipeConfidenceThreshold) {
      paginate(-1); // Swipe right
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9,
    }),
  };

  return (
    <div className={`relative min-h-screen w-full overflow-hidden transition-colors duration-500 ${isDarkMode ? "bg-[#050508] text-white" : "bg-slate-100 text-slate-900"}`}>
      
      {/* Background Ambient Glow (Neon effect) */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-cyan-500/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-80 h-80 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />

      {/* --- HEADER --- */}
      <header className={`sticky top-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-xl border-b ${isDarkMode ? "border-white/10 bg-[#050508]/60" : "border-slate-200 bg-white/60"}`}>
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-full transition-all ${isDarkMode ? "bg-white/10 hover:bg-white/20 text-cyan-400" : "bg-slate-200 hover:bg-slate-300 text-purple-600"}`}
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <Link
          href="/admin-chif-pam/dashboard"
          className={`p-2 rounded-full transition-all ${isDarkMode ? "bg-white/10 hover:bg-white/20 text-white" : "bg-slate-200 hover:bg-slate-300 text-slate-900"}`}
        >
          <Home size={20} />
        </Link>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="px-6 pt-8 pb-32 space-y-10">
        
        {/* HERO CAROUSEL */}
        <section className="relative w-full h-[220px] flex flex-col items-center">
          <div className="relative w-full max-w-sm h-[160px] flex items-center justify-center perspective-1000">
            <AnimatePresence initial={false} custom={direction}>
              <motion.div
                key={matchIndex}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={1}
                onDragEnd={handleDragEnd}
                className={`absolute w-full h-full p-6 rounded-[2rem] flex flex-col justify-center items-center shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-md border ${
                  isDarkMode 
                    ? "bg-gradient-to-br from-white/10 to-white/5 border-white/20" 
                    : "bg-gradient-to-br from-white/80 to-white/40 border-slate-200 shadow-xl"
                }`}
              >
                <span className={`text-[10px] uppercase tracking-widest mb-2 font-semibold ${isDarkMode ? "text-cyan-400" : "text-purple-600"}`}>
                  Featured Match
                </span>
                <h3 className="text-3xl font-black italic tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 to-purple-400">
                  {MATCHES[matchIndex].homeTeam} <span className="text-white/50 text-xl mx-2">vs</span> {MATCHES[matchIndex].awayTeam}
                </h3>
                <div className="flex gap-4 mt-6">
                  {Object.entries(MATCHES[matchIndex].odds).map(([key, value]) => (
                    <div key={key} className={`flex flex-col items-center px-4 py-2 rounded-xl border ${isDarkMode ? "bg-black/40 border-white/10" : "bg-white/60 border-slate-200"}`}>
                      <span className="text-[9px] uppercase tracking-wider opacity-60">{key}</span>
                      <span className="font-bold">{value}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Pagination Dots */}
          <div className="flex justify-center gap-2 mt-6">
            {MATCHES.map((_, idx) => (
              <div
                key={idx}
                className={`transition-all duration-300 rounded-full ${
                  idx === matchIndex 
                    ? "w-6 h-2 bg-gradient-to-r from-cyan-400 to-purple-500 shadow-[0_0_10px_rgba(34,211,238,0.5)]" 
                    : `w-2 h-2 ${isDarkMode ? "bg-white/20" : "bg-slate-300"}`
                }`}
              />
            ))}
          </div>
        </section>

        {/* SECTION TITLE */}
        <section className="space-y-6">
          <div className="relative inline-block">
            <h2 className="text-2xl font-black uppercase italic tracking-tight">
              Match of the day
            </h2>
            {/* Dégradé Neon soulignant le texte */}
            <div className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 via-purple-500 to-transparent rounded-full" />
          </div>

          {/* LEAGUES LIST */}
          <div className="flex flex-col gap-3">
            {LEAGUES.map((league, idx) => (
              <motion.button
                whileTap={{ scale: 0.98 }}
                key={idx}
                className={`group flex items-center justify-between p-5 rounded-2xl backdrop-blur-md border transition-all duration-300 ${
                  isDarkMode 
                    ? "bg-white/5 border-white/10 hover:bg-white/10 hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(34,211,238,0.15)]" 
                    : "bg-white/60 border-slate-200 hover:bg-white hover:border-purple-400/50 hover:shadow-lg"
                }`}
              >
                <span className="text-lg font-bold tracking-wide">{league}</span>
                <ChevronRight 
                  className={`transition-transform duration-300 group-hover:translate-x-1 ${
                    isDarkMode ? "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" : "text-purple-600"
                  }`} 
                />
              </motion.button>
            ))}
          </div>
        </section>
      </main>

      {/* --- BOTTOM NAVIGATION BAR --- */}
      <nav className={`fixed bottom-0 left-0 w-full px-6 py-4 backdrop-blur-2xl border-t z-50 ${
        isDarkMode ? "bg-[#050508]/80 border-white/10" : "bg-white/80 border-slate-200"
      }`}>
        <ul className="flex items-center justify-between max-w-md mx-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            
            return (
              <li key={item.id} className="flex-1">
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`relative w-full flex flex-col items-center justify-center gap-1 transition-all duration-300 ${
                    isActive 
                      ? (isDarkMode ? "text-cyan-400" : "text-purple-600") 
                      : (isDarkMode ? "text-white/40 hover:text-white/70" : "text-slate-400 hover:text-slate-600")
                  }`}
                >
                  {/* Neon Glow background for active item */}
                  {isActive && isDarkMode && (
                    <div className="absolute inset-0 bg-cyan-400/10 blur-md rounded-full scale-150 pointer-events-none" />
                  )}
                  
                  <Icon size={24} strokeWidth={isActive ? 2.5 : 1.5} className="relative z-10" />
                  <span className="text-[10px] font-bold tracking-wider relative z-10 uppercase">
                    {item.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

