"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Plus, ArrowDownCircle, Wallet, Loader2, 
  Image as ImageIcon, CheckCircle2, XCircle 
} from 'lucide-react';

export default function ClientHome() {
  const [user, setUser] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'depot' | 'retrait' | null>(null);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => { fetchUser(); }, []);

  const fetchUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const { data } = await supabase.from('profiles').select('*').eq('id', authUser?.id).single();
    setUser(data);
  };

  const handleTransaction = async () => {
    if (!amount || Number(amount) <= 0) return alert("Montant invalide");
    setLoading(true);

    try {
      if (method === 'retrait') {
        if (Number(amount) > user.balance) throw new Error("Solde insuffisant");
        
        // 1. Déduire le solde immédiatement (Sécurité)
        await supabase.rpc('increment_balance', { user_id: user.id, amount: -Number(amount) });
        
        // 2. Créer la demande de retrait
        await supabase.from('transactions').insert([{
          user_id: user.id,
          amount: Number(amount),
          type: 'retrait',
          status: 'en_attente'
        }]);
      } else {
        // Logique Dépôt
        let publicUrl = "";
        if (file) {
          const fileName = `${user.id}/${Date.now()}.jpg`;
          await supabase.storage.from('transactions').upload(fileName, file);
          const { data } = supabase.storage.from('transactions').getPublicUrl(fileName);
          publicUrl = data.publicUrl;
        }

        await supabase.from('transactions').insert([{
          user_id: user.id,
          amount: Number(amount),
          type: 'depot',
          proof_url: publicUrl,
          status: 'en_attente'
        }]);
      }
      
      alert("Demande envoyée avec succès !");
      setMethod(null);
      setAmount('');
      fetchUser();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-6 animate-in fade-in duration-700 pb-32">
      {/* Carte de Solde Elite */}
      <div className="bg-linear-to-br from-emerald-600 to-emerald-900 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <p className="text-[10px] font-black uppercase text-emerald-200 tracking-[0.2em] mb-1">Disponible</p>
        <h2 className="text-4xl font-black italic text-white">{user?.balance?.toLocaleString()} HTG</h2>
        <Wallet className="absolute -right-5 -bottom-5 text-white/10 w-32 h-32" />
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => setMethod('depot')} className="bg-slate-900 border border-white/5 p-6 rounded-4xl flex flex-col items-center gap-2 active:scale-95 transition-all">
          <Plus className="text-emerald-500" size={28} />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dépôt</span>
        </button>
        <button onClick={() => setMethod('retrait')} className="bg-slate-900 border border-white/5 p-6 rounded-4xl flex flex-col items-center gap-2 active:scale-95 transition-all">
          <ArrowDownCircle className="text-rose-500" size={28} />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Retrait</span>
        </button>
      </div>

      {/* Formulaire Dynamique */}
      {method && (
        <div className="bg-slate-900/60 p-6 rounded-[2.5rem] border border-emerald-500/20 animate-in slide-in-from-bottom-4">
          <h3 className="text-center font-black uppercase text-xs mb-6 tracking-widest">
            {method === 'depot' ? 'Nouveau Dépôt' : 'Demander un Retrait'}
          </h3>
          
          <div className="space-y-4">
            <input 
              type="number" 
              placeholder="Montant HTG" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-slate-950 border border-white/5 p-4 rounded-2xl text-center font-black text-xl text-emerald-500 outline-none"
            />

            {method === 'depot' && (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-white/5 p-6 rounded-2xl cursor-pointer hover:bg-white/5">
                <ImageIcon className="text-slate-500 mb-2" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">{file ? file.name : "Preuve du transfert (image)"}</span>
                <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </label>
            )}

            <button 
              disabled={loading}
              onClick={handleTransaction}
              className="w-full py-4 bg-emerald-500 text-slate-950 font-black rounded-2xl uppercase text-[10px] tracking-widest"
            >
              {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Confirmer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}