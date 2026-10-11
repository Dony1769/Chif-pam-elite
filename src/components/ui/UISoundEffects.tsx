"use client";

import { useEffect, useRef } from 'react';

export default function UISoundEffects() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio('/sounds/pop.mp3');
    audio.preload = 'auto';
    audio.volume = 0.22;
    audioRef.current = audio;

    const playClick = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const actionable = target.closest('button, [role="button"], a[href], input[type="submit"], input[type="button"]');
      if (!actionable) return;
      if (actionable.getAttribute('aria-disabled') === 'true') return;
      if ((actionable as HTMLButtonElement).disabled) return;

      const player = audioRef.current;
      if (!player) return;

      try {
        player.currentTime = 0;
        void player.play();
      } catch {
        // Browser policy blocked sound: fail silently.
      }
    };

    document.addEventListener('pointerdown', playClick, true);

    return () => {
      document.removeEventListener('pointerdown', playClick, true);
      audioRef.current = null;
    };
  }, []);

  return null;
}
