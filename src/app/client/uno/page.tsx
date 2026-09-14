"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Copy, Crown, Disc3, LogIn, Play, Plus, RefreshCw, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { UNO_COLORS, type UnoCard, type UnoPlayer, type UnoRoom, unoColorClass, unoValueLabel } from '@/lib/uno';
import ThreeSurface from '@/components/three/ThreeSurface';

type View = 'lobby' | 'room' | 'finished';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Une erreur est survenue.';
}

function UnoCardView({ card, playable, onPlay }: { card: UnoCard; playable: boolean; onPlay?: () => void }) {
  return (
    <button
      type="button"
      onClick={onPlay}
      disabled={!playable}
      className={`relative grid aspect-[3/4] min-w-16 place-items-center rounded-2xl border-4 p-2 text-xl font-black shadow-xl transition sm:min-w-20 ${unoColorClass(card.color)} ${playable ? 'cursor-pointer hover:-translate-y-4 hover:rotate-2 hover:shadow-emerald-300/30' : 'cursor-default opacity-85'}`}
      aria-label={`Carte ${unoValueLabel(card.value)}`}
    >
      <span className="absolute inset-2 rounded-xl border border-white/35" />
      <span className="relative z-10">{unoValueLabel(card.value)}</span>
    </button>
  );
}

