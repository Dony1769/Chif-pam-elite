"use client";

import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, BookOpen, Coins, ShieldCheck, 
  ChevronRight, Info, MessageCircle, Zap,
  Layers, Disc, Target, Brain, Fingerprint, Search,
  Play, CheckCircle, HelpCircle, Sparkles, ChevronDown,
  Gift, Calculator
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// LOGO OFFICIEL SVG CHIFPAM
const LogoElite = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M75 35.5C71.5 28.5 64.2 24 56 24C41.6 24 30 35.6 30 50C30 64.4 41.6 76 56 76C66.5 76 75.5 69.8 79.5 61" stroke="#10B981" strokeWidth="10" strokeLinecap="round" />
    <path d="M55 45L76 24M76 24H58M76 24V42" stroke="#10B981" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Structure des jeux avec routes exactes de l'application
interface GameGuide {
  id: string;
  name: string;
  desc: string;
  category: 'arcade' | 'reflexe' | 'logique';
  href: string;
  icon: React.ReactNode;
  rewardCP: number;
}

const GAMES_LIST: GameGuide[] = [
  { 
    id: 'quiz', 
    name: "Quiz Insights", 
    desc: "Répondez correctement aux questions de culture générale et de logique avant la fin du temps imparti.", 
    category: 'logique', 
    href: '/client/quiz', 
    icon: <Brain className="text-blue-400" size={18} />,
    rewardCP: 20
  },
  { 
    id: 'laser', 
    name: "Laser Vault", 
    desc: "Testez vos réflexes en évitant les faisceaux de sécurité pour déverrouiller le coffre fort.", 
    category: 'reflexe', 
    href: '/client/laser-vault', 
    icon: <Zap className="text-amber-400" size={18} />,
    rewardCP: 25
  },
  { 
    id: 'biometric', 
    name: "Biometric Lab", 
    desc: "Mémorisez les séquences biométriques complexes et reproduisez-les sans faire d'erreur.", 
    category: 'logique', 
    href: '/client/biometric-hack', 
    icon: <Fingerprint className="text-emerald-400" size={18} />,
    rewardCP: 30
  },
  { 
    id: 'crash', 
    name: "Croissance (Crash)", 
    desc: "Encaissez votre mise avant que la courbe ne s'arrête. Plus vous attendez, plus le multiplicateur monte.", 
    category: 'arcade', 
    href: '/client/games/crash', 
    icon: <Zap className="text-rose-500" size={18} />,
    rewardCP: 15
  },
  { 
    id: 'mines', 
    name: "Mines Sweeper", 
    desc: "Découvrez les cases sûres sans toucher aux mines cachées. Cashout possible à tout moment.", 
    category: 'arcade', 
    href: '/client/games/mines', 
    icon: <Target className="text-emerald-500" size={18} />,
    rewardCP: 15
  }
];

