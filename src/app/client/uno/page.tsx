"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Copy,
  Crown,
  Disc3,
  HelpCircle,
  LogIn,
  Play,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  AlertTriangle,
  LogOut,
  Trophy,
  Home,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  UNO_COLORS,
  type UnoCard,
  type UnoPlayer,
  type UnoRoom,
  unoColorClass,
  unoValueLabel,
} from "@/lib/uno";
import ThreeSurface from "@/components/three/ThreeSurface";

type View = "lobby" | "room" | "finished";

type PendingBet = {
  type: "create" | "join";
  amount: number;
  code?: string;
  maxPlayers?: number;
};

type Standing = { user_id: string; username: string | null; score: number };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Une erreur est survenue.";
}

/* ============================================================================
   COMPOSANTS VISUELS (CARTE & DIALOGUES)
   ============================================================================ */

/* Rendu optimisé d'une carte UNO avec couleurs vives, contraste élevé et brillance */
function UnoCardView({
  card,
  playable,
  isSelected,
  onPlay,
}: {
  card: UnoCard;
  playable: boolean;
  isSelected?: boolean;
  onPlay?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPlay}
      disabled={!playable}
      className={`relative grid aspect-[3/4] min-w-16 place-items-center rounded-2xl border-4 p-2 text-2xl font-black shadow-2xl transition-all duration-200 sm:min-w-20 brightness-110 contrast-125 saturate-150 ${
        card.color === "black"
          ? "border-white bg-[conic-gradient(#ef4444_0deg_90deg,#facc15_90deg_180deg,#22c55e_180deg_270deg,#06b6d4_270deg_360deg)] text-white shadow-fuchsia-500/20"
          : `${unoColorClass(card.color)} text-white`
      } ${
        playable
          ? "cursor-pointer hover:-translate-y-4 hover:rotate-2 hover:scale-105 hover:shadow-emerald-400/50 active:scale-95"
          : "cursor-default opacity-50 grayscale-40"
      } ${isSelected ? "ring-4 ring-emerald-400 ring-offset-2 ring-offset-slate-950 -translate-y-4 scale-105" : ""}`}
      aria-label={`Carte ${unoValueLabel(card.value)}`}
    >
      <span className="absolute inset-1.5 rounded-xl border-2 border-white/40 bg-white/10 backdrop-blur-[1px]" />
      <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] font-black tracking-tighter">
        {unoValueLabel(card.value)}
      </span>
    </button>
  );
}

