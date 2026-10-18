/**
 * FC CAREER 27 — Stockage des carrières v2 (Manager et Joueur).
 *
 * localStorage plafonne à ~5 Mo par site (partagés avec tout chifpam) : trop
 * petit pour un monde complet. Les sauvegardes vivent donc dans IndexedDB
 * (natif, quota de plusieurs centaines de Mo), avec un cache mémoire pour
 * garder une API synchrone (getItem/setItem) côté moteur.
 *
 * Sécurité : tant que le cache n'est pas hydraté, `gameStore()` renvoie null —
 * les appelants voient « stockage indisponible » et n'écrasent jamais rien.
 */

import type { KeyValueStore } from "../manager/storage";

const DB_NAME = "fc-career-27";
const STORE = "kv";
/** Clés déplacées de localStorage vers IndexedDB. */
export const GAME_KEYS = [
  "fc-career-v2:manager", "fc-career-v2:manager:backup",
  "fc-career-v3:player", "fc-career-v3:player:backup",
] as const;
/** Toutes les clés de carrière (v1 incluse) effacées par une réinitialisation complète. */
const LEGACY_LS_KEYS = ["fc-career-v2:save", "fc-career-v2:save:backup"];
/** Effacement unique demandé le 15/10/2026 : toutes les sauvegardes d'alors. */
const PURGE_FLAG = "fc-career:purge-2026-10-15";

let cache: Map<string, string> | null = null;
let backend: "idb" | "local" | null = null;
let hydrating: Promise<HydrateInfo> | null = null;
let db: IDBDatabase | null = null;
const writeErrorListeners = new Set<(key: string) => void>();

export interface HydrateInfo { ok: boolean; backend: "idb" | "local" | null; purgedNow: boolean }

function ls(): Storage | null {
  try { return typeof window !== "undefined" ? window.localStorage : null; } catch { return null; }
}

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
}

function openDb(): Promise<IDBDatabase | null> {
  return new Promise(resolve => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE); };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => resolve(null);
      r.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
}

function tx(mode: IDBTransactionMode) { return db!.transaction(STORE, mode).objectStore(STORE); }

/** Charge les sauvegardes en mémoire (une seule fois par page). */
export function hydrateGameStore(): Promise<HydrateInfo> {
  if (hydrating) return hydrating;
  hydrating = (async (): Promise<HydrateInfo> => {
    const local = ls();
    let purgedNow = false;
    db = await openDb();
    // Effacement unique demandé par le propriétaire du jeu
    if (local && !local.getItem(PURGE_FLAG)) {
      try {
        for (const k of [...GAME_KEYS, ...LEGACY_LS_KEYS]) local.removeItem(k);
        if (db) await req(tx("readwrite").clear());
        local.setItem(PURGE_FLAG, String(Date.now()));
        purgedNow = true;
      } catch { /* on réessaiera au prochain chargement */ }
    }
    const map = new Map<string, string>();
    if (db) {
      try {
        for (const k of GAME_KEYS) {
          const raw = await req(tx("readonly").get(k));
          const v = raw instanceof Blob ? await unzip(raw) : raw;
          if (typeof v === "string") map.set(k, v);
          else if (local) {
            // Migration : une ancienne sauvegarde localStorage passe dans IndexedDB
            const old = local.getItem(k);
            if (old) {
              await req(tx("readwrite").put(old, k));
              if ((await req(tx("readonly").get(k))) === old) local.removeItem(k);
              map.set(k, old);
            }
          }
        }
        backend = "idb";
      } catch { db = null; }
    }
    if (!db) {
      if (!local) return { ok: false, backend: null, purgedNow };
      for (const k of GAME_KEYS) { const v = local.getItem(k); if (v) map.set(k, v); }
      backend = "local";
    }
    cache = map;
    if (typeof navigator !== "undefined") navigator.storage?.persist?.().catch(() => {});
    return { ok: true, backend, purgedNow };
  })();
  return hydrating;
}

