"use client";

/**
 * FC CAREER 27 — Son du match, synthétisé avec Web Audio (aucun fichier) :
 * rumeur de la foule, sifflet de l'arbitre, frappes, filet, poteau, arrêt,
 * clameur au but. Désactivable ; le choix est retenu dans ce navigateur.
 */

const KEY = "fc-career:sound";
let ctx: AudioContext | null = null;
let crowd: { src: AudioBufferSourceNode; gain: GainNode } | null = null;

export function soundOn(): boolean {
  try { return localStorage.getItem(KEY) !== "off"; } catch { return true; }
}
export function setSoundOn(on: boolean) {
  try { localStorage.setItem(KEY, on ? "on" : "off"); } catch { /* stockage indisponible */ }
  if (!on) stopCrowd();
}

function ac(): AudioContext | null {
  if (typeof window === "undefined" || !soundOn()) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch { return null; }
}

function noise(c: AudioContext, seconds: number): AudioBuffer {
  const b = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate);
  const d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
  return b;
}

function burst(seconds: number, freq: number, q: number, peak: number, attack = 0.01) {
  const c = ac(); if (!c) return;
  const src = c.createBufferSource(); src.buffer = noise(c, seconds);
  const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q;
  const g = c.createGain(); const t = c.currentTime;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + attack); g.gain.exponentialRampToValueAtTime(0.001, t + seconds);
  src.connect(f).connect(g).connect(c.destination); src.start();
}

function tone(freq: number, seconds: number, peak: number, type: OscillatorType = "sine", slideTo?: number, at = 0) {
  const c = ac(); if (!c) return;
  const o = c.createOscillator(); o.type = type; const t = c.currentTime + at;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + seconds);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + seconds);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + seconds + 0.05);
}

/** Sifflet : court (coup d'envoi), long (mi-temps), triple (fin). */
export function whistle(kind: "short" | "long" | "end" = "short") {
  const blow = (at: number, len: number) => {
    tone(2900, len, 0.07, "square", undefined, at);
    tone(3180, len, 0.05, "square", undefined, at);
  };
  if (kind === "short") blow(0, 0.35);
  else if (kind === "long") { blow(0, 0.3); blow(0.4, 0.7); }
  else { blow(0, 0.3); blow(0.4, 0.3); blow(0.8, 0.9); }
}

/** Frappe de balle (passe légère ou tir). */
export function kick(strong = false) {
  tone(strong ? 140 : 220, strong ? 0.16 : 0.08, strong ? 0.35 : 0.12, "sine", 60);
  burst(0.06, 1800, 1.2, strong ? 0.25 : 0.08, 0.002);
}

export function post() { tone(620, 0.5, 0.18, "triangle", 590); tone(1240, 0.3, 0.06, "sine"); }
export function save() { burst(0.18, 600, 0.8, 0.3, 0.005); burst(0.9, 500, 0.6, 0.12, 0.1); }
export function ooh() { burst(1.4, 420, 0.7, 0.22, 0.25); }

/** Filet puis clameur de la foule. */
export function goalRoar(home = true) {
  burst(0.25, 3000, 0.7, 0.12, 0.003);
  burst(3.2, home ? 700 : 450, 0.45, home ? 0.55 : 0.25, 0.15);
  burst(2.6, 1400, 0.5, home ? 0.3 : 0.1, 0.2);
}

/** Rumeur de la foule en boucle. */
export function startCrowd() {
  const c = ac(); if (!c || crowd) return;
  const src = c.createBufferSource(); src.buffer = noise(c, 4); src.loop = true;
  const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 900;
  const gain = c.createGain(); gain.gain.value = 0.0001; gain.gain.linearRampToValueAtTime(0.09, c.currentTime + 1.5);
  src.connect(f).connect(gain).connect(c.destination); src.start();
  crowd = { src, gain };
}
export function stopCrowd() {
  if (!crowd || !ctx) { crowd = null; return; }
  const { src, gain } = crowd; crowd = null;
  try { gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.8); src.stop(ctx.currentTime + 0.9); } catch { /* déjà arrêté */ }
}