export default function HelpPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'games' | 'finances' | 'rules'>('all');
  const [claimedReward, setClaimedReward] = useState(false);
  
  // Calculateur interactif de simulation de conversion CP
  const [simulatedCp, setSimulatedCp] = useState<number>(500);
  const estimatedHtg = (simulatedCp * 0.0588).toFixed(2);

  // Filtrage des jeux selon la recherche
  const filteredGames = useMemo(() => {
    return GAMES_LIST.filter(game => 
      game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.desc.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const handleClaimReward = () => {
    setClaimedReward(true);
    // Ici vous pouvez ajouter un appel Supabase RPC pour ajouter +10 CP au compte de l'utilisateur
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white font-black italic uppercase pb-24 selection:bg-emerald-500 selection:text-black">
      
      {/* HEADER FIXE AVEC RETOUR CLIENT */}
      <header className="p-4 sm:p-6 flex items-center justify-between sticky top-0 bg-[#020617]/90 backdrop-blur-xl z-40 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/client/home')} 
            className="p-2.5 bg-slate-900 rounded-2xl border border-white/10 text-emerald-400 hover:text-white active:scale-90 transition-all flex items-center justify-center"
            aria-label="Retour"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <LogoElite className="w-6 h-6 sm:w-7 sm:h-7" />
            <h1 className="text-lg sm:text-xl tracking-tighter">Guide <span className="text-emerald-500">ChifPam</span></h1>
          </div>
        </div>

        {/* Badge Bonus interactif */}
        <button
          onClick={handleClaimReward}
          disabled={claimedReward}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] tracking-wider transition-all ${
            claimedReward 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
              : 'bg-amber-400 text-black animate-bounce shadow-lg shadow-amber-400/20'
          }`}
        >
          <Gift size={12} />
          <span>{claimedReward ? 'Bonus Lu +10 CP' : 'Réclamer +10 CP'}</span>
        </button>
      </header>

      <main className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 sm:space-y-8">
        
        {/* BANNIÈRE DE RECHERCHE */}
        <section className="relative space-y-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Rechercher une règle, un jeu, un dépôt..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/90 border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-xs font-normal not-italic text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* FILTRES PAR ONGLETS */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <TabButton active={activeTab === 'all'} onClick={() => setActiveTab('all')} label="Tout" />
            <TabButton active={activeTab === 'games'} onClick={() => setActiveTab('games')} label="Jeux & Regles" />
            <TabButton active={activeTab === 'finances'} onClick={() => setActiveTab('finances')} label="Dépôts & Retraits" />
            <TabButton active={activeTab === 'rules'} onClick={() => setActiveTab('rules')} label="Sécurité" />
          </div>
        </section>

        {/* SECTION JEUX ET ACCÈS DIRECT */}
        {(activeTab === 'all' || activeTab === 'games') && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
                  <Zap size={18} />
                </div>
                <h2 className="text-xs sm:text-sm tracking-widest uppercase">Catalogue des Jeux & Directs</h2>
              </div>
              <span className="text-[10px] text-slate-400 font-normal lowercase italic">{filteredGames.length} disponible(s)</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {filteredGames.map((game) => (
                <div 
                  key={game.id} 
                  className="bg-slate-900/60 p-4 rounded-2xl border border-white/5 hover:border-emerald-500/30 transition-all flex flex-col justify-between space-y-3 group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      {game.icon}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs text-white tracking-tight truncate">{game.name}</h3>
                        <span className="text-[8px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-1.5 py-0.5 rounded font-black">
                          +{game.rewardCP} CP
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 not-italic font-normal leading-relaxed lowercase line-clamp-2">
                        {game.desc}
                      </p>
                    </div>
                  </div>

                  <Link 
                    href={game.href}
                    className="w-full py-2 px-3 bg-white/5 hover:bg-emerald-500 hover:text-black border border-white/10 hover:border-emerald-500 rounded-xl text-[10px] tracking-wider uppercase flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <Play size={12} fill="currentColor" />
                    <span>Lancer le jeu</span>
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SECTION SIMULATEUR DE GAINS ET CONVERSION */}
        {(activeTab === 'all' || activeTab === 'finances') && (
          <section className="space-y-4">
            <AccordionSection 
              defaultOpen={true}
              icon={<Coins className="text-emerald-400" size={18} />} 
              title="Dépôts, Retraits & Simulateur CP"
            >
              <div className="space-y-4 pt-2">
                
                {/* Outil interactif Simulateur */}
                <div className="bg-black/40 p-4 rounded-2xl border border-emerald-500/20 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Calculator size={14} />
                    <span className="text-[10px] tracking-widest uppercase">Simulateur de Conversion CP → HTG</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-normal lowercase not-italic text-slate-300">
                      <span>Montant CP : <strong className="text-white font-black">{simulatedCp} CP</strong></span>
                      <span>Valeur estimée : <strong className="text-emerald-400 font-black">~{estimatedHtg} HTG</strong></span>
                    </div>
                    <input 
                      type="range" 
                      min="100" 
                      max="10000" 
                      step="100"
                      value={simulatedCp} 
                      onChange={(e) => setSimulatedCp(Number(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 space-y-1.5">
                    <p className="text-[10px] text-emerald-400 tracking-widest flex items-center gap-1">
                      <span>💸 Dépôts MonCash & NatCash</span>
                    </p>
                    <p className="text-[10px] lowercase not-italic font-normal text-slate-400 leading-relaxed">
                      Effectuez votre transfert vers notre numéro officiel. Insérez la référence de transaction. Validation automatique sous 5 à 15 minutes.
                    </p>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 space-y-1.5">
                    <p className="text-[10px] text-emerald-400 tracking-widest flex items-center gap-1">
                      <span>💰 Retraits 7j/7</span>
                    </p>
                    <p className="text-[10px] lowercase not-italic font-normal text-slate-400 leading-relaxed">
                      Les demandes de retraits sont traitées en continu. Réception directe du montant net sur votre portefeuille mobile money.
                    </p>
                  </div>
                </div>
              </div>
            </AccordionSection>
          </section>
        )}

        {/* SECTION SÉCURITÉ ET RÈGLES */}
        {(activeTab === 'all' || activeTab === 'rules') && (
          <section className="space-y-4">
            <AccordionSection 
              defaultOpen={false}
              icon={<ShieldCheck className="text-emerald-400" size={18} />} 
              title="Règles de Sécurité & Anti-Fraude"
            >
              <div className="bg-rose-500/5 p-4 sm:p-5 rounded-2xl border border-rose-500/20 space-y-3">
                <div className="flex items-center gap-2 text-rose-400">
                  <Info size={16} />
                  <span className="text-[10px] tracking-widest uppercase">Mesures de protection strictes :</span>
                </div>
                <ul className="text-[10px] space-y-2 text-slate-300 lowercase not-italic font-normal">
                  <li className="flex items-start gap-2">
                    <span className="text-rose-500 font-bold">•</span>
                    <span><strong>Captures falsifiées :</strong> Toute tentative de modification de reçu entraîne le bannissement définitif.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-500 font-bold">•</span>
                    <span><strong>Robots & Scripts :</strong> L'utilisation d'outils d'automatisation bloque immédiatement vos fonds.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-500 font-bold">•</span>
                    <span><strong>Unité de compte :</strong> Un seul compte autorisé par numéro MonCash/NatCash et par téléphone.</span>
                  </li>
                </ul>
              </div>
            </AccordionSection>
          </section>
        )}

        {/* SECTION ASSISTANCE / CONTACT DIRECT */}
        <section className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 p-6 sm:p-8 rounded-3xl text-slate-950 flex flex-col items-center text-center space-y-4 shadow-2xl shadow-emerald-500/10 relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
            <MessageCircle size={160} />
          </div>

          <div className="p-3 bg-black/10 rounded-2xl">
            <MessageCircle size={32} strokeWidth={2.5} className="text-slate-950" />
          </div>

          <div className="space-y-1">
            <h2 className="text-base sm:text-lg leading-tight uppercase font-black">Besoin d'une assistance en direct ?</h2>
            <p className="text-[10px] sm:text-[11px] lowercase not-italic font-medium text-slate-900 max-w-md">
              Notre équipe de modération est disponible sur le chat pour vous débloquer rapidement.
            </p>
          </div>

          <Link 
            href="/client/chat" 
            className="bg-slate-950 text-white px-8 py-3.5 rounded-xl text-[10px] tracking-[0.2em] font-black hover:bg-slate-900 transition-transform active:scale-95 shadow-lg"
          >
            Ouvrir le Chat Support
          </Link>
        </section>

      </main>

      {/* FOOTER DISCRET */}
      <footer className="flex flex-col items-center justify-center opacity-30 py-8 grayscale space-y-1">
        <LogoElite className="w-8 h-8" />
        <p className="text-[8px] tracking-[0.6em]">Chif-Pam Elite v1.0 • Guide Client</p>
      </footer>
    </div>
  );
}

// Composant d'onglet de filtrage
function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-xl text-[10px] tracking-wider transition-all shrink-0 ${
        active 
          ? 'bg-emerald-500 text-black font-black' 
          : 'bg-slate-900 text-slate-400 border border-white/5 hover:bg-slate-800'
      }`}
    >
      {label}
    </button>
  );
}

