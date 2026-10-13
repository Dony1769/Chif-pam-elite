/**
 * FC CAREER — Hook Transferts : fenêtre de mercato, offres entrantes, signature.
 *
 * Suit la séparation moteur / état / vue de FC-CAREER-ARCHITECTURE.md :
 * - le moteur pur (engine/transfer-system.ts) calcule les offres et applique les contrats ;
 * - ce hook orchestre : lit l'état global via useGameContext, appelle le moteur,
 *   dispatch les actions, notifie via UIContext ;
 * - les offres sont régénérées à chaque nouvelle journée (mémoïsé sur season.currentDay),
 *   expirées automatiquement après `expiresOnDay`, et persistées dans localStorage
 *   (clé séparée de la sauvegarde principale, cf. utils/storage).
 *
 * Utilisation dans un composant MarketView :
 *   const { offers, windowOpen, refreshOffers, acceptTransfer, negotiate } = useTransfers();
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGameContext } from "../context/GameContext";
import { useUIContext } from "../context/UIContext";
import type { SalaryOffer } from "../types/economy";
import type { Player } from "../types/player";
import { getPosition } from "../constants/positions";
import { computeOverall } from "../engine/attribute-calculator";
import { marketValueMultiplier } from "../constants/scaling";
import { getClub, ALL_CLUBS } from "../constants/clubs";
import {
  generateOffers,
  isTransferWindowOpen,
  acceptOffer,
  counterOffer,
} from "../engine/transfer-system";
import { applySigningBonus, emptyWallet } from "../engine/economic-engine";

const OFFERS_STORAGE_KEY = "fc-career:offers";

interface StoredOffers {
  dayNumber: number;
  offers: SalaryOffer[];
}

function readStoredOffers(): StoredOffers | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(OFFERS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredOffers) : null;
  } catch {
    return null;
  }
}

function writeStoredOffers(dayNumber: number, offers: SalaryOffer[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(OFFERS_STORAGE_KEY, JSON.stringify({ dayNumber, offers }));
  } catch {
    /* quota / mode privé : on ignore, les offres sont régénérables */
  }
}

export interface UseTransfersResult {
  /** Offres valides pour la journée courante (filtrées sur expiresOnDay). */
  offers: SalaryOffer[];
  /** Le mercato est-il ouvert (été J0-J8, hiver J16-J19) ? */
  windowOpen: boolean;
  trueOverall: number;
  trueMarketValue: number;
  /** Force la (re)génération des offres selon l'état actuel du joueur. */
  refreshOffers: () => SalaryOffer[];
  /** Accepte une offre : nouveau contrat + prime de signature + moral. */
  acceptTransfer: (offer: SalaryOffer) => { ok: boolean; message: string };
  /** Contre-offre : négocie salaire/bonus (~10% mieux), usage unique par offre. */
  negotiate: (offer: SalaryOffer) => SalaryOffer;
}

export function useTransfers(): UseTransfersResult {
  const { state, dispatch } = useGameContext();
  const { notify } = useUIContext();
  const { player, season } = state;

  const currentDay = season?.currentDay ?? 0;

  // Overall "réel" recalculé à partir des attributs (valeur marché honnête).
  const trueOverall = useMemo(() => {
    if (!player) return 0;
    return computeOverall(player.attributes, getPosition(player.position).family);
  }, [player]);

  const trueMarketValue = useMemo(
    () => (player ? marketValueMultiplier(trueOverall, player.age, player.potential) : 0),
    [player, trueOverall],
  );

  /* ---------- génération / expiration des offres ---------- */

  const lastGenDayRef = useRef<number | null>(null);
  const [offers, setOffers] = useState<SalaryOffer[]>(() => {
    const stored = readStoredOffers();
    return stored ? stored.offers.filter((o) => o.expiresOnDay >= (stored.dayNumber ?? 0)) : [];
  });

  const buildOffers = useCallback(
    (p: Player): SalaryOffer[] => {
      const evaluated: Player =
        trueOverall && trueOverall !== p.overall
          ? { ...p, overall: trueOverall, marketValue: trueMarketValue }
          : p;
      return generateOffers(evaluated, ALL_CLUBS, currentDay);
    },
    [currentDay, trueOverall, trueMarketValue],
  );

  const refreshOffers = useCallback((): SalaryOffer[] => {
    if (!player) return [];
    const next = buildOffers(player);
    lastGenDayRef.current = currentDay;
    setOffers(next);
    writeStoredOffers(currentDay, next);
    return next;
  }, [player, buildOffers, currentDay]);

  // Régénération automatique une fois par nouvelle journée (uniquement si mercato ouvert).
  const autoGenDoneFor = useRef<number | null>(null);
  const windowOpen = isTransferWindowOpen(currentDay);
  useEffect(() => {
    if (!player || !windowOpen) return;
    if (autoGenDoneFor.current === currentDay) return;
    autoGenDoneFor.current = currentDay;
    if (lastGenDayRef.current === currentDay) return;
    const stored = readStoredOffers();
    if (stored && stored.dayNumber === currentDay) {
      // Offres déjà générées pour cette journée (persistance) : restaure + expire.
      setOffers(stored.offers.filter((o) => o.expiresOnDay >= currentDay));
    } else {
      const next = buildOffers(player);
      lastGenDayRef.current = currentDay;
      setOffers(next);
      writeStoredOffers(currentDay, next);
    }
  }, [player, windowOpen, currentDay, buildOffers]);

  /* ---------- actions ---------- */

  const acceptTransfer = useCallback(
    (offer: SalaryOffer): { ok: boolean; message: string } => {
      if (!player) return { ok: false, message: "Aucun joueur actif." };
      if (!isTransferWindowOpen(currentDay)) {
        return { ok: false, message: "Mercato fermé : attendez l'été (J0-J8) ou l'hiver (J16-J19)." };
      }
      const club = getClub(offer.clubId);
      if (!club) return { ok: false, message: "Club destinataire introuvable." };

      const signed = acceptOffer(player, offer);
      dispatch({ type: "SET_PLAYER", payload: signed });

      const wallet = state.wallet ?? emptyWallet();
      dispatch({ type: "SET_WALLET", payload: applySigningBonus(wallet, offer.signingBonus) });

      // L'offre acceptée et ses concurrentes disparaissent.
      setOffers([]);
      writeStoredOffers(currentDay, []);
      lastGenDayRef.current = null;

      const msg = `Signature officielle : ${club.name} (${offer.years} ans, ${(offer.salaryPerWeek / 1000).toFixed(1)}k€/sem).`;
      notify({ kind: "success", title: "Transfert conclu", message: msg });
      return { ok: true, message: msg };
    },
    [player, currentDay, state.wallet, dispatch, notify],
  );

  const negotiate = useCallback(
    (offer: SalaryOffer): SalaryOffer => {
      const improved = counterOffer(offer);
      setOffers((prev) => prev.map((o) => (o.clubId === offer.clubId ? improved : o)));
      notify({
        kind: "info",
        title: "Contre-offre envoyée",
        message: `${offer.clubName} : salaire porté à ${(improved.salaryPerWeek / 1000).toFixed(1)}k€/sem.`,
      });
      return improved;
    },
    [notify],
  );

  return {
    offers,
    windowOpen,
    trueOverall,
    trueMarketValue,
    refreshOffers,
    acceptTransfer,
    negotiate,
  };
}
