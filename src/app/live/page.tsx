"use client";

import Link from 'next/link';
import { ArrowLeft, ArrowRight, Dices, Sparkles, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

type LiveGame = {
  id: string;
  name: string;
  description: string;
  href: string;
  players: string;
  accent: string;
};

const LIVE_GAMES: LiveGame[] = [
  {
    id: 'uno',
    name: 'UNO Live',
    description: 'Cartes, stratégie et pot CP en temps réel.',
    href: '/client/uno',
    players: '2 à 4 joueurs',
    accent: 'from-fuchsia-400/25 via-fuchsia-400/5',
  },
];

export default function LiveHubPage() {
  const router = useRouter();
  return (
    <main className="min-h-screen overflow-hidden bg-[#080d1a] px-5 py-10 text-white sm:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex items-end justify-between gap-4">
          <div>
            <button type="button" onClick={() => router.back()} className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:border-emerald-300/40" aria-label="Retour"><ArrowLeft size={18} /></button>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-emerald-300">ChifPam Arena</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-6xl">Live</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">Retrouvez les parties multijoueur disponibles maintenant.</p>
          </div>
          <Sparkles className="hidden text-fuchsia-300 sm:block" size={32} />
        </header>

        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Jeux live disponibles">
          {LIVE_GAMES.map((game) => (
            <Link
              key={game.id}
              href={game.href}
              className={`group relative overflow-hidden rounded-[26px] border border-white/10 bg-linear-to-br ${game.accent} to-slate-950 p-6 transition hover:-translate-y-1 hover:border-emerald-300/40`}
            >
              <div className="flex items-start justify-between">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-fuchsia-300/15 text-fuchsia-200"><Dices size={25} /></span>
                <ArrowRight className="text-slate-500 transition group-hover:translate-x-1 group-hover:text-emerald-300" size={20} />
              </div>
              <h2 className="mt-8 text-2xl font-black">{game.name}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">{game.description}</p>
              <p className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-emerald-200"><Users size={15} /> {game.players}</p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}