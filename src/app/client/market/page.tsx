'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function BoutiqueCP({ userProfile }: { userProfile: any }) {
    const [packs, setPacks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true); // Commencer à true
    const [buying, setBuying] = useState(false);

    useEffect(() => {
        async function loadBoutique() {
            try {
                const { data, error } = await supabase
                    .from('boutique_packs')
                    .select('*')
                    .eq('active', true)
                    .order('prix_htg', { ascending: true });

                if (error) throw error;
                if (data) setPacks(data);
            } catch (err) {
                console.error("Erreur Boutique:", err);
            } finally {
                setLoading(false);
            }
        }
        loadBoutique();
    }, []);

    // Si on n'a pas encore de profil ou que ça charge
    if (!userProfile) return <div className="p-10 text-center text-gray-500">Chargement du profil...</div>;

    const handlePurchase = async (packId: string) => {
        setBuying(true);
        const { error } = await supabase.rpc('acheter_pack_jetons', {
            p_user_id: userProfile.id,
            p_pack_id: packId
        });

        if (error) alert(error.message);
        else alert("Succès ! Vos Jetons CP sont crédités.");
        setBuying(false);
    };

    return (
        <div className="min-h-screen bg-[#060b10] p-4 pb-24"> {/* Couleur de fond de ton app */}
            {/* Header style Home */}
            <div className="flex justify-between items-center mb-8 pt-4">
                <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">
                    BOUTIQUE <span className="text-green-500">ELITE</span>
                </h2>
                <div className="bg-[#0a1219] px-4 py-2 rounded-full border border-green-500/20">
                    <span className="text-green-500 font-bold">{userProfile.jetons_cp || 0} CP</span>
                </div>
            </div>

            {loading ? (
                /* Skeleton simple pour éviter le blanc */
                <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-32 bg-gray-800/50 rounded-3xl"></div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {packs.length === 0 && <p className="text-center text-gray-500">Aucun pack disponible.</p>}
                    
                    {packs.map((pack) => (
                        <div 
                            key={pack.id} 
                            className="relative overflow-hidden bg-[#0a1219] border border-green-500/10 rounded-[2rem] p-6 shadow-2xl shadow-black"
                        >
                            <div className="flex justify-between items-center relative z-10">
                                <div>
                                    <h3 className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-1">{pack.nom}</h3>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-black text-white italic">{pack.jetons_quantite.toLocaleString()}</span>
                                        <span className="text-green-500 font-black text-lg italic">CP</span>
                                    </div>
                                    {pack.bonus_star_pourcent > 0 && (
                                        <div className="inline-block bg-yellow-500/10 px-2 py-0.5 rounded-md mt-2">
                                            <p className="text-[10px] text-yellow-500 font-black tracking-tighter italic">
                                                ⭐ +{pack.bonus_star_pourcent}% BONUS ELITE
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => handlePurchase(pack.id)}
                                    disabled={buying}
                                    className="bg-green-500 hover:bg-green-400 text-black font-black px-6 py-4 rounded-2xl text-sm transition-all active:scale-95 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                                >
                                    {buying ? "..." : `${pack.prix_htg} HTG`}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
