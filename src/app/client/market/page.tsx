'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth'; // Assure-toi d'avoir un hook pour récupérer le user

export default function MarketPage() {
    const { userProfile, refreshProfile } = useAuth(); 
    const [packs, setPacks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [buying, setBuying] = useState(false);

    useEffect(() => {
        async function loadBoutique() {
            const { data } = await supabase
                .from('boutique_packs')
                .select('*')
                .eq('active', true)
                .order('prix_htg', { ascending: true });
            if (data) setPacks(data);
            setLoading(false);
        }
        loadBoutique();
    }, []);

    const handlePurchase = async (packId: string) => {
        if (!userProfile) return;
        setBuying(true);
        
        // Sécurité : On appelle le RPC, pas un simple UPDATE
        const { error } = await supabase.rpc('acheter_pack_jetons', {
            p_user_id: userProfile.id,
            p_pack_id: packId
        });

        if (error) {
            alert("Erreur : " + error.message);
        } else {
            alert("Jetons ajoutés !");
            refreshProfile(); // Met à jour le solde CP en haut
        }
        setBuying(false);
    };

    if (loading) return <div className="min-h-screen bg-[#060b10] flex items-center justify-center text-green-500 font-black">CHARGEMENT...</div>;

    return (
        <div className="min-h-screen bg-[#060b10] text-white p-4 pb-24">
            <div className="max-w-4xl mx-auto"> {/* Centrage pour Tablettes/Laptops */}
                
                {/* Header Adaptatif */}
                <div className="flex justify-between items-center mb-10 pt-4">
                    <div>
                        <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none">
                            SHOP <span className="text-green-500">CP</span>
                        </h1>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Elite Pam Economy</p>
                    </div>
                    <div className="bg-[#0a1219] border border-green-500/20 px-5 py-2 rounded-2xl flex items-center gap-2 shadow-lg shadow-black">
                        <span className="text-green-500 font-black text-xl italic">{userProfile?.jetons_cp || 0}</span>
                        <span className="text-[10px] font-bold text-gray-400">CP</span>
                    </div>
                </div>

                {/* Grille Responsive : 1 col mobile, 2 cols tablette, 3 cols laptop */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {packs.map((pack) => (
                        <div key={pack.id} className="relative group overflow-hidden bg-[#0a1219] border border-white/5 rounded-[2.5rem] p-6 hover:border-green-500/30 transition-all duration-500 shadow-2xl">
                            {/* Décor de fond */}
                            <div className="absolute -top-12 -right-12 w-24 h-24 bg-green-500/5 blur-3xl rounded-full group-hover:bg-green-500/15 transition-colors"></div>
                            
                            <div className="relative z-10 flex flex-col h-full justify-between gap-6">
                                <div>
                                    <span className="text-[10px] font-black text-green-500/50 uppercase tracking-[0.2em]">{pack.nom}</span>
                                    <div className="flex items-center gap-3 mt-2">
                                        <div className="text-4xl font-black italic text-white leading-none">
                                            {pack.jetons_quantite.toLocaleString()}
                                        </div>
                                        <div className="text-sm font-black text-green-500 bg-green-500/10 px-2 py-1 rounded-lg">CP</div>
                                    </div>
                                    
                                    {pack.bonus_star_pourcent > 0 && (
                                        <div className="mt-4 flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 w-fit px-3 py-1 rounded-full">
                                            <span className="text-lg">⭐</span>
                                            <span className="text-[9px] font-black text-yellow-500 uppercase italic">+{pack.bonus_star_pourcent}% Bonus Elite</span>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => handlePurchase(pack.id)}
                                    disabled={buying}
                                    className="w-full bg-white hover:bg-green-500 text-black font-black py-4 rounded-3xl transition-all active:scale-95 disabled:opacity-50 text-sm uppercase tracking-tight shadow-xl shadow-black/40"
                                >
                                    {buying ? "Traitement..." : `${pack.prix_htg} HTG`}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

