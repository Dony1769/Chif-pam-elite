"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { 
  ArrowLeft, MessageCircle, Zap,
  Layers, Disc, Target, Search, ChevronDown, 
  Check, ThumbsUp, ThumbsDown, ExternalLink, HelpCircle
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Logo officiel SVG
const LogoElite = React.memo(({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M75 35.5C71.5 28.5 64.2 24 56 24C41.6 24 30 35.6 30 50C30 64.4 41.6 76 56 76C66.5 76 75.5 69.8 79.5 61" stroke="#10B981" strokeWidth="10" strokeLinecap="round" />
    <path d="M55 45L76 24M76 24H58M76 24V42" stroke="#10B981" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
));

LogoElite.displayName = 'LogoElite';

// Types TypeScript stricts
export type GameCategory = 'crash' | 'squid' | 'plinko' | 'mines';
export type FAQCategory = 'jeux' | 'finances' | 'securite';

export interface GameInfo {
  id: GameCategory;
  name: string;
  desc: string;
  icon: React.ReactNode;
  href: string;
  color: string;
}

export interface FAQItem {
  id: string;
  category: FAQCategory;
  question: string;
  answer: React.ReactNode;
}

// Données statiques extraites du composant pour maximiser les performances de rendu
const GAMES_DATA: GameInfo[] = [
  {
    id: 'crash',
    name: 'Croissance (Crash)',
    desc: 'Encaissez avant que la courbe ne s’arrête. Plus vous attendez, plus le multiplicateur monte.',
    icon: <Zap size={18} className="text-amber-400" aria-hidden="true" />,
    href: '/client/games/crash',
    color: 'border-amber-500/20 bg-amber-500/5'
  },
  {
    id: 'squid',
    name: 'Squid Glass',
    desc: 'Choisissez la bonne vitre pour traverser le pont. Chaque saut réussi augmente vos gains.',
    icon: <Layers size={18} className="text-rose-400" aria-hidden="true" />,
    href: '/client/games/squid',
    color: 'border-rose-500/20 bg-rose-500/5'
  },
  {
    id: 'plinko',
    name: 'Plinko',
    desc: 'Lâchez la bille et espérez qu’elle tombe dans les multiplicateurs extérieurs pour le jackpot.',
    icon: <Disc size={18} className="text-indigo-400" aria-hidden="true" />,
    href: '/client/games/plinko',
    color: 'border-indigo-500/20 bg-indigo-500/5'
  },
  {
    id: 'mines',
    name: 'Mines',
    desc: 'Découvrez les diamants sans toucher les mines. Vous pouvez cashout à tout moment.',
    icon: <Target size={18} className="text-emerald-400" aria-hidden="true" />,
    href: '/client/games/mines',
    color: 'border-emerald-500/20 bg-emerald-500/5'
  },
];

const FAQ_DATA: FAQItem[] = [
  {
    id: 'faq-1',
    category: 'jeux',
    question: 'Comment placer une mise et encaisser ?',
    answer: (
      <div className="space-y-2 text-slate-300 text-xs">
        <p>Pour jouer en toute simplicité :</p>
        <ol className="list-decimal list-inside space-y-1 text-slate-400">
          <li>Choisissez votre jeu favori dans la section <strong className="text-white">"Missions / Jeux"</strong>.</li>
          <li>Indiquez votre mise (minimum <span className="text-emerald-400 font-bold">10 HTG</span>).</li>
          <li>Cliquez sur <strong className="text-emerald-400">"Encaisser" (Cashout)</strong> avant la fin de la partie pour sécuriser vos gains instantanément.</li>
        </ol>
      </div>
    )
  },
  {
    id: 'faq-2',
    category: 'finances',
    question: 'Comment effectuer un dépôt via MonCash ou NatCash ?',
    answer: (
      <div className="space-y-2 text-slate-300 text-xs">
        <p>Rendez-vous dans l'onglet <strong className="text-white">"Recharger"</strong> :</p>
        <ul className="list-disc list-inside space-y-1 text-slate-400">
          <li>Effectuez le transfert vers le numéro officiel affiché sur l'application.</li>
          <li>Soumettez l'ID de transaction ou la preuve d'envoi correspondante.</li>
          <li>Validation automatique ou manuelle en moins de <strong>15 minutes</strong>.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'faq-3',
    category: 'finances',
    question: 'Combien de temps prennent les retraits ?',
    answer: (
      <p className="text-slate-300 text-xs">
        Les retraits sont traités <strong className="text-emerald-400">7j/7</strong>. Une fois la vérification validée par notre système, la somme est envoyée directement sur votre compte MonCash ou NatCash.
      </p>
    )
  },
  {
    id: 'faq-4',
    category: 'securite',
    question: 'Quelles sont les règles de sécurité et d’anti-fraude ?',
    answer: (
      <div className="space-y-2 text-xs text-slate-300">
        <p className="text-rose-400 font-bold uppercase tracking-wider">Tolérance zéro sur la fraude :</p>
        <ul className="list-disc list-inside space-y-1 text-slate-400">
          <li>La falsification de reçus ou captures d'écran entraîne un bannissement définitif immédiat.</li>
          <li>Les scripts d'automatisation et robots de mise non autorisés sont strictement interdits.</li>
          <li>Un seul compte est autorisé par utilisateur unique et numéro de téléphone.</li>
        </ul>
      </div>
    )
  }
];

export default function HelpPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [openFaqId, setOpenFaqId] = useState<string | null>('faq-1');
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, boolean>>({});

  // Assainissement de la requête pour la recherche
  const cleanQuery = useMemo(() => searchQuery.trim().toLowerCase(), [searchQuery]);

  // Filtrage optimisé des jeux
  const filteredGames = useMemo(() => {
    if (!cleanQuery) return GAMES_DATA;
    return GAMES_DATA.filter(g => 
      g.name.toLowerCase().includes(cleanQuery) || 
      g.desc.toLowerCase().includes(cleanQuery)
    );
  }, [cleanQuery]);

  // Filtrage optimisé de la FAQ
  const filteredFaq = useMemo(() => {
    if (!cleanQuery) return FAQ_DATA;
    return FAQ_DATA.filter(f => 
      f.question.toLowerCase().includes(cleanQuery)
    );
  }, [cleanQuery]);

  // Handlers mémoïsés pour éviter les re-rendus inutiles
  const toggleAccordion = useCallback((id: string) => {
    setOpenFaqId(prevId => (prevId === id ? null : id));
  }, []);

  const handleFeedback = useCallback((id: string) => {
    setFeedbackGiven(prev => ({ ...prev, [id]: true }));
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-20 font-sans selection:bg-emerald-500 selection:text-black">
      
      {/* HEADER AVEC FLOATING EFFECT */}
      <header className="p-4 sm:p-6 flex items-center justify-between sticky top-0 bg-[#020617]/90 backdrop-blur-xl z-30 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/client/home')} 
            className="p-2.5 bg-slate-900 rounded-xl border border-white/10 text-emerald-400 hover:bg-slate-800 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label="Retour à l'accueil"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <LogoElite className="w-7 h-7" />
            <h1 className="text-lg font-black tracking-tight uppercase italic">
              Guide <span className="text-emerald-500">Elite</span>
            </h1>
          </div>
        </div>

        <Link 
          href="/client/chat"
          className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-emerald-500/20 transition focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <MessageCircle size={14} aria-hidden="true" />
          <span>Support</span>
        </Link>
      </header>

      <main className="max-w-3xl mx-auto p-4 sm:p-6 space-y-8">
        
        {/* BANNIÈRE DE RECHERCHE DYNAMIQUE */}
        <section aria-label="Recherche d'aide">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <Search size={18} aria-hidden="true" />
            </div>
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une règle, un jeu, un dépôt..."
              maxLength={100}
              className="w-full bg-slate-900/80 border border-white/10 rounded-2xl pl-11 pr-16 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all shadow-inner"
              aria-label="Champ de recherche dans la FAQ et les jeux"
            />
            {searchQuery && (
              <button 
                onClick={clearSearch}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                aria-label="Effacer la recherche"
              >
                Effacer
              </button>
            )}
          </div>
        </section>

        {/* SECTION 1 : RÈGLES ET ACCÈS DIRECT AUX JEUX */}
        <section className="space-y-4" aria-labelledby="section-games-title">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <Zap className="text-amber-400" size={18} aria-hidden="true" />
              </div>
              <h2 id="section-games-title" className="text-xs font-black tracking-widest uppercase italic text-slate-200">
                Règles des Jeux
              </h2>
            </div>
            <span className="text-[10px] text-slate-500 italic">{filteredGames.length} jeu(x) trouvé(s)</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {filteredGames.length > 0 ? (
              filteredGames.map((game) => (
                <article 
                  key={game.id} 
                  className={`p-4 rounded-2xl border ${game.color} backdrop-blur-sm flex flex-col justify-between gap-3 hover:border-white/20 transition-all group`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/10 shrink-0 group-hover:scale-105 transition-transform">
                      {game.icon}
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-white uppercase italic tracking-wide">{game.name}</h3>
                      <p className="text-[11px] text-slate-400 leading-relaxed mt-1 font-normal">{game.desc}</p>
                    </div>
                  </div>

                  <Link 
                    href={game.href}
                    className="self-end inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-400 hover:text-emerald-300 transition-colors pt-2"
                  >
                    <span>Jouer maintenant</span>
                    <ExternalLink size={12} aria-hidden="true" />
                  </Link>
                </article>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic col-span-2 text-center py-4">
                Aucun jeu ne correspond à votre recherche.
              </p>
            )}
          </div>
        </section>

        {/* SECTION 2 : FAQ ACCORDÉON INTERACTIF */}
        <section className="space-y-4" aria-labelledby="section-faq-title">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <HelpCircle className="text-emerald-400" size={18} aria-hidden="true" />
            </div>
            <h2 id="section-faq-title" className="text-xs font-black tracking-widest uppercase italic text-slate-200">
              Foire Aux Questions (FAQ)
            </h2>
          </div>

          <div className="space-y-3">
            {filteredFaq.length > 0 ? (
              filteredFaq.map((faq) => {
                const isOpen = openFaqId === faq.id;
                const hasVoted = feedbackGiven[faq.id];
                const contentId = `faq-content-${faq.id}`;

                return (
                  <div 
                    key={faq.id}
                    className="bg-slate-900/60 border border-white/5 rounded-2xl overflow-hidden transition-all"
                  >
                    <button
                      onClick={() => toggleAccordion(faq.id)}
                      aria-expanded={isOpen}
                      aria-controls={contentId}
                      className="w-full p-4 text-left flex items-center justify-between gap-4 hover:bg-white/5 transition-colors focus:outline-none focus:bg-white/5"
                    >
                      <span className="text-xs font-bold text-slate-200">{faq.question}</span>
                      <ChevronDown 
                        size={16} 
                        className={`text-slate-400 transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180 text-emerald-400' : ''}`} 
                        aria-hidden="true"
                      />
                    </button>

                    {isOpen && (
                      <div 
                        id={contentId}
                        role="region"
                        className="px-4 pb-4 pt-1 border-t border-white/5 space-y-4 transition-all duration-200"
                      >
                        {faq.answer}

                        {/* Retour utilisateur */}
                        <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500">
                          <span>Cette réponse vous a-t-elle été utile ?</span>
                          {hasVoted ? (
                            <span className="text-emerald-400 font-bold flex items-center gap-1">
                              <Check size={12} aria-hidden="true" /> Merci pour votre retour !
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => handleFeedback(faq.id)}
                                aria-label="Réponse utile"
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-400 transition"
                              >
                                <ThumbsUp size={12} />
                              </button>
                              <button 
                                onClick={() => handleFeedback(faq.id)}
                                aria-label="Réponse non utile"
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 transition"
                              >
                                <ThumbsDown size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-500 italic text-center py-4">
                Aucune question ne correspond à votre recherche.
              </p>
            )}
          </div>
        </section>

        {/* BANNIÈRE SUPPORT EN TEMPS RÉEL */}
        <section className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 sm:p-8 rounded-3xl text-slate-950 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl shadow-emerald-500/10">
          <div className="space-y-2 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 bg-black/10 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
              <MessageCircle size={12} aria-hidden="true" /> Support en direct
            </div>
            <h3 className="text-base sm:text-lg font-black uppercase italic tracking-tight">
              Une question sans réponse ?
            </h3>
            <p className="text-xs font-medium text-slate-900/80 max-w-sm">
              Nos modérateurs sont en ligne pour vous assister instantanément.
            </p>
          </div>

          <Link 
            href="/client/chat" 
            className="shrink-0 bg-slate-950 text-white px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform flex items-center gap-2 shadow-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <span>Ouvrir le Chat</span>
            <ChevronDown className="-rotate-90" size={14} aria-hidden="true" />
          </Link>
        </section>

      </main>

      {/* FOOTER DISCRET */}
      <footer className="flex flex-col items-center justify-center opacity-40 py-8 gap-2">
        <LogoElite className="w-8 h-8 grayscale" />
        <p className="text-[9px] tracking-[0.4em] uppercase font-bold text-slate-400">
          Chif-Pam Elite • Centre d'aide
        </p>
      </footer>
    </div>
  );
}
