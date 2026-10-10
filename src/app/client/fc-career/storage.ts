import { PlayerCareerState } from '../types';

// ---------------------------------------------------------------
// VERSIONING ET MIGRATION
// ---------------------------------------------------------------
const STORAGE_KEY = 'fc_career_save';
const VERSION_KEY = 'fc_career_version';
const CURRENT_VERSION = 3; // Incrémenter à chaque changement de structure

interface SaveData {
  version: number;
  player: PlayerCareerState;
  timestamp: number;
  checksum: string;
}


// ---------------------------------------------------------------
// CHECKSUM (détection de corruption)
// ---------------------------------------------------------------
function simpleHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(16);
}

function computeChecksum(player: PlayerCareerState): string {
  const key = `${player.playerName}_${player.age}_${player.season}_${player.week}`;
  return simpleHash(key);
}

// ---------------------------------------------------------------
// COMPRESSION SIMPLE (reduce payload)
// ---------------------------------------------------------------
function compressInbox(inbox: PlayerCareerState['inbox']): any[] {
  return inbox.map((m) => ({
    id: m.id,
    f: m.from, // from → f
    s: m.season, // season → s
    w: m.week, // week → w
    t: m.title,
    b: m.body,
    r: m.read ? 1 : 0, // boolean → 0/1
  }));
}

function decompressInbox(data: any[]): PlayerCareerState['inbox'] {
  return data.map((m) => ({
    id: m.id,
    from: m.f,
    season: m.s,
    week: m.w,
    title: m.t,
    body: m.b,
    read: m.r === 1,
  }));
}

function compressPlayer(player: PlayerCareerState): any {
  return {
    ...player,
    inbox: compressInbox(player.inbox),
  };
}

function decompressPlayer(data: any): PlayerCareerState {
  return {
    ...data,
    inbox: decompressInbox(data.inbox),
  };
}

// ---------------------------------------------------------------
// MIGRATIONS
// ---------------------------------------------------------------
function migrateIfNeeded(data: any, fromVersion: number): any {
  let current = data;

  // Migration de v1 à v2 : ajout de 'fatigue'
  if (fromVersion < 2) {
    current.fatigue ??= 10;
    current.trainedThisWeek ??= false;
    current.lastTrainingNote ??= null;
    current.injuryWeeks ??= 0;
  }

  // Migration de v2 à v3 : ajout de 'seasonStats' et 'careerStats'
  if (fromVersion < 3) {
    current.seasonStats ??= {
      matches: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goals: 0,
      assists: 0,
      ratingSum: 0,
      ratedMatches: 0,
    };
    current.careerStats ??= { matches: 0, goals: 0, assists: 0 };
    current.pendingEvent ??= null;
    current.lastWeek ??= null;
  }

  return current;
}

// ---------------------------------------------------------------
// API PUBLIQUE
// ---------------------------------------------------------------

export function saveGame(player: PlayerCareerState): boolean {
  try {
    const checksum = computeChecksum(player);
    const saveData: SaveData = {
      version: CURRENT_VERSION,
      player: decompressPlayer(player) as PlayerCareerState, // Ensure it's decompressed before saving
      timestamp: Date.now(),
      checksum,
    };

    const json = JSON.stringify(saveData);
    const size = new Blob([json]).size;

    if (size > 5 * 1024 * 1024) {
      console.warn('Save file too large:', size, 'bytes. Clearing old data.');
      clearAllSaves();
      return false;
    }

    localStorage.setItem(STORAGE_KEY, json);
    localStorage.setItem(VERSION_KEY, String(CURRENT_VERSION));
    return true;
  } catch (err) {
    console.error('Failed to save game:', err);
    return false;
  }
}

export function loadGame(): PlayerCareerState | null {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return null;

    const saveData = JSON.parse(json) as SaveData;
    const savedVersion = saveData.version ?? 1;

    // Validation du checksum
    const checksum = computeChecksum(saveData.player);
    if (checksum !== saveData.checksum) {
      console.warn('Checksum mismatch: save may be corrupted');
    }

    // Migration
    let player = saveData.player;
    if (savedVersion < CURRENT_VERSION) {
      player = migrateIfNeeded(player, savedVersion);
    }

    // Décompression
    player = decompressPlayer(player);

    return player;
  } catch (err) {
    console.error('Failed to load game:', err);
    return null;
  }
}

export function hasSave(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}

export function clearAllSaves(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(VERSION_KEY);
  } catch (err) {
    console.error('Failed to clear saves:', err);
  }
}

export function getSaveInfo(): { timestamp: number; playerName: string; age: number; season: number } | null {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return null;
    const saveData = JSON.parse(json) as SaveData;
    return {
      timestamp: saveData.timestamp,
      playerName: saveData.player.playerName,
      age: saveData.player.age,
      season: saveData.player.season,
    };
  } catch (err) {
    console.error('Failed to get save info:', err);
    return null;
  }
}

export function exportSave(): string | null {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    return json;
  } catch (err) {
    console.error('Failed to export save:', err);
    return null;
  }
}

export function importSave(json: string): boolean {
  try {
    const saveData = JSON.parse(json) as SaveData;
    if (!saveData.version || !saveData.player) throw new Error('Invalid save format');
    localStorage.setItem(STORAGE_KEY, json);
    return true;
  } catch (err) {
    console.error('Failed to import save:', err);
    return false;
  }
}
