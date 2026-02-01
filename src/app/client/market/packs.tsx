'use client'; // N'oublie pas cette directive pour Next.js App Router

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// On définit l'interface pour le profil utilisateur
interface UserProfile {
    id: string;
    jetons_cp: number;
    vip_status: string;
}

// On définit l'interface pour un Pack de la boutique
interface BoutiquePack {
    id: string;
    nom: string;
    prix_htg: number;
    jetons_quantite: number;
    bonus_star_pourcent: number;
    active: boolean;
}

interface BoutiqueProps {
    userProfile: UserProfile;
}

export default function BoutiqueCP({ userProfile }: BoutiqueProps) {
    const [packs, setPacks] = useState<BoutiquePack[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        fetchPacks();
    }, []);

    const fetchPacks = async () => {
        const { data, error } = await supabase
            .from('boutique_packs')
            .select('*')
            .eq('active', true);
        
        if (error) {
            console.error("Erreur packs:", error.message);
            return;
        }
        if (data) setPacks(data as BoutiquePack[]);
    };

    const handlePurchase = async (packId: string) => {
        if (!userProfile?.id) return alert("Session utilisateur introuvable.");
        
        setLoading(true);
        const { error } = await supabase.rpc('acheter_pack_jetons', {
            p_user_id: userProfile.id,
            p_pack_id: packId
        });

        if (error) {
            alert("Erreur : " + error.message);
        } else {
            alert("Jetons CP ajoutés !");
            window.location.reload(); // Simple pour rafraîchir le solde
        }
        setLoading(false);
    };

    return (
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
            {packs.map((pack) => (
                <div key={pack.id} className="bg-gray-800 p-6 rounded-2xl border border-green-500/20">
                    <h3 className="text-white font-bold text-lg">{pack.nom}</h3>
                    <p className="text-3xl font-black text-green-400 my-2">{pack.jetons_quantite} CP</p>
                    <button
                        onClick={() => handlePurchase(pack.id)}
                        disabled={loading}
                        className="w-full bg-green-500 text-black font-bold py-2 rounded-lg"
                    >
                        {loading ? 'Chargement...' : `${pack.prix_htg} HTG`}
                    </button>
                </div>
            ))}
        </div>
    );
}