// Composant d'accordéon repliable
function AccordionSection({ 
  icon, 
  title, 
  children,
  defaultOpen = false 
}: { 
  icon: React.ReactNode; 
  title: string; 
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-slate-900/50 rounded-2xl border border-white/5 overflow-hidden transition">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-white/5 transition"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            {icon}
          </div>
          <h2 className="text-xs sm:text-sm tracking-widest uppercase text-white font-black">{title}</h2>
        </div>
        <ChevronDown 
          size={16} 
          className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="px-4 pb-4 border-t border-white/5"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
              <p className="text-[11px] lowercase not-italic text-slate-400">Les demandes de retraits sont traitées 7j/7. Le montant arrive directement sur votre compte mobile money.</p>
            </div>
          </div>
        </HelpSection>

        {/* SECTION 3 : SÉCURITÉ */}
        <HelpSection icon={<ShieldCheck className="text-emerald-500" />} title="Sécurité & Fraude">
          <div className="bg-rose-500/5 p-5 rounded-4xl border border-rose-500/10 space-y-3">
            <div className="flex items-center gap-2 text-rose-500">
              <Info size={16} />
              <span className="text-[10px] tracking-widest uppercase">Tolérance Zéro :</span>
            </div>
            <ul className="text-[10px] space-y-2 text-slate-500 lowercase not-italic font-bold">
              <li>• La modification de captures d'écran est strictement interdite (Bannissement IP).</li>
              <li>• L'utilisation de robots ou de scripts de mise entraîne le gel immédiat des fonds.</li>
              <li>• Un seul compte est autorisé par numéro de téléphone.</li>
            </ul>
          </div>
        </HelpSection>

        {/* SECTION 4 : SUPPORT DIRECT */}
        <div className="bg-emerald-500 p-8 rounded-[3rem] text-slate-950 flex flex-col items-center text-center space-y-4 shadow-xl shadow-emerald-500/20">
          <MessageCircle size={40} strokeWidth={2.5} />
          <h2 className="text-lg leading-tight">Besoin d'aide en temps réel ?</h2>
          <p className="text-[10px] lowercase not-italic font-bold">Nos modérateurs sont en ligne pour résoudre vos problèmes techniques.</p>
          <Link href="/client/chat" className="bg-slate-950 text-white px-10 py-4 rounded-2xl text-[10px] tracking-[0.2em] hover:scale-105 transition-transform active:scale-95">
            Ouvrir le chat
          </Link>
        </div>

      </div>

      {/* FOOTER LOGO */}
      <div className="flex flex-col items-center justify-center opacity-20 py-10 grayscale">
        <LogoElite className="w-12 h-12 mb-2" />
        <p className="text-[8px] tracking-[1em]">Chif-Pam Elite v1.0</p>
      </div>
    </div>
  );
}

// Composant pour les cartes de jeux
function GameCard({ icon, name, desc }: { icon: React.ReactNode, name: string, desc: string }) {
  return (
    <div className="bg-slate-900/40 p-4 rounded-2xl border border-white/5 flex gap-4 items-start">
      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/5">
        {icon}
      </div>
      <div className="space-y-1">
        <h3 className="text-[11px] text-white tracking-tighter">{name}</h3>
        <p className="text-[9px] text-slate-500 not-italic lowercase leading-tight">{desc}</p>
      </div>
    </div>
  );
}

// Composant interne pour les sections
function HelpSection({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 px-2">
        <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
          {icon}
        </div>
        <h2 className="text-sm tracking-widest uppercase">{title}</h2>
      </div>
      <div className="bg-slate-900/50 p-6 rounded-[2.5rem] border border-white/5 shadow-inner">
        {children}
      </div>
    </div>
  );
}
