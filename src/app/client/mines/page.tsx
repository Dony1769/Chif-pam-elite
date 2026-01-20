"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Gem, Bomb, Coins, Loader2, ChevronLeft, Zap, TrendingUp, ShieldAlert, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function MinesElite() {
  const router = useRouter();
  
  // --- ÉTATS DU JEU ---
  const [bet, setBet] = useState(10);
  const [difficulty, setDifficulty] = useState<'facile' | 'intermédiaire' | 'difficile'>('intermédiaire');
  const [mines, setMines] = useState(8);
  const [status, setStatus] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [revealed, setRevealed] = useState<number[]>([]);
  const [minePositions, setMinePositions] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);

  // --- ÉTAT MAINTENANCE ---
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState('');
  const [checkingSystem, setCheckingSystem] = useState(true);

  // 1. VÉRIFICATION SYSTÈME (MAINTENANCE)
  useEffect(() => {
    const checkSystemStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('game_settings')
          .select('is_active, maintenance_msg')
          .eq('game_id', 'mines') // ID correspondant au SQL
          .maybeSingle();

        if (data && data.is_active === false) {
          setIsMaintenance(true);
          setMaintenanceMsg(data.maintenance_msg || "Maintenance en cours...");
        }
      } catch (err) {
        console.error("Erreur vérification système");
      } finally {
        setCheckingSystem(false);
      }
    };

    checkSystemStatus();
  }, []);

  // 2. LOGIQUE JEU (Inchangée)
  useEffect(() => {
    const counts = { facile: 5, intermédiaire: 8, difficile: 11 };
    setMines(counts[difficulty]);
  }, [difficulty]);

  const getMultiplier = () => {
    if (revealed.length === 0) return 1.0;
    const steps = { facile: 0.2, intermédiaire: 0.3, difficile: 0.5 };
    return parseFloat((1.0 + (revealed.length * steps[difficulty])).toFixed(2));
  };

  const start = async () => {
    // Double vérification maintenance au clic (Sécurité supplémentaire)
    if (isMaintenance) return;
    
    if (bet < 10 || loading) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/connexion');

      const { data: ok } = await supabase.rpc('process_bet', { amount: bet });
      if (!ok) {
        alert("Solde insuffisant !");
        return;
      }

      const pos = Array.from({ length: 25 }, (_, i) => i)
        .sort(() => Math.random() - 0.5)
        .slice(0, mines);
      
      const { data, error } = await supabase.from('mines_games').insert([{
        user_id: user.id,
        bet_amount: bet,
        mines_count: mines,
        mine_positions: pos,
        difficulty_level: difficulty,
        is_active: true
      }]).select().single();

      if (error) throw error;
      setGameId(data.id);
      setMinePositions(pos);
      setRevealed([]);
      setStatus('playing');
    } catch (err) {
      alert("Erreur technique au démarrage.");
    } finally { setLoading(false); }
  };

  const clickTile = (i: number) => {
    if (status !== 'playing' || revealed.includes(i)) return;
    if (minePositions.includes(i)) {
      setStatus('ended');
      return;
    }
    setRevealed(prev => [...prev, i]);
  };

  const cashout = async () => {
    if (status !== 'playing' || revealed.length === 0 || loading) return;
    setLoading(true);
    try {
      const { error } = await supabase.rpc('claim_mines_win', { 
        game_id: gameId, 
        current_tiles_count: revealed.length 
      });
      if (error) throw error;
      setStatus('ended');
    } catch (err: any) {
      alert("Erreur d'encaissement : " + err.message);
    } finally { setLoading(false); }
  };

  // --- ÉCRAN DE CHARGEMENT INITIAL ---
  if (checkingSystem) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center">
        <Loader2 className="text-emerald-500 animate-spin" size={40} />
      </div>
    );
  }

  // --- ÉCRAN DE MAINTENANCE (BLOQUANT) ---
  if (isMaintenance) {
    return (
      <div className="min-h-screen bg-[#050508] text-white p-6 flex flex-col items-center justify-center text-center font-black italic uppercase relative overflow-hidden">
        {/* Effet d'arrière-plan */}
        <div className="absolute inset-0 bg-amber-500/5 animate-pulse"></div>
        
        <div className="relative z-10 bg-[#0a0a0f] border border-amber-500/20 p-10 rounded-[3rem] shadow-2xl shadow-amber-500/10 max-w-md w-full">
          <div className="mx-auto w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-6 text-amber-500 border border-amber-500/20">
            <ShieldAlert size={40} />
          </div>
          
          <h1 className="text-3xl text-amber-500 mb-2 tracking-tighter">MAINTENANCE</h1>
          <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em] mb-8">ACCÈS TEMPORAIREMENT RESTREINT</p>
          
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5 mb-8">
            <Lock className="mx-auto text-slate-500 mb-2" size={20} />
            <p className="text-sm text-slate-300 normal-case not-italic font-medium leading-relaxed">
              "{maintenanceMsg}"
            </p>
          </div>

          <button 
            onClick={() => router.back()} 
            className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs tracking-widest transition-all"
          >
            RETOURNER AU MENU
          </button>
        </div>
      </div>
    );
  }

  // --- INTERFACE DE JEU NORMALE ---
  return (
    <div className="min-h-screen bg-[#050508] text-white p-4 font-black italic uppercase flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-md flex justify-between items-center mb-6">
        <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/10">
          <ChevronLeft size={24} />
        </button>
        <div className="text-right">
          <h1 className="text-2xl text-emerald-500 italic font-black">MINES ELITE</h1>
          <span className="text-[7px] text-slate-500 block">SYSTÈME VÉRIFIÉ</span>
        </div>
      </div>

      <div className="w-full max-w-md space-y-5">
        {/* Difficulté */}
        <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/5">
          {(['facile', 'intermédiaire', 'difficile'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setDifficulty(level)}
              disabled={status === 'playing'}
              className={`flex-1 py-3 rounded-xl text-[10px] transition-all ${difficulty === level ? 'bg-emerald-500 text-black' : 'text-slate-500'}`}
            >
              {level}
            </button>
          ))}
        </div>

        {/* Stats Temps Réel */}
        {status === 'playing' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <p className="text-[8px] text-slate-500 mb-1 flex items-center gap-1"><TrendingUp size={10}/> COTE</p>
              <p className="text-xl text-emerald-500 font-bold">{getMultiplier().toFixed(2)}X</p>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <p className="text-[8px] text-slate-500 mb-1 flex items-center gap-1"><Zap size={10}/> GAIN</p>
              <p className="text-xl text-amber-500 font-bold">{(bet * getMultiplier()).toFixed(0)} HTG</p>
            </div>
          </div>
        )}

        {/* Mise et Bouton Action */}
        <div className="bg-[#0a0a0f] p-6 rounded-[2.5rem] border border-white/5 space-y-4">
          <div className="flex items-center gap-4 bg-black/40 p-5 rounded-2xl border border-white/10">
            <Coins className="text-emerald-500" size={20} />
            <input 
              type="number" 
              value={bet} 
              onChange={(e) => setBet(Number(e.target.value))}
              disabled={status === 'playing'}
              className="bg-transparent flex-1 outline-none text-2xl text-emerald-500 font-bold"
            />
          </div>

          <button 
            onClick={status === 'playing' ? cashout : start}
            disabled={loading || (status === 'playing' && revealed.length === 0)}
            className={`w-full py-6 rounded-3xl text-2xl font-black transition-all ${status === 'playing' ? 'bg-amber-500 text-black' : 'bg-emerald-500 text-black'}`}
          >
            {loading ? <Loader2 className="animate-spin mx-auto" /> : status === 'playing' ? `ENCAISSER` : "JOUER"}
          </button>
        </div>

        {/* Grille de jeu */}
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 25 }).map((_, i) => (
            <button
              key={i}
              onClick={() => clickTile(i)}
              className={`aspect-square rounded-2xl flex items-center justify-center transition-all border-2 ${
                revealed.includes(i) 
                ? 'bg-emerald-500/10 border-emerald-500/40' 
                : status === 'ended' && minePositions.includes(i)
                ? 'bg-rose-600 border-rose-400 scale-105 shadow-lg shadow-rose-500/50'
                : 'bg-white/5 border-white/5 active:bg-white/10'
              }`}
            >
              {revealed.includes(i) && <Gem className="text-emerald-400 w-8 h-8" />}
              {status === 'ended' && minePositions.includes(i) && <Bomb className="text-white w-8 h-8" />}
            </button>
          ))}
        </div>

        {status === 'ended' && (
          <button 
            onClick={() => { setStatus('idle'); setRevealed([]); }}
            className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] tracking-widest"
          >
            REJOUER
          </button>
        )}
      </div>
    </div>
  );
}

