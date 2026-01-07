"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Check, X, Clock, Wallet } from 'lucide-react';

export default function AdminDemandes() {
  const [demandes, setDemandes] = useState<any[]>([]);

  useEffect(() => { fetchDemandes(); }, []);

  const fetchDemandes = async () => {
    const { data } = await supabase
      .from('transactions')
      .select('*, profiles(username, phone)')
      .eq('status', 'en_attente')
      .order('created_at', { ascending: false });
    setDemandes(data || []);
  };

  const traiterDemande = async (id: string, userId: string, amount: number, type: string, action: 'approuve' | 'refuse') => {
    if (action === 'approuve' && type === 'depot') {
      // Pour un dépôt, on ajoute l'argent au solde
      await supabase.rpc('increment_balance', { user_id: userId, amount: amount });
    }
    
    await supabase.from('transactions').update({ status: action }).eq('id', id);
    fetchDemandes();
  };

  return (
    <div className="p-8 text-white">
      <h1 className="text-2xl font-black mb-8 italic uppercase">Validation <span className="text-emerald-500">Financière</span></h1>
      <div className="grid gap-4">
        {demandes.map(d => (
          <div key={d.id} className="bg-slate-900 p-6 rounded-3xl border border-white/5 flex justify-between items-center">
            <div>
              <p className="font-black text-emerald-500 uppercase text-xs">{d.type} • {d.amount} HTG</p>
              <p className="text-slate-400 text-sm">{d.profiles?.username || 'Client'} ({d.profiles?.phone})</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => traiterDemande(d.id, d.user_id, d.amount, d.type, 'approuve')} className="p-4 bg-emerald-500 text-black rounded-2xl hover:scale-105 transition-all"><Check size={20}/></button>
              <button onClick={() => traiterDemande(d.id, d.user_id, d.amount, d.type, 'refuse')} className="p-4 bg-rose-500 text-white rounded-2xl hover:scale-105 transition-all"><X size={20}/></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

