import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; // Ajuste selon ton projet

export default function BoutiqueCP({ userProfile }) {
    const [packs, setPacks] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchPacks();
    }, []);

    const fetchPacks = async () => {
        const { data } = await supabase.from('boutique_packs').select('*').eq('active', true);
        if (data) setPacks(data);
    };

    const handlePurchase = async (packId: string) => {
        setLoading(true);
        // APPEL DU RPC SÉCURISÉ
        const { error } = await supabase.rpc('acheter_pack_jetons', {
            p_user_id: userProfile.id,
            p_pack_id: packId
        });

        if (error) {
            alert("Erreur lors de l'achat : " + error.message);
        } else {
            alert("Jetons CP ajoutés avec succès !");
            // Ici, rafraîchir le profil utilisateur pour voir le nouveau solde
        }
        setLoading(false);
    };

    return (
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-900 min-h-screen text-white">
            {packs.map((pack) => (
                <div key={pack.id} className="border border-green-500/30 bg-black/40 rounded-2xl p-6 flex flex-col items-center shadow-lg">
                    <h3 className="text-xl font-bold text-green-400">{pack.nom}</h3>
                    <div className="my-4 flex items-center gap-2">
                        <span className="text-4xl font-black text-white">{pack.jetons_quantite}</span>
                        <span className="text-sm font-bold bg-green-600 px-2 py-1 rounded">CP</span>
                    </div>
                    
                    {pack.bonus_star_pourcent > 0 && (
                        <p className="text-xs text-yellow-400 mb-4 italic">
                            + {pack.bonus_star_pourcent}% pour les Membres Elite
                        </p>
                    )}

                    <button
                        onClick={() => handlePurchase(pack.id)}
                        disabled={loading}
                        className="w-full py-3 bg-gradient-to-r from-green-600 to-green-400 rounded-xl font-bold hover:scale-105 transition-transform disabled:opacity-50"
                    >
                        {loading ? 'Traitement...' : `Acheter pour ${pack.prix_htg} HTG`}
                    </button>
                </div>
            ))}
        </div>
    );
}
