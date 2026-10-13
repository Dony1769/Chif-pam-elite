"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createCareer, decode, encode, saveKey, type Career } from './game';
type Store = { game: Career; update: (action: (game: Career) => Career) => void; ready: boolean; error: string; reset: (player?: Partial<Career['player']>) => void; saved: boolean };
const Context = createContext<Store | null>(null);
export function GameProvider({ children }: { children: ReactNode }) {
  const [game, setGame] = useState(createCareer); const [ready, setReady] = useState(false); const [error, setError] = useState(''); const [saved, setSaved] = useState(false);
  useEffect(() => { try { const raw = localStorage.getItem(saveKey); if (raw) setGame(decode(raw)); } catch { setError('La sauvegarde est illisible. Exportez-la avant de créer une nouvelle carrière.'); } setReady(true); }, []);
  useEffect(() => { if (!ready || error) return; try { localStorage.setItem(saveKey, encode(game)); setSaved(true); } catch { setSaved(false); setError('Sauvegarde impossible : l’espace de stockage de cet appareil est indisponible.'); } }, [game, ready, error]);
  return <Context.Provider value={{ game, update: setGame, ready, error, saved, reset: input => { setError(''); setGame(createCareer(input)); } }}>{children}</Context.Provider>;
}
export function useCareer() { const store = useContext(Context); if (!store) throw new Error('Career provider missing'); return store; }