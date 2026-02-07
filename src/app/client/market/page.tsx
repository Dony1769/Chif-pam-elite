"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth'; // Assure-toi que ce hook existe, sinon utilise la méthode standard
import { useRouter } from 'next/navigation';
import { ChevronLeft, Coins, Gem, Sparkles, ShoppingBag, CreditCard, Star, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MarketPage() {
    const [profile, setProfile] = useState<any>(null);
    const [packs, setPacks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [buying, setBuying] = useState<string | null>(null);
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
            .order('prix_htg', { ascending: true });
            
        setPacks(packsData || []);
        setLoading(false);
    };

    const handlePurchase = async (pack: any, method: 'htg' | 'diamonds') => {
        if (!profile) return;
        setBuying(pack.id);
        
        let error = null;

        if (method === 'diamonds') {
            // Appel RPC pour achat diamant
            const { error: rpcError } = await supabase.rpc('buy_with_diamonds', { p_user_id: profile.id, p_pack_id: pack.id });
            error = rpcError;
        } else {
            // Appel RPC pour achat HTG (existant)
            const { error: rpcError } = await supabase.rpc('acheter_pack_jetons', { p_user_id: profile.id, p_pack_id: pack.id });
            error = rpcError;
        }

        if (error) {
            alert("Erreur : " + error.message);
        } else {
            // Animation ou son de succès
            fetchData(); 
        }
        setBuying(null);
    };

    if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

    return (
        <div className="min-h-screen bg-[#020617] text-white font-sans pb-24">
            {/* Header Sticky */}
            <div className="sticky top-0 z-30 bg-[#020617]/90 backdrop-blur-xl border-b border-white/5 p-4">
                <div className="flex justify-between items-center max-w-6xl mx-auto">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.back()} className="p-2 bg-white/5 rounded-xl active:scale-90"><ChevronLeft/></button>
                        <h1 className="text-xl font-black italic uppercase tracking-tighter">Boutique <span className="text-emerald-500">Elite</span></h1>
                    </div>
                    
                    <div className="flex gap-3">
                        <div className="bg-slate-900 border border-emerald-500/20 px-3 py-1.5 rounded-xl flex items-center gap-2">
                            <span className="text-emerald-500 font-black italic">{profile?.jetons_cp.toLocaleString()}</span>
                            <Coins size={14} className="text-emerald-500"/>
                        </div>
                        <div className="bg-slate-900 border border-blue-500/20 px-3 py-1.5 rounded-xl flex items-center gap-2">
                            <span className="text-blue-400 font-black italic">{profile?.diamonds.toLocaleString()}</span>
                            <Gem size={14} className="text-blue-400"/>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto p-4 sm:p-8">
                {/* Hero Banner */}
                <div className="bg-gradient-to-r from-emerald-900 to-black p-8 rounded-[2.5rem] border border-white/10 mb-10 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="relative z-10">
                        <span className="bg-amber-500 text-black text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-widest mb-2 inline-block">Offre Spéciale</span>
                        <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter mb-2">Starter Pack <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Hacker</span></h2>
                        <p className="text-slate-400 text-sm max-w-md">Obtenez un boost immédiat de CP et de Diamants pour dominer le classement Arena.</p>
                    </div>
                    <div className="relative z-10 flex gap-4">
                        <div className="text-center bg-black/40 p-4 rounded-2xl backdrop-blur-md border border-white/10">
                            <p className="text-3xl font-black text-white">500 <span className="text-xs text-emerald-500">CP</span></p>
                        </div>
                        <div className="text-center bg-black/40 p-4 rounded-2xl backdrop-blur-md border border-white/10">
                            <p className="text-3xl font-black text-white">50 <span className="text-xs text-blue-500">DIAMONDS</span></p>
                        </div>
                    </div>
                    {/* Abstract BG */}
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
                </div>

                {/* Section Packs */}
                <h3 className="text-lg font-black italic uppercase tracking-widest mb-6 flex items-center gap-2"><ShoppingBag size={18} className="text-emerald-500"/> Packs Standards</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {packs.map((pack) => (
                        <div key={pack.id} className="group bg-slate-900/40 border border-white/5 hover:border-emerald-500/50 rounded-[2rem] p-1 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/10">
                            <div className="bg-[#050b14] rounded-[1.8rem] p-6 h-full flex flex-col justify-between relative overflow-hidden">
                                
                                {pack.bonus_star_pourcent > 0 && (
                                    <div className="absolute top-0 right-0 bg-amber-500 text-black text-[9px] font-black px-3 py-1.5 rounded-bl-2xl uppercase tracking-widest z-20">
                                        +{pack.bonus_star_pourcent}% Bonus
                                    </div>
                                )}

                                <div className="relative z-10 text-center py-6">
                                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-slate-800 to-black rounded-full flex items-center justify-center border border-white/10 mb-4 group-hover:scale-110 transition-transform duration-500 shadow-xl shadow-emerald-900/20">
                                        <Sparkles size={32} className="text-emerald-400" />
                                    </div>
                                    <h4 className="text-lg font-black italic uppercase tracking-tight text-white mb-1">{pack.nom}</h4>
                                    <p className="text-3xl font-black text-emerald-500 italic tracking-tighter">{pack.jetons_quantite.toLocaleString()} <span className="text-xs text-slate-500 not-italic font-bold">CP</span></p>
                                </div>

                                <div className="space-y-2 relative z-10">
                                    <button 
                                        onClick={() => handlePurchase(pack, 'htg')}
                                        disabled={buying === pack.id}
                                        className="w-full py-3 bg-white text-black rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        {buying === pack.id ? <Loader2 className="animate-spin" size={14}/> : <>{pack.prix_htg} HTG <CreditCard size={14}/></>}
                                    </button>
                                    
                                    {/* Optionnel: Achat en Diamants si tu veux convertir Diamant -> CP */}
                                    {/* <button className="w-full py-3 bg-slate-800 text-blue-400 border border-blue-500/30 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-900/50 transition-all flex items-center justify-center gap-2">
                                        {Math.floor(pack.prix_htg / 10)} <Gem size={12}/>
                                    </button> */}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