export default function UnoPage() {
  const router = useRouter();
  const [view, setView] = useState<View>('lobby');
  const [userId, setUserId] = useState<string | null>(null);
  const [room, setRoom] = useState<UnoRoom | null>(null);
  const [players, setPlayers] = useState<UnoPlayer[]>([]);
  const [matchCode, setMatchCode] = useState('');
  const [createBet, setCreateBet] = useState(100);
  const [joinBet, setJoinBet] = useState(100);
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<UnoCard['color'] | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  const myPlayer = players.find((player) => player.user_id === userId);
  const isHost = room?.host_id === userId;
  const isMyTurn = room?.current_turn === userId;
  const canStart = Boolean(isHost && room?.status === 'waiting' && players.length >= 2);
  const hasFinished = room?.status === 'finished' || view === 'finished';

  const loadRoom = useCallback(async (roomId: string) => {
    const [{ data: roomData, error: roomError }, { data: playerData, error: playerError }] = await Promise.all([
      supabase.from('rooms').select('*').eq('id', roomId).single(),
      supabase.from('room_players').select('room_id, user_id, seat, bet_cp, hand, is_connected').eq('room_id', roomId).order('seat'),
    ]);
    if (roomError) throw roomError;
    if (playerError) throw playerError;
    setRoom(roomData as UnoRoom);
    setPlayers((playerData ?? []) as UnoPlayer[]);
    if (roomData.status === 'finished') setView('finished');
  }, []);

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (active) setUserId(data.user?.id ?? null);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!room?.id) return;
    const channel = supabase
      .channel(`uno_room_${room.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${room.id}` }, () => void loadRoom(room.id))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${room.id}` }, () => void loadRoom(room.id))
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [loadRoom, room?.id]);

  useEffect(() => {
    const expiresAt = room?.expires_at;
    if (room?.status !== 'waiting' || !expiresAt) {
      setRemainingSeconds(null);
      return;
    }
    const updateRemaining = () => {
      setRemainingSeconds(Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000)));
    };
    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timer);
  }, [room?.expires_at, room?.status]);

  const runAction = async (action: () => Promise<void>) => {
    if (loading) return;
    setLoading(true);
    setMessage(null);
    try { await action(); } catch (error) { setMessage(errorMessage(error)); } finally { setLoading(false); }
  };

  const createRoom = () => runAction(async () => {
    const { data, error } = await supabase.rpc('uno_create_room', { p_min_bet: Math.floor(createBet), p_max_players: maxPlayers });
    if (error) throw error;
    const roomId = data.room_id as string;
    await loadRoom(roomId);
    setMatchCode(data.match_code as string);
    setJoinBet(Number(data.min_bet));
    setView('room');
  });

  const joinRoom = () => runAction(async () => {
    const code = matchCode.trim().replace(/^MATCH-/, '').toUpperCase();
    const { data, error } = await supabase.rpc('uno_join_room', { p_match_code: code, p_bet: Math.floor(joinBet) });
    if (error) throw error;
    await loadRoom(data.room_id as string);
    setView('room');
  });

  const startMatch = () => runAction(async () => {
    if (!room) return;
    const { error } = await supabase.rpc('uno_start_match', { p_room_id: room.id });
    if (error) throw error;
    await loadRoom(room.id);
  });

  const playCard = (card: UnoCard) => runAction(async () => {
    if (!room) return;
    const color = card.color === 'black' ? selectedColor : null;
    if (card.color === 'black' && !color) { setMessage('Choisissez une couleur avant de jouer cette carte.'); return; }
    const { error } = await supabase.rpc('uno_play_card', { p_room_id: room.id, p_card_id: card.id, p_color: color });
    if (error) throw error;
    setSelectedColor(null);
    await loadRoom(room.id);
  });

  const drawCard = () => runAction(async () => {
    if (!room) return;
    const { error } = await supabase.rpc('uno_draw_card', { p_room_id: room.id });
    if (error) throw error;
    await loadRoom(room.id);
  });

  const playable = useMemo(() => new Set((myPlayer?.hand ?? []).filter((card) => card.color === 'black' || card.color === room?.current_color || card.value === room?.top_card?.value).map((card) => card.id)), [myPlayer?.hand, room?.current_color, room?.top_card?.value]);

  return (
    <main className="min-h-[calc(100vh-8rem)] overflow-hidden rounded-[30px] bg-[#080d1a] px-4 py-6 text-white sm:px-8">
      <ThreeSurface variant="uno" className="pointer-events-none -right-10 top-10 z-0 h-[28rem] w-[34rem] opacity-50" />
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between gap-3">
          <button type="button" onClick={() => router.push('/client/list')} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:border-emerald-300/40" aria-label="Retour">
            <ArrowLeft size={18} />
          </button>
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-fuchsia-300">ChifPam Arena</p>
            <h2 className="mt-1 text-3xl font-black tracking-tight">UNO <span className="text-emerald-300">LIVE</span></h2>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs font-bold text-emerald-200"><ShieldCheck size={15} /> CP sécurisé</div>
        </header>

        {message && <div className="mb-5 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{message}</div>}

        {view === 'lobby' && (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="relative overflow-hidden rounded-[28px] border border-fuchsia-300/20 bg-linear-to-br from-fuchsia-950/70 via-slate-950 to-emerald-950/50 p-6 sm:p-8">
              <Sparkles className="mb-5 text-fuchsia-300" size={30} />
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-300">Multijoueur 2 à 4 joueurs</p>
              <h1 className="mt-3 max-w-xl text-4xl font-black tracking-tight sm:text-6xl">Le prochain coup vaut son pot.</h1>
              <p className="mt-5 max-w-lg text-sm leading-6 text-slate-300">Créez une table, partagez votre code et jouez chaque tour en temps réel. Toutes les mises et récompenses sont validées par Supabase.</p>
              <div className="mt-8 flex flex-wrap gap-3 text-xs font-bold text-slate-300"><span className="rounded-full bg-white/10 px-3 py-2">+2 / +4</span><span className="rounded-full bg-white/10 px-3 py-2">Sens</span><span className="rounded-full bg-white/10 px-3 py-2">Bonus VIP +5%</span></div>
            </section>
            <section className="space-y-5 rounded-[28px] border border-white/10 bg-white/[0.04] p-5 sm:p-7">
              <div><p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">Nouvelle table</p><h3 className="mt-1 text-2xl font-black">Créer une partie</h3></div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Mise minimale en CP<input type="number" min={10} value={createBet} onChange={(event) => setCreateBet(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-300/60" /></label>
              <div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Joueurs maximum</p><div className="mt-2 grid grid-cols-3 gap-2">{[2, 3, 4].map((value) => <button type="button" key={value} onClick={() => setMaxPlayers(value)} className={`rounded-xl border px-3 py-3 text-sm font-black ${maxPlayers === value ? 'border-emerald-300 bg-emerald-300/15 text-emerald-200' : 'border-white/10 bg-white/5 text-slate-400'}`}>{value}</button>)}</div></div>
              <button type="button" onClick={createRoom} disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 py-3 font-black text-slate-950 transition hover:bg-emerald-200 disabled:opacity-50"><Plus size={18} /> Créer une partie</button>
              <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-600"><span className="h-px flex-1 bg-white/10" /> ou rejoindre <span className="h-px flex-1 bg-white/10" /></div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">ID du match<input value={matchCode} onChange={(event) => setMatchCode(event.target.value.toUpperCase())} placeholder="Ex: 8X2K9P" className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 font-mono text-white outline-none focus:border-fuchsia-300/60" /></label>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Votre mise<input type="number" min={10} value={joinBet} onChange={(event) => setJoinBet(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-fuchsia-300/60" /></label>
              <button type="button" onClick={joinRoom} disabled={loading || !matchCode.trim()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-fuchsia-300/40 bg-fuchsia-300/10 px-4 py-3 font-black text-fuchsia-100 transition hover:bg-fuchsia-300/20 disabled:opacity-50"><LogIn size={18} /> Rejoindre la table</button>
            </section>
          </div>
        )}

        {view === 'room' && room && (
          <section className="space-y-6">
            <div className="flex flex-col justify-between gap-4 rounded-[28px] border border-white/10 bg-white/[0.04] p-5 sm:flex-row sm:items-center sm:p-7"><div><p className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-300">{room.status === 'waiting' ? 'Salon d’attente' : room.status === 'cancelled' ? 'Salon fermé' : 'Partie en cours'}</p><div className="mt-2 flex items-center gap-3"><h1 className="font-mono text-3xl font-black tracking-widest">MATCH-{room.match_code}</h1><button type="button" onClick={() => navigator.clipboard?.writeText(`MATCH-${room.match_code}`)} className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white" aria-label="Copier le code"><Copy size={16} /></button></div></div><div className="flex items-center gap-3 text-sm font-bold text-slate-300"><Users size={18} /> {players.length}/{room.max_players} <span className="text-emerald-300">{room.pot_cp.toLocaleString()} CP</span></div></div>
            {room.status === 'waiting' ? <div className="grid gap-6 lg:grid-cols-[1fr_0.65fr]"><div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: room.max_players }).map((_, index) => { const player = players.find((entry) => entry.seat === index); return <div key={index} className="flex min-h-32 flex-col justify-between rounded-2xl border border-white/10 bg-slate-950/60 p-5"><div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Siège {index + 1}</span>{player?.user_id === room.host_id && <Crown size={16} className="text-amber-300" />}</div><p className="text-lg font-black">{player ? (player.user_id === userId ? 'Vous' : `Joueur ${index + 1}`) : 'En attente...'}</p>{player && <p className="text-xs text-emerald-300">Mise {player.bet_cp.toLocaleString()} CP</p>}</div>; })}</div><div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/5 p-5"><p className="text-sm leading-6 text-slate-300">Le match démarre automatiquement quand la salle est pleine. Les mises sont remboursées si le délai expire.</p><p className="mt-4 font-mono text-2xl font-black text-emerald-200">{remainingSeconds === null ? '--:--' : `${Math.floor(remainingSeconds / 60).toString().padStart(2, '0')}:${(remainingSeconds % 60).toString().padStart(2, '0')}`}</p><p className="mt-1 text-xs text-slate-400">Temps restant</p><button type="button" onClick={startMatch} disabled={!canStart || loading || remainingSeconds === 0} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 py-3 font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"><Play size={17} /> {loading ? 'Préparation...' : 'Démarrer la partie'}</button></div></div> : room.status === 'cancelled' ? <div className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-6 text-sm text-amber-100">Le délai de 8 minutes est écoulé. Les mises engagées ont été remboursées automatiquement.</div> : <GameBoard room={room} player={myPlayer} players={players} isMyTurn={Boolean(isMyTurn)} playable={playable} selectedColor={selectedColor} setSelectedColor={setSelectedColor} playCard={playCard} drawCard={drawCard} loading={loading} hasFinished={hasFinished} />}
          </section>
        )}
      </div>
    </main>
  );
}

function GameBoard({ room, player, players, isMyTurn, playable, selectedColor, setSelectedColor, playCard, drawCard, loading, hasFinished }: { room: UnoRoom; player?: UnoPlayer; players: UnoPlayer[]; isMyTurn: boolean; playable: Set<string>; selectedColor: UnoCard['color'] | null; setSelectedColor: (color: UnoCard['color'] | null) => void; playCard: (card: UnoCard) => void; drawCard: () => void; loading: boolean; hasFinished: boolean }) {
  const winner = players.find((entry) => entry.user_id === room.winner_id);
  return <div className="space-y-6"><div className="flex flex-wrap items-center justify-center gap-3">{players.filter((entry) => entry.user_id !== player?.user_id).map((entry) => <div key={entry.user_id} className={`rounded-full border px-4 py-2 text-xs font-bold ${room.current_turn === entry.user_id ? 'border-fuchsia-300 bg-fuchsia-300/15 text-fuchsia-100 shadow-[0_0_25px_rgba(232,121,249,0.35)]' : 'border-white/10 bg-white/5 text-slate-400'}`}>Joueur {entry.seat + 1} · {entry.hand.length} cartes</div>)}</div><div className="relative flex min-h-[360px] flex-col items-center justify-center overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_center,#16213d_0%,#080d1a_65%)] p-8"><div className="absolute left-5 top-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Tour {room.turn_number}</div><div className="absolute right-5 top-5 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300">Couleur <span className="text-emerald-300">{room.current_color}</span></div><div className="flex items-center gap-5"><div className="grid aspect-[3/4] w-20 place-items-center rounded-2xl border-4 border-white/20 bg-linear-to-br from-fuchsia-700 to-slate-950 text-3xl shadow-2xl"><Disc3 /></div><UnoCardView card={room.top_card} playable={false} /></div><p className={`mt-8 text-sm font-black uppercase tracking-[0.2em] ${isMyTurn ? 'animate-pulse text-emerald-300' : 'text-slate-500'}`}>{hasFinished ? 'Partie terminée' : isMyTurn ? 'Votre tour' : 'Tour adverse'}</p>{winner && <div className="mt-3 text-center text-emerald-200"><TrophyIcon /> Victoire du siège {winner.seat + 1} · +{(room.pot_cp + room.vip_bonus_cp).toLocaleString()} CP</div>}</div><div className="flex flex-wrap items-center justify-center gap-3">{UNO_COLORS.map((color) => <button type="button" key={color.value} onClick={() => setSelectedColor(color.value)} className={`h-8 w-8 rounded-full ${color.className} ${selectedColor === color.value ? 'ring-4 ring-white/60 ring-offset-2 ring-offset-[#080d1a]' : 'opacity-70'}`} aria-label={`Choisir ${color.label}`} />)}</div><div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><div className="mb-3 flex items-center justify-between gap-3"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Votre main</p><button type="button" onClick={drawCard} disabled={!isMyTurn || loading || hasFinished} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 disabled:opacity-40"><RefreshCw size={14} /> Piocher</button></div><div className="flex min-h-28 flex-wrap justify-center gap-2 sm:gap-3">{(player?.hand ?? []).map((card) => <motion.div key={card.id} layout><UnoCardView card={card} playable={isMyTurn && playable.has(card.id) && !loading && !hasFinished} onPlay={() => playCard(card)} /></motion.div>)}</div></div></div>;
}

function TrophyIcon() { return <span className="mr-2 inline-flex"><Crown size={18} /></span>; }