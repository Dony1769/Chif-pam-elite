'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { AdminMarketService } from '@/services/admin/market';

interface PackForm {
    nom: string;
    prix_htg: number;
    jetons_quantite: number;
    bonus_star_pourcent: number;
}

export default function AdminMarket() {
    const [packs, setPacks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState<PackForm>({ 
        nom: '', 
        prix_htg: 0, 
        jetons_quantite: 0, 
        bonus_star_pourcent: 0 
    });

    useEffect(() => {
        fetchPacks();
    }, []);

    async function fetchPacks() {
        const { data, error } = await supabase
            .from('boutique_packs')
            .select('*')
            .order('prix_htg', { ascending: true });
        
        if (error) console.error(error);
        if (data) setPacks(data);
        setLoading(false);
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const result = await AdminMarketService.createPack(form);

        if (!result.success) {
            alert("Erreur lors de l'ajout : " + result.message);
        } else {
            setForm({ nom: '', prix_htg: 0, jetons_quantite: 0, bonus_star_pourcent: 0 });
            fetchPacks();
        }
    };

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        const result = await AdminMarketService.togglePackStatus(id, currentStatus);
        if (!result.success) {
            alert("Erreur de mise à jour : " + result.message);
            return;
        }
        fetchPacks();
    };

    const deletePack = async (id: string) => {
        if (confirm("Supprimer définitivement ce pack ?")) {
            const result = await AdminMarketService.deletePack(id);
            if (!result.success) {
                alert("Erreur de suppression : " + result.message);
                return;
            }
            fetchPacks();
        }
    };

    return (
        <div className="min-h-screen bg-[#060b10] text-white p-4 md:p-8">
            <header className="mb-10">
                <h1 className="text-3xl font-black italic text-green-500 uppercase tracking-tighter">
                    Gestion <span className="text-white">Boutique</span>
                </h1>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Configuration des packs de jetons CP</p>
            </header>

            {/* Formulaire stylisé */}
            <section className="mb-12">
                <form onSubmit={handleSubmit} className="bg-[#0a1219] border border-white/5 p-6 rounded-4xl shadow-2xl">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase ml-2">Nom du Pack</label>
                            <input 
                                type="text" 
                                value={form.nom} 
                                onChange={e => setForm({...form, nom: e.target.value})}
                                className="w-full bg-black border border-white/10 p-4 rounded-2xl focus:border-green-500 transition-colors outline-none" 
                                placeholder="ex: Pack Bronze" required 
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase ml-2">Prix (HTG)</label>
                            <input 
                                type="number" 
                                value={form.prix_htg} 
                                onChange={e => setForm({...form, prix_htg: Number(e.target.value)})}
                                className="w-full bg-black border border-white/10 p-4 rounded-2xl focus:border-green-500 transition-colors outline-none" 
                                required 
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase ml-2">Jetons (CP)</label>
                            <input 
                                type="number" 
                                value={form.jetons_quantite} 
                                onChange={e => setForm({...form, jetons_quantite: Number(e.target.value)})}
                                className="w-full bg-black border border-white/10 p-4 rounded-2xl focus:border-green-500 transition-colors outline-none" 
                                required 
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-yellow-500 uppercase ml-2">Bonus Star (%)</label>
                            <input 
                                type="number" 
                                value={form.bonus_star_pourcent} 
                                onChange={e => setForm({...form, bonus_star_pourcent: Number(e.target.value)})}
                                className="w-full bg-black border border-yellow-500/20 p-4 rounded-2xl focus:border-yellow-500 transition-colors outline-none" 
                                placeholder="ex: 10" required 
                            />
                        </div>
                    </div>
                    <button type="submit" className="w-full mt-6 bg-green-500 hover:bg-white text-black font-black py-4 rounded-2xl uppercase transition-all active:scale-[0.98]">
                        Créer le pack maintenant
                    </button>
                </form>
            </section>

            {/* Grille des packs existants */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {packs.map(pack => (
                    <div key={pack.id} className={`relative group overflow-hidden bg-[#0a1219] border ${pack.active ? 'border-green-500/20' : 'border-red-500/20 opacity-60'} p-6 rounded-[2.5rem] transition-all`}>
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-white font-black text-xl italic uppercase tracking-tighter">{pack.nom}</h3>
                                <p className="text-green-500 font-bold text-sm leading-none">{pack.prix_htg} HTG</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => toggleStatus(pack.id, pack.active)} className={`p-2 rounded-full ${pack.active ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                    <div className={`w-3 h-3 rounded-full bg-current animate-pulse`}></div>
                                </button>
                                <button onClick={() => deletePack(pack.id)} className="p-2 bg-white/5 hover:bg-red-500/20 text-gray-500 hover:text-red-500 rounded-full transition-colors">
                                    🗑️
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 bg-black/40 p-4 rounded-2xl">
                            <div className="flex-1">
                                <p className="text-[10px] text-gray-500 font-bold uppercase">Quantité</p>
                                <p className="text-2xl font-black text-white">{pack.jetons_quantite.toLocaleString()} CP</p>
                            </div>
                            <div className="text-right border-l border-white/5 pl-4">
                                <p className="text-[10px] text-yellow-500 font-bold uppercase tracking-tighter italic">Bonus Star</p>
                                <p className="text-lg font-black text-yellow-500">+{pack.bonus_star_pourcent}%</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
