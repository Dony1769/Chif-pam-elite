'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface BoutiquePack {
    id: string;
    nom: string;
    prix_htg: number;
    jetons_quantite: number;
    bonus_star_pourcent: number;
}

export default function BoutiqueCP({ userProfile }: { userProfile: any }) {
    const [packs, setPacks] = useState<BoutiquePack[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchPacks = async () => {
            const { data } = await supabase.from('boutique_packs').select('*').eq('active', true);
            if (data) setPacks(data);
        };
        fetchPacks();
    }, []);

    const handlePurchase = async (packId: string) => {
        setLoading(true);
        const { error } = await supabase.rpc('acheter_pack_jetons', {
            p_user_id: userProfile.id,
            p_pack_id: packId
        });

        if (error) alert(error.message);
        else alert("Félicitations ! Vos Jetons CP sont arrivés.");
        setLoading(false);
    };

    return (
        <div className="space-y-6 p-4">
            {/* Titre stylisé */}
            <div className="text-center mb-8">
                <h2 className="text-2xl font-black text-white italic uppercase tracking-widest">
                    Boutique <span className="text-green-500 text-3xl">CP</span>
                </h2>
                <div className="h-1 w-20 bg-green-500 mx-auto rounded-full mt-2"></div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {packs.map((pack) => (
                    <div 
                        key={pack.id} 
                        className="relative overflow-hidden bg-[#0a1219] border border-green-500/20 rounded-3xl p-6 shadow-2xl transition-all hover:border-green-500/50"
                    >
                        {/* Effet de brillance en arrière-plan */}
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-green-500/10 blur-3xl rounded-full"></div>

                        <div className="flex justify-between items-center relative z-10">
                            <div>
                                <h3 className="text-white font-bold text-xl uppercase tracking-tight">{pack.nom}</h3>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <span className="text-3xl font-black text-white">{pack.jetons_quantite.toLocaleString()}</span>
                                    <span className="text-green-500 font-bold text-sm">CP</span>
                                </div>
                                {pack.bonus_star_pourcent > 0 && (
                                    <p className="text-[10px] text-yellow-400 font-bold mt-2 flex items-center gap-1">
                                        ⭐ +{pack.bonus_star_pourcent}% BONUS ELITE
                                    </p>
                                )}
                            </div>

                            <button
                                onClick={() => handlePurchase(pack.id)}
                                disabled={loading}
                                className="bg-white text-black font-black px-6 py-3 rounded-2xl text-sm uppercase transition-all active:scale-95 disabled:opacity-50"
                            >
                                {loading ? "chargement..." : `${pack.prix_htg} HTG`}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
