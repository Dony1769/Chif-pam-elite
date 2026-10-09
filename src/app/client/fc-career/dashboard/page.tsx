"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ALL_51_ATTRIBUTES } from '../constants';
import { getAttributeCap, evaluatePlayerRole } from '../engine';
import { PlayerCareerState } from '../types';
import { Shield, Trophy, User, Plus, Award, RefreshCw, Play } from 'lucide-react';

export default function CareerDashboardPage() {
  const router = useRouter();

  // Initialisation de l'état du joueur
  const [player, setPlayer] = useState<PlayerCareerState>(() => {
    const initialAttrs: Record<string, number> = {};
    ALL_51_ATTRIBUTES.forEach(attr => { initialAttrs[attr.id] = 50; });
    
    return {
      isUnlocked: true,
      playerName: 'Guillaume (Dony)',
      age: 12, // Début en U12
      season: 1,
      heightCm: 185,
      weightKg: 88, // Poids influençant l'accélération
      skillPointsAvailable: 15,
      attributes: initialAttrs,
      assignedPosition: 'Évaluation...',
      isStarter: false,
      clubName: 'Académie FC',
      coach: {
        id: 'c1',
        name: 'Coach Rossi',
        preferredFormation: '4-3-3',
        tacticalStyle: 'Gegenpressing',
        patienceRating: 7,
        strictness: 58 // Exige au moins 58 de note globale
      },
      activeSponsors: [
        {
          id: 's1',
          sponsorName: 'Nike NextGen',
          objective: 'Jouer 3 matchs avec un rôle actif',
          targetCount: 3,
          currentCount: 0,
          durationMatches: 5,
          rewardSkillPoints: 10,
          completed: false,
          failed: false
        }
      ],
      matchHistoryCount: 0
    };
  });

  // Vérification de la sécurité PIN
  useEffect(() => {
    const isUnlocked = sessionStorage.getItem('fc_career_unlocked');
    if (!isUnlocked) {
      router.push('/client/fc-career');
    }
  }, [router]);

  // Réévaluation automatique par le Coach lors des changements d'attributs
  const { assignedPosition, isStarter, overallRating } = evaluatePlayerRole(player.attributes, player.coach);

  // Augmenter un attribut
  const upgradeAttribute = (attrId: string) => {
    if (player.skillPointsAvailable <= 0) return;
    
    const currentVal = player.attributes[attrId] || 50;
    const maxCap = getAttributeCap(attrId, player.heightCm, player.weightKg);

    if (currentVal >= maxCap) return; // Limite biomécanique atteinte

    setPlayer(prev => ({
      ...prev,
      skillPointsAvailable: prev.skillPointsAvailable - 1,
      attributes: {
        ...prev.attributes,
        [attrId]: currentVal + 1
      }
    }));
  };

  // Simuler un événement de match / sponsor
  const simulateMatch = () => {
    setPlayer(prev => {
      const nextMatchCount = prev.matchHistoryCount + 1;
      let newPoints = prev.skillPointsAvailable;
      
      const updatedSponsors = prev.activeSponsors.map(sp => {
        if (!sp.completed && !sp.failed) {
          const nextCount = sp.currentCount + 1;
          const isDone = nextCount >= sp.targetCount;
          if (isDone) newPoints += sp.rewardSkillPoints;
          return { ...sp, currentCount: nextCount, completed: isDone };
        }
        return sp;
      });

      return {
        ...prev,
        matchHistoryCount: nextMatchCount,
        skillPointsAvailable: newPoints,
        activeSponsors: updatedSponsors
      };
    });
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 sm:p-6 pb-24">
      {/* EN-TÊTE JOUEUR */}
      <header className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-slate-900/80 p-6 backdrop-blur-xl mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Catégorie U{player.age} - Saison {player.season}</span>
            <h1 className="text-2xl font-black uppercase italic">{player.playerName}</h1>
            <p className="text-xs text-slate-400">Gabarit : {player.heightCm} cm | {player.weightKg} kg</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-3 text-center">
              <span className="text-[9px] uppercase font-bold text-slate-400">Poste par Coach</span>
              <p className="text-lg font-black text-emerald-400">{assignedPosition}</p>
            </div>
            <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-3 text-center">
              <span className="text-[9px] uppercase font-bold text-slate-400">Statut</span>
              <p className={`text-sm font-black ${isStarter ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isStarter ? 'Titulaire' : 'Remplaçant'}
              </p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3 text-center">
              <span className="text-[9px] uppercase font-bold text-emerald-400">Points D'Attributs</span>
              <p className="text-xl font-black text-white">{player.skillPointsAvailable}</p>
            </div>
          </div>
        </div>
      </header>

      {/* CONTENU PRINCIPAL */}
      <main className="mx-auto max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLONNE GAUCHE : STATS & SPONSORS */}
        <section className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
            <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3 flex items-center gap-2">
              <Shield size={16} className="text-emerald-400" /> Profil du Coach : {player.coach.name}
            </h2>
            <p className="text-xs text-slate-300">Style : {player.coach.tacticalStyle}</p>
            <p className="text-xs text-slate-300">Exigence Global : {player.coach.strictness} OVR</p>
            <p className="mt-2 text-[11px] text-slate-400 italic">
              "Si vous montez la Finition sans le Calme ni le Placement, vous ne serez pas aligné en Buteur."
            </p>
          </div>

          {/* SPONSOR CONTRACT */}
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
            <h2 className="text-xs font-black uppercase text-amber-400 tracking-wider mb-3 flex items-center gap-2">
              <Award size={16} /> Contrats Sponsors
            </h2>
            {player.activeSponsors.map(sp => (
              <div key={sp.id} className="border border-white/5 bg-slate-950/60 rounded-2xl p-3 text-xs mb-2">
                <p className="font-bold text-white">{sp.sponsorName}</p>
                <p className="text-slate-400 text-[10px]">{sp.objective}</p>
                <div className="mt-2 flex justify-between items-center text-[10px]">
                  <span>Progression: {sp.currentCount}/{sp.targetCount}</span>
                  <span className="text-emerald-400 font-bold">+{sp.rewardSkillPoints} pts</span>
                </div>
              </div>
            ))}
            <button 
              onClick={simulateMatch}
              className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 py-2.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30"
            >
              <Play size={14} /> Simuler le match suivant
            </button>
          </div>
        </section>

        {/* COLONNE DROITE : GESTION DES 51 ATTRIBUTS */}
        <section className="lg:col-span-2 rounded-3xl border border-white/10 bg-slate-900/60 p-5">
          <h2 className="text-xs font-black uppercase text-white tracking-wider mb-4">
            Arbre des 51 Attributs FC 27
          </h2>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
            {ALL_51_ATTRIBUTES.map(attr => {
              const val = player.attributes[attr.id] || 50;
              const cap = getAttributeCap(attr.id, player.heightCm, player.weightKg);
              const isCapped = val >= cap;

              return (
                <div key={attr.id} className="flex items-center justify-between border-b border-white/5 pb-2 text-xs">
                  <div>
                    <span className="font-bold text-white">{attr.name}</span>
                    <p className="text-[10px] text-slate-400">{attr.description}</p>
                    {cap < 99 && (
                      <span className="text-[9px] text-amber-400 font-bold">Cap Poids/Taille : {cap}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-emerald-400">{val} / {cap}</span>
                    <button
                      onClick={() => upgradeAttribute(attr.id)}
                      disabled={player.skillPointsAvailable <= 0 || isCapped}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-black font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-emerald-400"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </main>
    </div>
  );
}
