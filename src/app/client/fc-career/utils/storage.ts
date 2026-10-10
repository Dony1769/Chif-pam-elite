import type { PlayerCareerState } from '../types';

const STORAGE_KEY = 'fc_career_save';

export function saveGame(player: PlayerCareerState): boolean {
  try {
    const json = JSON.stringify(player);
    localStorage.setItem(STORAGE_KEY, json);
    return true;
  } catch (err) {
    console.error('Save failed:', err);
    return false;
  }
}

export function loadGame(): PlayerCareerState | null {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return null;
    return JSON.parse(json) as PlayerCareerState;
  } catch (err) {
    console.error('Load failed:', err);
    return null;
  }
}

export function hasSave(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

export function clearAllSaves(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Clear failed:', err);
  }
}