/* Modal Pop-up pour confirmation d'abandon de salle */
function LeaveRoomModal({
  onConfirm,
  onCancel,
  loading,
  isWaiting,
  isHost,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
  isWaiting: boolean;
  isHost: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 px-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-md rounded-3xl border border-rose-500/30 bg-slate-900 p-6 shadow-2xl"
      >
        <div className="flex items-center gap-3 text-rose-400">
          <div className="rounded-xl bg-rose-500/10 p-3 border border-rose-500/20">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-white">
              {isWaiting ? "Quitter le salon ?" : "Quitter la partie ?"}
            </h3>
            <p className="text-xs text-rose-300">Confirmation d'abandon</p>
          </div>
        </div>

        <p className="mt-4 text-sm text-slate-300 leading-relaxed">
          {isWaiting ? (
            isHost ? (
              <span>
                En tant qu'hôte, si vous quittez la salle d'attente, elle sera{" "}
                <strong className="text-rose-400">fermée</strong> et les mises de tous les joueurs présents seront{" "}
                <strong className="text-emerald-400">intégralement remboursées</strong>.
              </span>
            ) : (
              <span>
                Votre mise vous sera <strong className="text-emerald-400">remboursée</strong> et vous quitterez la salle d'attente.
              </span>
            )
          ) : (
            <span>
              Êtes-vous sûr de vouloir abandonner la partie en cours ? 
              <br />
              <span className="text-xs text-slate-400 mt-2 block">
                • À 2 joueurs : Victoire par forfait attribuée à l'adversaire.
                <br />
                • À 3 ou 4 joueurs : La partie sera annulée et les mises remboursées.
              </span>
            </span>
          )}
        </p>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-300 hover:bg-white/10 transition"
          >
            {isWaiting ? "Rester dans la salle" : "Continuer à jouer"}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-500 transition disabled:opacity-50"
          >
            <LogOut size={16} />
            Quitter
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ============================================================================
   PAGE PRINCIPALE : UNO PAGE
   ============================================================================ */

export default function UnoPage() {
  const router = useRouter();
  const [view, setView] = useState<View>("lobby");
  const [userId, setUserId] = useState<string | null>(null);
  const [room, setRoom] = useState<UnoRoom | null>(null);
  const [players, setPlayers] = useState<UnoPlayer[]>([]);
  const [playerNames, setPlayerNames] = useState<Record<string, string>>({});
  const [matchCode, setMatchCode] = useState("");
  const [createBet, setCreateBet] = useState(100);
  const [joinBet, setJoinBet] = useState(100);
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pendingBet, setPendingBet] = useState<PendingBet | null>(null);
  const [selectedColor, setSelectedColor] = useState<UnoCard["color"] | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [remainingTurnSeconds, setRemainingTurnSeconds] = useState<number | null>(null);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [helpOpen, setHelpOpen] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  const realtimeRefreshRef = useRef<number | null>(null);
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const myPlayer = players.find((player) => player.user_id === userId);
  const isHost = room?.host_id === userId;
  const isMyTurn = room?.current_turn === userId;
  const canStart = Boolean(
    isHost && room?.status === "waiting" && players.length === room.max_players
  );
  const hasFinished = room?.status === "finished" || view === "finished";

  /* Charger les données de la salle */
  const loadRoom = useCallback(async (roomId: string) => {
    const [
      { data: roomData, error: roomError },
      { data: playerData, error: playerError },
    ] = await Promise.all([
      supabase.from("rooms").select("*").eq("id", roomId).single(),
      supabase
        .from("room_players")
        .select("room_id, user_id, seat, bet_cp, hand, is_connected")
        .eq("room_id", roomId)
        .order("seat"),
    ]);

    if (roomError) throw roomError;
    if (playerError) throw playerError;

    setRoom(roomData as UnoRoom);
    setPlayers((playerData ?? []) as UnoPlayer[]);

    if ((playerData ?? []).length > 0) {
      const { data: profileData, error: profileError } = await supabase.rpc(
        "uno_get_player_profiles",
        { p_room_id: roomId }
      );
      if (!profileError && profileData) {
        const profiles = profileData as Array<{ user_id: string; username: string | null }>;
        setPlayerNames(
          Object.fromEntries(
            profiles.flatMap((profile) =>
              profile.username ? [[profile.user_id, profile.username]] : []
            )
          )
        );
      }
    } else {
      setPlayerNames({});
    }

    if (roomData.status === "finished") {
      setView("finished");
      const { data: matchData } = await supabase
        .from("matches")
        .select("final_standings")
        .eq("room_id", roomId)
        .maybeSingle();
      setStandings((matchData?.final_standings ?? []) as Standing[]);
    }
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (room && room.status !== "finished" && room.status !== "cancelled") {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [room]);

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (active) setUserId(data.user?.id ?? null);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!room?.id) return;
    const scheduleRoomRefresh = () => {
      if (realtimeRefreshRef.current !== null) return;
      realtimeRefreshRef.current = window.setTimeout(() => {
        realtimeRefreshRef.current = null;
        void loadRoom(room.id);
      }, 100);
    };

    const channel = supabase
      .channel(`uno_room_${room.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `id=eq.${room.id}` },
        scheduleRoomRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_players", filter: `room_id=eq.${room.id}` },
        scheduleRoomRefresh
      )
      .subscribe();

    return () => {
      if (realtimeRefreshRef.current !== null) {
        window.clearTimeout(realtimeRefreshRef.current);
        realtimeRefreshRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [loadRoom, room?.id]);

  useEffect(() => {
    const expiresAt = room?.expires_at;
    if (room?.status !== "waiting" || !expiresAt) {
      setRemainingSeconds(null);
      return;
    }

    const updateRemaining = () => {
      const remaining = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setRemainingSeconds(remaining);

      if (remaining === 0 && room.id) {
        void (async () => {
          try {
            await supabase.rpc("uno_cancel_expired_room", { p_room_id: room.id });
            await loadRoom(room.id);
          } catch (e) {
            console.error("Erreur lors de la fermeture automatique de la salle expirée", e);
          }
        })();
      }
    };

    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timer);
  }, [room?.expires_at, room?.status, room?.id, loadRoom]);

  useEffect(() => {
    if (room?.status !== "playing" || !room.turn_deadline_at) {
      setRemainingTurnSeconds(null);
      return;
    }
    const update = () =>
      setRemainingTurnSeconds(
        Math.max(0, Math.ceil((new Date(room.turn_deadline_at as string).getTime() - Date.now()) / 1000))
      );
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [room?.turn_deadline_at, room?.status]);

  useEffect(
    () => () => {
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    },
    []
  );

  const showMessage = useCallback((nextMessage: string) => {
    if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    setMessage(nextMessage);
    messageTimerRef.current = setTimeout(() => setMessage(null), 3500);
  }, []);

  const runAction = async (action: () => Promise<void>) => {
    if (loading) return;
    setLoading(true);
    setMessage(null);
    try {
      await action();
    } catch (error) {
      showMessage(errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const createRoom = () =>
    setPendingBet({
      type: "create",
      amount: Math.floor(createBet),
      maxPlayers,
    });

  const joinRoom = () => {
    const code = matchCode
      .trim()
      .replace(/^MATCH-/, "")
      .toUpperCase();
    if (!code) return;
    setPendingBet({ type: "join", amount: Math.floor(joinBet), code });
  };

  const confirmBet = () =>
    runAction(async () => {
      if (!pendingBet) return;
      const action = pendingBet;
      setPendingBet(null);
      if (action.type === "create") {
        const { data, error } = await supabase.rpc("uno_create_room", {
          p_min_bet: action.amount,
          p_max_players: action.maxPlayers,
        });
        if (error) throw error;
        const roomId = data.room_id as string;
        await loadRoom(roomId);
        setMatchCode(data.match_code as string);
        setJoinBet(Number(data.min_bet));
        setView("room");
        return;
      }
      const { data, error } = await supabase.rpc("uno_join_room", {
        p_match_code: action.code,
        p_bet: action.amount,
      });
      if (error) throw error;
      await loadRoom(data.room_id as string);
      setView("room");
    });

  const handleConfirmLeaveRoom = () =>
    runAction(async () => {
      setShowLeaveModal(false);
      if (!room) return;

      const { data, error } = await supabase.rpc("uno_leave_room", {
        p_room_id: room.id,
      });

      if (error) throw error;

      const resMessage = (data as { message?: string })?.message ?? "Vous avez quitté la salle.";

      setRoom(null);
      setPlayers([]);
      setView("lobby");
      showMessage(resMessage);
    });

  const handleBackToLobby = () => {
    setRoom(null);
    setPlayers([]);
    setStandings([]);
    setView("lobby");
  };

  const copyMatchCode = async () => {
    try {
      await navigator.clipboard.writeText(`MATCH-${room?.match_code ?? matchCode}`);
      setCopied(true);
      showMessage("Code copié dans le presse-papier");
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      showMessage("Impossible de copier le code.");
    }
  };

  const getPlayerName = (player: UnoPlayer) =>
    playerNames[player.user_id] ?? `Joueur ${player.seat + 1}`;

  const startMatch = () =>
    runAction(async () => {
      if (!room) return;
      const { error } = await supabase.rpc("uno_start_match", {
        p_room_id: room.id,
      });
      if (error) throw error;
      await loadRoom(room.id);
    });

  const playCard = (card: UnoCard) =>
    runAction(async () => {
      if (!room) return;

      if (card.color === "black" && !selectedColor) {
        setSelectedCardId(card.id);
        showMessage("Veuillez sélectionner une couleur ci-dessous avant de jouer la carte Joker !");
        return;
      }

      const colorToPlay = card.color === "black" ? selectedColor : null;

      const { error } = await supabase.rpc("uno_play_card", {
        p_room_id: room.id,
        p_card_id: card.id,
        p_color: colorToPlay,
      });

      if (error) throw error;

      setSelectedColor(null);
      setSelectedCardId(null);
      await loadRoom(room.id);
    });

  const drawCard = () =>
    runAction(async () => {
      if (!room) return;
      const { error } = await supabase.rpc("uno_draw_card", {
        p_room_id: room.id,
      });
      if (error) throw error;
      await loadRoom(room.id);
    });

  const playable = useMemo(
    () =>
      new Set(
        (myPlayer?.hand ?? [])
          .filter(
            (card) =>
              card.color === "black" ||
              card.color === room?.current_color ||
              card.value === room?.top_card?.value
          )
          .map((card) => card.id)
      ),
    [myPlayer?.hand, room?.current_color, room?.top_card?.value]
  );

  return (
    <main className="min-h-[calc(100vh-8rem)] overflow-hidden rounded-[30px] bg-[#080d1a] px-4 py-6 text-white sm:px-8">
      <ThreeSurface
        variant="uno"
        className="pointer-events-none -right-10 top-10 z-0 h-112 w-136 opacity-50"
      />

      <div className="relative z-10 mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              if (room && room.status !== "finished" && room.status !== "cancelled" && view !== "finished") {
                setShowLeaveModal(true);
              } else if (view === "finished") {
                handleBackToLobby();
              } else {
                router.push("/client/list");
              }
            }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:border-emerald-300/40"
            aria-label="Retour"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-fuchsia-300">
              ChifPam Arena
            </p>
            <h2 className="mt-1 text-3xl font-black tracking-tight">
              UNO <span className="text-emerald-300">LIVE</span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-2 text-xs font-bold text-fuchsia-100"
            >
              <HelpCircle size={15} /> Comment jouer
            </button>
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs font-bold text-emerald-200">
              <ShieldCheck size={15} /> CP sécurisé
            </div>
          </div>
        </header>

        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200"
            role="status"
          >
            {message}
          </motion.div>
        )}

        {pendingBet && (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-slate-950/75 px-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-md rounded-3xl border border-emerald-300/25 bg-slate-950 p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-300">
                    Confirmation requise
                  </p>
                  <h2 className="mt-2 text-2xl font-black">
                    Engager {pendingBet.amount.toLocaleString()} CP ?
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingBet(null)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-300">
                Cette mise sera débitée immédiatement{" "}
                {pendingBet.type === "create"
                  ? `pour créer une salle de ${pendingBet.maxPlayers} joueurs`
                  : `pour rejoindre la salle MATCH-${pendingBet.code}`}
                .
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPendingBet(null)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-slate-300 hover:bg-white/10"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={confirmBet}
                  disabled={loading}
                  className="rounded-xl bg-emerald-300 px-4 py-3 text-sm font-black text-slate-950 hover:bg-emerald-200 disabled:opacity-50"
                >
                  Confirmer la mise
                </button>
              </div>
            </div>
          </div>
        )}

        <AnimatePresence>
          {showLeaveModal && (
            <LeaveRoomModal
              onConfirm={handleConfirmLeaveRoom}
              onCancel={() => setShowLeaveModal(false)}
              loading={loading}
              isWaiting={room?.status === "waiting"}
              isHost={isHost}
            />
          )}
        </AnimatePresence>

        {helpOpen && <UnoHelpModal onClose={() => setHelpOpen(false)} />}

        {view === "finished" && room && (
          <FinishedMatchScreen
            room={room}
            userId={userId}
            standings={standings}
            playerNames={playerNames}
            onBackToLobby={handleBackToLobby}
          />
        )}

        {view === "lobby" && (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="relative overflow-hidden rounded-[28px] border border-fuchsia-300/20 bg-linear-to-br from-fuchsia-950/70 via-slate-950 to-emerald-950/50 p-6 sm:p-8">
              <Sparkles className="mb-5 text-fuchsia-300" size={30} />
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-300">
                Multijoueur 2 à 4 joueurs
              </p>
              <h1 className="mt-3 max-w-xl text-4xl font-black tracking-tight sm:text-6xl">
                Le prochain coup vaut son pot.
              </h1>
              <p className="mt-5 max-w-lg text-sm leading-6 text-slate-300">
                Créez une table, partagez votre code et jouez chaque tour en
                temps réel. Toutes les mises et récompenses sont validées par
                Supabase.
              </p>
              <div className="mt-8 flex flex-wrap gap-3 text-xs font-bold text-slate-300">
                <span className="rounded-full bg-white/10 px-3 py-2">+2 / +4</span>
                <span className="rounded-full bg-white/10 px-3 py-2">Inversion</span>
                <span className="rounded-full bg-white/10 px-3 py-2">Bonus VIP +5%</span>
              </div>
            </section>

            <section className="space-y-5 rounded-[28px] border border-white/10 bg-white/4 p-5 sm:p-7">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">
                  Nouvelle table
                </p>
                <h3 className="mt-1 text-2xl font-black">Créer une partie</h3>
              </div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Mise minimale en CP
                <input
                  type="number"
                  min={10}
                  value={createBet}
                  onChange={(event) => setCreateBet(Number(event.target.value))}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-300/60"
                />
              </label>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Joueurs maximum
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {[2, 3, 4].map((value) => (
                    <button
                      type="button"
                      key={value}
                      onClick={() => setMaxPlayers(value)}
                      className={`rounded-xl border px-3 py-3 text-sm font-black ${
                        maxPlayers === value
                          ? "border-emerald-300 bg-emerald-300/15 text-emerald-200"
                          : "border-white/10 bg-white/5 text-slate-400"
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={createRoom}
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 py-3 font-black text-slate-950 transition hover:bg-emerald-200 disabled:opacity-50"
              >
                <Plus size={18} /> Créer une partie
              </button>

              <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                <span className="h-px flex-1 bg-white/10" /> ou rejoindre{" "}
                <span className="h-px flex-1 bg-white/10" />
              </div>

              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                ID du match
                <input
                  value={matchCode}
                  onChange={(event) => setMatchCode(event.target.value.toUpperCase())}
                  placeholder="Ex: 8X2K9P"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 font-mono text-white outline-none focus:border-fuchsia-300/60"
                />
              </label>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Votre mise
                <input
                  type="number"
                  min={10}
                  value={joinBet}
                  onChange={(event) => setJoinBet(Number(event.target.value))}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-fuchsia-300/60"
                />
              </label>
              <button
                type="button"
                onClick={joinRoom}
                disabled={loading || !matchCode.trim()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-fuchsia-300/40 bg-fuchsia-300/10 px-4 py-3 font-black text-fuchsia-100 transition hover:bg-fuchsia-300/20 disabled:opacity-50"
              >
                <LogIn size={18} /> Rejoindre la table
              </button>
            </section>
          </div>
        )}

        {view === "room" && room && (
          <section className="space-y-6">
            <div className="flex flex-col justify-between gap-4 rounded-[28px] border border-white/10 bg-white/4 p-5 sm:flex-row sm:items-center sm:p-7">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-300">
                  {room.status === "waiting"
                    ? "Salon d’attente"
                    : room.status === "cancelled"
                    ? "Salon fermé"
                    : "Partie en cours"}
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <h1 className="font-mono text-3xl font-black tracking-widest">
                    MATCH-{room.match_code}
                  </h1>
                  <button
                    type="button"
                    onClick={copyMatchCode}
                    className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white"
                  >
                    {copied ? <Check size={16} className="text-emerald-300" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 text-sm font-bold text-slate-300">
                  <Users size={18} /> {players.length}/{room.max_players}{" "}
                  <span className="text-emerald-300">{room.pot_cp.toLocaleString()} CP</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(true)}
                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition"
                >
                  Quitter
                </button>
              </div>
            </div>

            {room.status === "waiting" ? (
              <div className="grid gap-6 lg:grid-cols-[1fr_0.65fr]">
                <div className="grid gap-3 sm:grid-cols-2">
                  {Array.from({ length: room.max_players }).map((_, index) => {
                    const player = players.find((entry) => entry.seat === index);
                    return (
                      <div
                        key={index}
                        className="flex min-h-32 flex-col justify-between rounded-2xl border border-white/10 bg-slate-950/60 p-5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                            Siège {index + 1}
                          </span>
                          {player?.user_id === room.host_id && (
                            <Crown size={16} className="text-amber-300" />
                          )}
                        </div>
                        <p className="text-lg font-black">
                          {player
                            ? player.user_id === userId
                              ? "Vous"
                              : getPlayerName(player)
                            : "En attente..."}
                        </p>
                        {player && (
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs text-emerald-300">
                              Mise {player.bet_cp.toLocaleString()} CP
                            </p>
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                                player.is_connected ? "text-emerald-300" : "text-amber-300"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  player.is_connected ? "bg-emerald-300" : "bg-amber-300"
                                }`}
                              />
                              {player.is_connected ? "En ligne" : "Déconnecté"}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/5 p-5">
                  <p className="text-sm leading-6 text-slate-300">
                    Le match démarre automatiquement quand la salle est pleine. Les mises sont
                    remboursées si le délai expire.
                  </p>
                  <p className="mt-4 font-mono text-2xl font-black text-emerald-200">
                    {remainingSeconds === null
                      ? "--:--"
                      : `${Math.floor(remainingSeconds / 60)
                          .toString()
                          .padStart(2, "0")}:${(remainingSeconds % 60)
                          .toString()
                          .padStart(2, "0")}`}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Temps restant</p>
                  <button
                    type="button"
                    onClick={startMatch}
                    disabled={!canStart || loading || remainingSeconds === 0}
                    className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 py-3 font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Play size={17} /> {loading ? "Préparation..." : "Démarrer la partie"}
                  </button>
                </div>
              </div>
            ) : room.status === "cancelled" ? (
              <div className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-6 text-center text-amber-100">
                <p className="text-lg font-black text-amber-300">La salle a été fermée.</p>
                <p className="mt-2 text-sm text-slate-300">
                  La partie a été annulée (abandon, hôte parti ou délai de 8 minutes dépassé).
                  Toutes les mises engagées ont été entièrement remboursées.
                </p>
                <button
                  type="button"
                  onClick={handleBackToLobby}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-300 px-5 py-2.5 text-xs font-black text-slate-950 hover:bg-amber-200 transition"
                >
                  <Home size={16} /> Retourner au salon
                </button>
              </div>
            ) : (
              <GameBoard
                room={room}
                player={myPlayer}
                players={players}
                playerNames={playerNames}
                isMyTurn={Boolean(isMyTurn)}
                playable={playable}
                selectedColor={selectedColor}
                setSelectedColor={setSelectedColor}
                selectedCardId={selectedCardId}
                setSelectedCardId={setSelectedCardId}
                playCard={playCard}
                drawCard={drawCard}
                loading={loading}
                hasFinished={hasFinished}
                remainingTurnSeconds={remainingTurnSeconds}
                onHelp={() => setHelpOpen(true)}
              />
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function GameBoard({
  room,
  player,
  players,
  playerNames,
  isMyTurn,
  playable,
  selectedColor,
  setSelectedColor,
  selectedCardId,
  setSelectedCardId,
  playCard,
  drawCard,
  loading,
  hasFinished,
  remainingTurnSeconds,
  onHelp,
}: {
  room: UnoRoom;
  player?: UnoPlayer;
  players: UnoPlayer[];
  playerNames: Record<string, string>;
  isMyTurn: boolean;
  playable: Set<string>;
  selectedColor: UnoCard["color"] | null;
  setSelectedColor: (color: UnoCard["color"] | null) => void;
  selectedCardId: string | null;
  setSelectedCardId: (id: string | null) => void;
  playCard: (card: UnoCard) => void;
  drawCard: () => void;
  loading: boolean;
  hasFinished: boolean;
  remainingTurnSeconds: number | null;
  onHelp: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-center gap-3">
        {players
          .filter((entry) => entry.user_id !== player?.user_id)
          .map((entry) => (
            <div
              key={entry.user_id}
              className={`rounded-full border px-4 py-2 text-xs font-bold transition-all ${
                room.current_turn === entry.user_id
                  ? "border-fuchsia-300 bg-fuchsia-300/15 text-fuchsia-100 shadow-[0_0_25px_rgba(232,121,249,0.35)]"
                  : "border-white/10 bg-white/5 text-slate-400"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-fuchsia-300/20 text-[10px] text-fuchsia-100">
                  {(playerNames[entry.user_id] ?? `Joueur ${entry.seat + 1}`)
                    .slice(0, 1)
                    .toUpperCase()}
                </span>
                {playerNames[entry.user_id] ?? `Joueur ${entry.seat + 1}`} · {entry.hand.length} cartes
              </span>
              <span
                className={`ml-2 inline-flex items-center gap-1 ${
                  entry.is_connected ? "text-emerald-300" : "text-amber-300"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    entry.is_connected ? "bg-emerald-300" : "bg-amber-300"
                  }`}
                />
                {entry.is_connected ? "En ligne" : "Déconnecté"}
              </span>
            </div>
          ))}
      </div>

      <div className="relative flex min-h-90 flex-col items-center justify-center overflow-hidden rounded-4xl border border-white/10 bg-[radial-gradient(circle_at_center,#16213d_0%,#080d1a_65%)] p-8">
        <div className="absolute left-5 top-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
          Tour {room.turn_number}
        </div>
        <div className="absolute right-5 top-5 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300">
          <span>
            Couleur active : <span className="text-emerald-300 font-extrabold uppercase">{room.current_color}</span>
          </span>
          <span
            className={
              remainingTurnSeconds !== null && remainingTurnSeconds <= 10
                ? "text-rose-300 font-extrabold"
                : "text-amber-200"
            }
          >
            ⏱ {remainingTurnSeconds ?? "--"}s
          </span>
        </div>

        <div className="flex items-center gap-5">
          <div className="grid aspect-[3/4] w-20 place-items-center rounded-2xl border-4 border-white/20 bg-linear-to-br from-fuchsia-700 to-slate-950 text-3xl shadow-2xl">
            <Disc3 />
          </div>
          <UnoCardView card={room.top_card} playable={false} />
        </div>

        <p
          className={`mt-8 text-sm font-black uppercase tracking-[0.2em] ${
            isMyTurn ? "animate-pulse text-emerald-300" : "text-slate-500"
          }`}
        >
          {hasFinished
            ? "Partie terminée"
            : isMyTurn
            ? "C'est votre tour de jouer !"
            : "En attente du coup adverse..."}
        </p>

        {isMyTurn && player?.hand.length === 1 && (
          <div className="mt-3 rounded-full bg-rose-500 px-4 py-2 text-sm font-black tracking-[0.25em] text-white shadow-[0_0_30px_rgba(244,63,94,0.45)]">
            UNO !
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/2 p-3 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
          Choisir une couleur pour les cartes Jokers
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {UNO_COLORS.map((color) => (
            <button
              type="button"
              key={color.value}
              onClick={() => setSelectedColor(color.value)}
              className={`h-9 w-9 rounded-full ${color.className} ${
                selectedColor === color.value
                  ? "ring-4 ring-white ring-offset-2 ring-offset-[#080d1a] scale-110"
                  : "opacity-70 hover:opacity-100"
              } transition-all`}
              aria-label={`Choisir ${color.label}`}
            />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
            Votre main ({player?.hand.length ?? 0} cartes)
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={drawCard}
              disabled={!isMyTurn || loading || hasFinished}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/10 disabled:opacity-40"
            >
              <RefreshCw size={14} /> Piocher une carte
            </button>
            <button
              type="button"
              onClick={onHelp}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300"
            >
              <HelpCircle size={14} /> Règles
            </button>
          </div>
        </div>

        <div className="flex min-h-28 flex-wrap justify-center gap-2 sm:gap-3">
          {(player?.hand ?? []).map((card) => {
            const isCardPlayable = isMyTurn && playable.has(card.id) && !loading && !hasFinished;
            return (
              <motion.div key={card.id} layout>
                <UnoCardView
                  card={card}
                  playable={isCardPlayable}
                  isSelected={selectedCardId === card.id}
                  onPlay={() => {
                    setSelectedCardId(card.id);
                    playCard(card);
                  }}
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function FinishedMatchScreen({
  room,
  userId,
  standings,
  playerNames,
  onBackToLobby,
}: {
  room: UnoRoom;
  userId: string | null;
  standings: Standing[];
  playerNames: Record<string, string>;
  onBackToLobby: () => void;
}) {
  const isIWinner = room.winner_id === userId;
  const winner = standings.find((entry) => entry.user_id === room.winner_id);
  const ranking = standings
    .filter((entry) => entry.user_id !== room.winner_id)
    .sort((left, right) => left.score - right.score);

  const totalReward = room.pot_cp + room.vip_bonus_cp;

  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative overflow-hidden rounded-4xl border p-6 text-center sm:p-10 ${
        isIWinner
          ? "border-amber-300/40 bg-linear-to-br from-amber-500/20 via-slate-950 to-emerald-500/20 shadow-[0_0_50px_rgba(245,158,11,0.2)]"
          : "border-rose-500/30 bg-linear-to-br from-rose-950/30 via-slate-950 to-slate-900"
      }`}
    >
      <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-black uppercase tracking-[0.3em] text-slate-300">
        <Trophy size={16} className={isIWinner ? "text-amber-300" : "text-slate-400"} />
        Résultats de la partie
      </div>

      <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
        {isIWinner ? (
          <span className="text-amber-300 drop-shadow-md">Victoire écrasante !</span>
        ) : (
          <span className="text-rose-400">Défaite</span>
        )}
      </h1>

      <div className="relative mx-auto mt-6 grid h-24 w-24 place-items-center rounded-full border-4 border-amber-300/80 bg-amber-400/20 text-4xl font-black text-amber-100 shadow-[0_0_30px_rgba(251,191,36,0.4)]">
        {(winner ? playerNames[winner.user_id] ?? winner.username ?? "J" : "J")
          .slice(0, 1)
          .toUpperCase()}
      </div>

      <p className="mt-4 text-lg font-bold text-slate-200">
        Gagnant :{" "}
        <span className="text-amber-300 font-black">
          {winner ? playerNames[winner.user_id] ?? winner.username ?? "Joueur" : "Joueur"}
        </span>
      </p>

      <div className="mt-4 inline-block rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-6 py-3">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Gain total distribué</p>
        <p className="text-3xl font-black text-emerald-200 mt-1">
          +{totalReward.toLocaleString()} CP
        </p>
      </div>

      {ranking.length > 0 && (
        <div className="relative mx-auto mt-8 max-w-md space-y-2 text-left">
          <p className="mb-3 text-center text-xs font-black uppercase tracking-[0.25em] text-slate-500">
            Classement final (Points restants)
          </p>
          {ranking.map((entry, index) => (
            <div
              key={entry.user_id}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3"
            >
              <span className="flex items-center gap-3">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-xs font-black text-slate-300">
                  #{index + 2}
                </span>
                <span className="font-bold text-slate-200">
                  {playerNames[entry.user_id] ?? entry.username ?? `Joueur`}
                </span>
              </span>
              <span className="font-mono text-sm font-bold text-slate-400">{entry.score} pts</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={onBackToLobby}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-6 py-3.5 text-sm font-black text-slate-950 transition hover:bg-emerald-300 active:scale-95 shadow-lg shadow-emerald-400/20"
        >
          <Home size={18} />
          Retourner au salon principal
        </button>
      </div>
    </motion.section>
  );
}

function UnoHelpModal({ onClose }: { onClose: () => void }) {
  const examples: Array<{ card: UnoCard; title: string; description: string }> = [
    {
      card: { id: "help-number", color: "red", value: "7" },
      title: "Carte numérique",
      description: "Jouez une carte de même couleur ou de même valeur.",
    },
    {
      card: { id: "help-skip", color: "yellow", value: "skip" },
      title: "Passe",
      description: "Le joueur suivant perd son tour.",
    },
    {
      card: { id: "help-reverse", color: "blue", value: "reverse" },
      title: "Renverse",
      description: "Inverse le sens à 3-4 joueurs; à 2 joueurs, vous rejouez.",
    },
    {
      card: { id: "help-draw2", color: "green", value: "draw2" },
      title: "+2",
      description: "Le joueur suivant pioche deux cartes et perd son tour.",
    },
    {
      card: { id: "help-wild", color: "black", value: "wild" },
      title: "Joker",
      description: "Choisissez la couleur qui continuera la partie.",
    },
    {
      card: { id: "help-wild4", color: "black", value: "wild4" },
      title: "+4",
      description: "Choisissez une couleur; le joueur suivant pioche quatre cartes.",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[min(88vh,760px)] w-full max-w-2xl overflow-y-auto rounded-3xl border border-fuchsia-300/25 bg-[#0b1222] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-fuchsia-300">
              UNO Live
            </p>
            <h2 className="mt-2 text-2xl font-black">Comment jouer</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300"
          >
            Fermer
          </button>
        </div>
        <div className="mt-5 text-sm leading-6 text-slate-300 space-y-2">
          <p>
            À tour de rôle, posez une carte qui correspond à la couleur ou à la valeur de la carte visible.
          </p>
          <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs text-emerald-200">
            <strong>Règle de la pioche :</strong> Si la pioche est vide, la dernière carte jouée reste sur la défausse et toutes les autres cartes défaussées sont mélangées pour former une nouvelle pioche. La partie ne s'arrête pas.
          </p>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {examples.map((example) => (
            <div
              key={example.card.id}
              className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-3"
            >
              <UnoCardView card={example.card} playable={false} />
              <div>
                <h3 className="font-black text-white">{example.title}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-400">{example.description}</p>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-slate-200"
        >
          J’ai compris
        </button>
      </div>
    </div>
  );
}