/**
 * Compression gzip native du navigateur (aucune bibliothèque) : une carrière
 * de plusieurs saisons passe de quelques Mo à quelques centaines de Ko.
 * Les anciennes sauvegardes en texte restent lues telles quelles.
 */
const canZip = () => typeof CompressionStream !== "undefined" && typeof DecompressionStream !== "undefined" && typeof Blob !== "undefined";
async function zip(text: string): Promise<Blob> {
  return new Response(new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"))).blob();
}
async function unzip(b: Blob): Promise<string | null> {
  try { return await new Response(b.stream().pipeThrough(new DecompressionStream("gzip"))).text(); } catch { return null; }
}

/** Écritures enchaînées par clé : la dernière sauvegarde gagne toujours. */
const queue = new Map<string, Promise<void>>();
function persistIdb(key: string, value: string | null) {
  const fail = () => writeErrorListeners.forEach(f => f(key));
  const prev = queue.get(key) ?? Promise.resolve();
  const next = prev.then(async () => {
    try {
      if (value === null) { await req(tx("readwrite").delete(key)); return; }
      const data: string | Blob = canZip() && value.length > 4096 ? await zip(value) : value;
      // Vérification : on ne remplace jamais une sauvegarde par une archive illisible
      if (data instanceof Blob && (await unzip(data)) !== value) { await req(tx("readwrite").put(value, key)); return; }
      await req(tx("readwrite").put(data, key));
    } catch { fail(); }
  });
  queue.set(key, next);
  void next.finally(() => { if (queue.get(key) === next) queue.delete(key); });
}

function persist(key: string, value: string | null) {
  if (backend === "idb" && db) {
    persistIdb(key, value);
  } else {
    const local = ls();
    if (!local) throw new Error("stockage indisponible");
    if (value === null) local.removeItem(key); else local.setItem(key, value); // peut lever (quota)
  }
}

const store: KeyValueStore & { removeItem(k: string): void } = {
  getItem: k => cache?.get(k) ?? null,
  setItem: (k, v) => { persist(k, v); cache!.set(k, v); },
  removeItem: k => { persist(k, null); cache!.delete(k); },
};

/** Magasin synchrone — null tant que l'hydratation n'est pas terminée. */
export function gameStore(): (KeyValueStore & { removeItem(k: string): void }) | null {
  return cache ? store : null;
}

export function onWriteError(f: (key: string) => void): () => void {
  writeErrorListeners.add(f);
  return () => { writeErrorListeners.delete(f); };
}

export type ResetScope = "player" | "manager" | "all";

/** Réinitialisation complète, demandée explicitement par le joueur (copies de secours comprises). */
export async function resetCareers(scope: ResetScope): Promise<boolean> {
  await hydrateGameStore();
  const s = gameStore();
  const keys = scope === "player" ? ["fc-career-v3:player", "fc-career-v3:player:backup"]
    : scope === "manager" ? ["fc-career-v2:manager", "fc-career-v2:manager:backup"]
    : [...GAME_KEYS];
  try {
    for (const k of keys) {
      s?.removeItem(k);
      ls()?.removeItem(k);
    }
    if (scope === "all") for (const k of LEGACY_LS_KEYS) ls()?.removeItem(k);
    if (backend === "idb" && db) {
      for (const k of keys) { await queue.get(k); await req(tx("readwrite").delete(k)); }
    }
    return true;
  } catch {
    return false;
  }
}

export interface StorageReport {
  backend: "idb" | "local" | null;
  sizes: Record<string, number>; // octets par clé
  usage?: number;
  quota?: number;
}

export async function storageReport(): Promise<StorageReport> {
  await hydrateGameStore();
  const sizes: Record<string, number> = {};
  for (const k of GAME_KEYS) { const v = cache?.get(k); if (v) sizes[k] = v.length * 2; }
  const v1 = ls()?.getItem("fc-career-v2:save");
  if (v1) sizes["fc-career-v2:save"] = v1.length * 2;
  let usage: number | undefined, quota: number | undefined;
  try { const e = await navigator.storage?.estimate?.(); usage = e?.usage; quota = e?.quota; } catch { /* inconnu */ }
  return { backend, sizes, usage, quota };
}
