"use client";

import { useEffect, useRef, useCallback, useState } from 'react';
import { PlayerCareerState } from '../types';
import { saveGame, loadGame, hasSave, clearAllSaves, getSaveInfo } from './storage';

export interface GameSaveHook {
  player: PlayerCareerState | null;
  loading: boolean;
  error: string | null;
  saveNow: () => void;
  resetGame: () => void;
  hasSavedGame: boolean;
  saveInfo: { timestamp: number; playerName: string; age: number; season: number } | null;
}

/**
 * Hook de sauvegarde automatique et manuelle
 * - Charge la partie sauvegardée au montage
 * - Sauvegarde automatiquement toutes les 30 secondes ou sur demande
 */
export function useGameSave(
  initialPlayer: PlayerCareerState,
  autoSaveInterval: number = 30000 // 30 secondes
): GameSaveHook {
  const [player, setPlayer] = useState<PlayerCareerState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasSavedGame, setHasSavedGame] = useState(false);
  const [saveInfo, setSaveInfo] = useState<{ timestamp: number; playerName: string; age: number; season: number } | null>(null);

  const lastSaveRef = useRef<number>(0);
  const playerRef = useRef<PlayerCareerState | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Chargement initial (effet au montage)
  useEffect(() => {
    const load = () => {
      try {
        const hasSaved = hasSave();
        setHasSavedGame(hasSaved);

        if (hasSaved) {
          const loaded = loadGame();
          if (loaded) {
            setPlayer(loaded);
            playerRef.current = loaded;
            setSaveInfo(getSaveInfo());
          } else {
            setPlayer(initialPlayer);
            playerRef.current = initialPlayer;
            setError('Partie précédente non chargée. Nouvelle partie lancée.');
          }
        } else {
          setPlayer(initialPlayer);
          playerRef.current = initialPlayer;
        }
      } catch (err) {
        console.error('Load error:', err);
        setError('Erreur lors du chargement.');
        setPlayer(initialPlayer);
        playerRef.current = initialPlayer;
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [initialPlayer]);

  // 2. Auto-save périodique
  useEffect(() => {
    if (!player || loading) return;

    // Fonction de sauvegarde
    const doAutoSave = () => {
      if (!playerRef.current) return;
      const now = Date.now();
      if (now - lastSaveRef.current < 5000) return; // Debounce 5s minimum
      if (saveGame(playerRef.current)) {
        lastSaveRef.current = now;
        setSaveInfo(getSaveInfo());
      }
    };

    // Sauvegarde immédiate et ensuite périodique
    doAutoSave();
    autoSaveTimerRef.current = setInterval(doAutoSave, autoSaveInterval);

    // Sauvegarde avant de quitter la page
    const handleBeforeUnload = () => {
      if (playerRef.current) {
        saveGame(playerRef.current);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [player, loading, autoSaveInterval]);

  // 3. Mise à jour du playerRef à chaque changement
  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  // 4. Sauvegarde manuelle
  const saveNow = useCallback(() => {
    if (!playerRef.current) return;
    if (saveGame(playerRef.current)) {
      lastSaveRef.current = Date.now();
      setSaveInfo(getSaveInfo());
      setError(null);
    } else {
      setError('Erreur lors de la sauvegarde.');
    }
  }, []);

  // 5. Réinitialisation
  const resetGame = useCallback(() => {
    if (confirm('Êtes-vous sûr ? Cela supprimera votre partie sauvegardée.')) {
      clearAllSaves();
      setPlayer(initialPlayer);
      playerRef.current = initialPlayer;
      setHasSavedGame(false);
      setSaveInfo(null);
      setError(null);
    }
  }, [initialPlayer]);

  return { player, loading, error, saveNow, resetGame, hasSavedGame, saveInfo };
            }
