"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Coins, Gem, Sparkles, ShoppingBag, CreditCard, Layers, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MarketPage() {
    const [profile, setProfile] = useState<any>(null);
    const [packs, setPacks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [buying, setBuying] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'htg' | 'diamonds'>('htg');
    const router = useRouter();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if(user) {
            const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            setProfile(data);
        }
        
        const { data: packsData } = await supabase
            .from('boutique_packs')
            .select('*')
            .eq('active', true)
            .order('prix_htg', { ascending: true }); // Note: prix_htg sert de valeur numérique pour le tri
            
        setPacks(packsData || []);
        setLoading(false);
    };

    const handlePurchase = async (pack: any) => {
        if (!profile) return;
        setBuying(pack.id);
        
        let error = null;

        if (pack.currency_type === 'DIAMONDS') {
            const { error: rpcError } = await supabase.rpc('buy_with_diamonds', { p_user_id: profile.id, p_pack_id: pack.id });
            error = rpcError;
        } else {
            const { error: rpcError } = await supabase.rpc('acheter_pack_jetons', { p_user_id: profile.id, p_pack_id: pack.id });
            error = rpcError;
        }

        if (error) {
            alert("Erreur : " + error.message);
        } else {
            alert("Achat réussi !");
            fetchData(); 
        }
        setBuying(null);
    };

    const filteredPacks = packs.filter(p => 
        activeTab === 'htg' ? p.currency_type === 'HTG' || !p.currency_type : p.currency_type === 'DIAMONDS'
    );

    return (
        <div className="min-h-screen bg-[#020617] text-white font-sans pb-24 selection:bg-emerald-500/30">
            {/* Header Sticky */}
            <div className="sticky top-0 z-30 bg-[#020617]/90 backdrop-blur-xl border-b border-white/5 p-4">
                <div className="flex justify-between items-center max-w-6xl mx-auto">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.back()} className="p-2 bg-white/5 rounded-xl active:scale-90"><ChevronLeft/></button>
                        <h1 className="text-lg font-black italic uppercase tracking-tighter">BOUTIQUE <span className="text-emerald-500">ELITE</span></h1>
                    </div>
                    <div className="flex gap-2">
                        <CurrencyBadge value={profile?.jetons_cp} icon={<Coins size={12}/>} color="text-emerald-500" />
                        <CurrencyBadge value={profile?.diamonds} icon={<Gem size={12}/>} color="text-blue-400" />
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto p-4">
                
                {/* Navigation Onglets */}
                <div className="flex p-1 bg-white/5 rounded-2xl mb-8">
                    <TabButton active={activeTab === 'htg'} onClick={() => setActiveTab('htg')} label="Recharge MonCash" icon={<CreditCard size={16}/>} />
                    <TabButton active={activeTab === 'diamonds'} onClick={() => setActiveTab('diamonds')} label="Échange Diamants" icon={<Gem size={16}/>} />
                </div>

                {/* Liste Packs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    <AnimatePresence mode='popLayout'>
                        {filteredPacks.map((pack) => (
                            <motion.div 
                                layout
                                initial={{ opacity: 0, scale: 0.9 }} 
                                animate={{ opacity: 1, scale: 1 }} 
                                key={pack.id} 
                                className={`relative group overflow-hidden border rounded-[2rem] p-6 transition-all duration-500 hover:-translate-y-1 ${
                                    activeTab === 'diamonds' ? 'bg-blue-950/20 border-blue-500/20 hover:border-blue-500/50' : 'bg-slate-900/40 border-white/5 hover:border-emerald-500/30'
                                }`}
                            >
                                <div className="relative z-10 flex flex-col items-center text-center">
                                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${
                                        activeTab === 'diamonds' ? 'bg-blue-500/10 shadow-[0_0_30px_rgba(59,130,246,0.2)]' : 'bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.2)]'
                                    }`}>
                                        <Sparkles size={32} className={activeTab === 'diamonds' ? 'text-blue-400' : 'text-emerald-400'} />
                                    </div>
                                    
                                    <h4 className="text-sm font-black italic uppercase text-slate-300 mb-1">{pack.nom}</h4>
                                    <p className="text-4xl font-black italic text-white tracking-tighter mb-6">
                                        {pack.jetons_quantite.toLocaleString()} <span className="text-xs text-slate-500">CP</span>
                                    </p>

                                    <button 
                                        onClick={() => handlePurchase(pack, activeTab)}
                                        disabled={buying === pack.id}
                                        className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all ${
                                            activeTab === 'diamonds' 
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                                            : 'bg-white text-black shadow-lg shadow-white/10'
                                        }`}
                                    >
                                        {buying === pack.id ? <span className="animate-pulse">Traitement...</span> : (
                                            <>
                                                {pack.prix_htg.toLocaleString()} {activeTab === 'diamonds' ? '💎' : 'HTG'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

const CurrencyBadge = ({ value, icon, color }: any) => (
    <div className={`bg-slate-900 border border-white/10 px-3 py-1.5 rounded-lg flex items-center gap-2 ${color}`}>
        <span className="font-black italic text-xs">{value?.toLocaleString() || 0}</span>
        {icon}
    </div>
);

const TabButton = ({ active, onClick, label, icon }: any) => (
    <button onClick={onClick} className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-wide transition-all ${
        active ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-white'
    }`}>
        {icon} {label}
    </button>
);
