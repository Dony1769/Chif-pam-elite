"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const PUSH_EVENT = "chifpam:push-subscription-changed";

type PushState = {
  supported: boolean;
  enabled: boolean;
  loading: boolean;
  error: string | null;
};

function urlBase64ToArrayBuffer(value: string): ArrayBuffer {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from([...window.atob(base64)].map((character) => character.charCodeAt(0))).buffer as ArrayBuffer;
}

async function getSubscription(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export function usePushNotifications() {
  const supported = typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
  const [state, setState] = useState<PushState>({ supported, enabled: false, loading: supported, error: null });

  const refresh = useCallback(async () => {
    if (!supported) {
      setState({ supported: false, enabled: false, loading: false, error: "Les notifications push ne sont pas supportées par ce navigateur." });
      return;
    }
    try {
      const subscription = await getSubscription();
      setState((current) => ({ ...current, loading: false, enabled: Boolean(subscription && Notification.permission === "granted"), error: null }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : "Impossible de vérifier l’abonnement push." }));
    }
  }, [supported]);

  useEffect(() => {
    void refresh();
    const onChanged = () => void refresh();
    window.addEventListener(PUSH_EVENT, onChanged);
    return () => window.removeEventListener(PUSH_EVENT, onChanged);
  }, [refresh]);

  const subscribe = useCallback(async () => {
    if (!supported) throw new Error("Les notifications push ne sont pas supportées par ce navigateur.");
    if (!VAPID_PUBLIC_KEY) throw new Error("La clé publique VAPID est absente.");
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Autorisation de notifications refusée.");
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToArrayBuffer(VAPID_PUBLIC_KEY) });
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw userError ?? new Error("Session expirée.");
      const { error: saveError } = await supabase.from("push_subscriptions").upsert({ user_id: user.id, subscription: subscription.toJSON() }, { onConflict: "subscription" });
      if (saveError) throw saveError;
      setState((current) => ({ ...current, loading: false, enabled: true, error: null }));
      window.dispatchEvent(new Event(PUSH_EVENT));
      return subscription;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible d’activer les notifications push.";
      setState((current) => ({ ...current, loading: false, error: message }));
      throw new Error(message);
    }
  }, [supported]);

  return { ...state, refresh, subscribe };
}
