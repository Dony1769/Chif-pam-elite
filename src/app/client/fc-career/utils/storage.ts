import type { PlayerCareerState } from '../types';

const STORAGE_KEY = 'fc_career_save';


export function saveGame(player: PlayerCareerState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(player));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(): PlayerCareerState | null {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

export function clearAllSaves(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
