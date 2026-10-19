import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, Gamepad2, LockKeyhole, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';
import { LogoChifPam } from '@/components/LogoChifPam';
import { supabaseServer } from '@/lib/server-supabase';
import { getHomeRouteForRole } from '@/lib/auth-routing';


export const metadata: Metadata = {
	title: 'Jeux en ligne, défis et marché P2P',
	description: 'Rejoignez ChifPam : jeux instantanés, défis quotidiens et marché P2P communautaire, avec des accès sécurisés et des transactions encadrées.',
	alternates: { canonical: '/accueil' },
	openGraph: { title: 'ChifPam : jeux, défis et marché P2P', url: '/accueil' },
};

const games = [
	{ icon: Gamepad2, name: 'Défis quotidiens', description: 'Mettez votre stratégie à l’épreuve et gagnez des récompenses.' },
	{ icon: Sparkles, name: 'Jeux instantanés', description: 'Des parties rapides pensées pour jouer quand vous le souhaitez.' },
	{ icon: UsersRound, name: 'Marché P2P', description: 'Échangez vos offres dans un espace animé par la communauté.' },
] as const;

export default async function ChifPamLandingPage() {
	const supabase = await supabaseServer();
	const { data: { user } } = await supabase.auth.getUser();

	if (user) {
		const { data: profile } = await supabase
			.from('profiles')
			.select('role')
			.eq('id', user.id)
			.maybeSingle();

		redirect(getHomeRouteForRole(profile?.role));
	}

	return (
		<main className="relative isolate min-h-screen overflow-hidden bg-[#06110f] text-white">
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(16,185,129,0.24),transparent_32%),radial-gradient(circle_at_90%_20%,rgba(56,189,248,0.14),transparent_28%),linear-gradient(135deg,#06110f_0%,#071c21_55%,#0a1018_100%)]" />
			<div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-6 lg:px-10">
				<header className="flex items-center justify-between">
					<LogoChifPam />
					<nav className="flex items-center gap-3">
						<Link href="/connexion" className="rounded-md px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10">Se connecter</Link>
						<Link href="/inscription" className="inline-flex items-center gap-2 rounded-md bg-emerald-300 px-4 py-2 text-sm font-bold text-[#06201d] transition hover:bg-emerald-200"><span>S’inscrire</span><ArrowRight size={16} /></Link>
					</nav>
				</header>

				<section className="grid flex-1 items-center gap-14 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
					<div className="max-w-3xl">
						<p className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-200"><ShieldCheck size={15} /> Jeu, confiance, communauté</p>
						<h1 className="max-w-3xl text-5xl font-black leading-[0.96] tracking-[-0.04em] sm:text-7xl">Jouez. Échangez. <span className="text-emerald-300">Progressez.</span></h1>
						<p className="mt-7 max-w-xl text-lg leading-8 text-slate-300">Chif-Pam réunit vos jeux préférés, vos défis et un marché P2P conçu pour avancer avec clarté et sécurité.</p>
						<div className="mt-9 flex flex-wrap gap-3">
							<Link href="/inscription" className="inline-flex items-center gap-2 rounded-md bg-emerald-300 px-6 py-3 font-bold text-[#06201d] transition hover:bg-emerald-200"><span>Créer mon compte</span><ArrowRight size={18} /></Link>
							<Link href="/connexion" className="inline-flex items-center gap-2 rounded-md border border-white/15 px-6 py-3 font-bold text-white transition hover:border-emerald-300/50 hover:bg-white/5"><LockKeyhole size={17} /> Accéder à mon espace</Link>
						</div>
					</div>

					<div className="border-l border-emerald-200/20 pl-6 lg:pl-10">
						<p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-200">Un terrain de jeu complet</p>
						<div className="mt-5 divide-y divide-white/10">
							{games.map(({ icon: Icon, name, description }) => <div key={name} className="flex gap-4 py-5"><div className="grid size-11 shrink-0 place-items-center rounded-md border border-emerald-300/20 bg-emerald-300/10 text-emerald-200"><Icon size={21} /></div><div><h2 className="font-bold">{name}</h2><p className="mt-1 text-sm leading-6 text-slate-400">{description}</p></div></div>)}
						</div>
					</div>
				</section>

				<footer className="flex flex-wrap items-center gap-5 border-t border-white/10 py-5 text-xs text-slate-400"><span className="inline-flex items-center gap-2"><ShieldCheck size={15} className="text-emerald-300" /> Transactions encadrées</span><span className="inline-flex items-center gap-2"><LockKeyhole size={15} className="text-emerald-300" /> Accès protégés par rôle</span><span>Une communauté qui avance ensemble.</span></footer>
			</div>
		</main>
	);
}
