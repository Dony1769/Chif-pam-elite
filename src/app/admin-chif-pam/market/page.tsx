'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminMarket() {
    const [packs, setPacks] = useState<any[]>([]);
    const [form, setForm] = useState({ nom: '', prix_htg: 0, jetons_quantite: 0, bonus_star_pourcent: 0 });

    useEffect(() => {
        fetchPacks();
    }, []);

    const fetchPacks = async () => {
        const { data } = await supabase.from('boutique_packs').select('*').order('created_at', { ascending: false });
        if (data) setPacks(data);
    };

    const addPack = async (e: React.FormEvent) => {
        e.preventDefault();
        const { error } = await supabase.from('boutique_packs').insert([form]);
        if (error) alert(error.message);
        else {
            setForm({ nom: '', prix_htg: 0, jetons_quantite: 0, bonus_star_pourcent: 0 });
            fetchPacks();
        }
    };

    const togglePack = async (id: string, currentStatus: boolean) => {
        await supabase.from('boutique_packs').update({ active: !currentStatus }).eq('id', id);
        fetchPacks();
    };

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <h1 className="text-3xl font-black mb-8 text-green-500 italic uppercase">Gestion Boutique CP</h1>

            {/* Formulaire d'ajout */}
            <form onSubmit={addPack} className="bg-[#0a1219] p-6 rounded-3xl border border-white/10 mb-10 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Nom du Pack</label>
                    <input type="text" value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} className="w-full bg-black border border-white/10 p-3 rounded-xl mt-1" placeholder="Ex: Pack Starter" required />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Prix (HTG)</label>
                    <input type="number" value={form.prix_htg} onChange={e => setForm({...form, prix_htg: Number(e.target.value)})} className="w-full bg-black border border-white/10 p-3 rounded-xl mt-1" required />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Jetons CP</label>
                    <input type="number" value={form.jetons_quantite} onChange={e => setForm({...form, jetons_quantite: Number(e.target.value)})} className="w-full bg-black border border-white/10 p-3 rounded-xl mt-1" required />
                </div>
                <button type="submit" className="bg-green-500 text-black font-black py-3 rounded-xl uppercase hover:bg-white transition-colors">Ajouter le Pack</button>
            </form>

            {/* Liste des packs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {packs.map(pack => (
                    <div key={pack.id} className={`p-6 rounded-3xl border ${pack.active ? 'border-green-500/20' : 'border-red-500/20 opacity-50'} bg-[#0a1219]`}>
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="font-bold text-lg">{pack.nom}</h3>
                            <button onClick={() => togglePack(pack.id, pack.active)} className={`text-[10px] font-black px-3 py-1 rounded-full ${pack.active ? 'bg-green-500 text-black' : 'bg-red-500 text-white'}`}>
                                {pack.active ? 'ACTIF' : 'INACTIF'}
                            </button>
                        </div>
                        <p className="text-2xl font-black text-white">{pack.jetons_quantite} CP</p>
                        <p className="text-sm text-gray-500">{pack.prix_htg} HTG</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

