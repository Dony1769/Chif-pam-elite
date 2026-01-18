"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Ticket, Plus, Trash2, Power, Loader2 } from 'lucide-react';

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [code, setCode] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchCoupons(); }, []);

  const fetchCoupons = async () => {
    const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    setCoupons(data || []);
  };

  const createCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await supabase.from('coupons').insert([{ code: code.toUpperCase(), amount: parseFloat(amount) }]);
    setCode(''); setAmount('');
    fetchCoupons();
    setLoading(false);
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    await supabase.from('coupons').update({ is_active: !currentStatus }).eq('id', id);
    fetchCoupons();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto text-white italic font-black uppercase">
      <h1 className="text-3xl flex items-center gap-3 mb-8"><Ticket className="text-emerald-500" /> GESTION DES COUPONS</h1>

      <form onSubmit={createCoupon} className="bg-slate-900 p-6 rounded-2xl border border-white/5 mb-8 flex gap-4">
        <input placeholder="CODE (EX: WELCOME20)" value={code} onChange={e => setCode(e.target.value)} className="flex-1 bg-black/50 p-4 rounded-xl border border-white/10 outline-none" required />
        <input type="number" placeholder="SOMME (HTG)" value={amount} onChange={e => setAmount(e.target.value)} className="w-32 bg-black/50 p-4 rounded-xl border border-white/10 outline-none" required />
        <button className="bg-emerald-500 text-black px-8 rounded-xl font-bold flex items-center gap-2">
          {loading ? <Loader2 className="animate-spin" /> : <Plus size={20} />} AJOUTER
        </button>
      </form>

      <div className="space-y-4">
        {coupons.map(c => (
          <div key={c.id} className={`p-5 rounded-2xl border flex justify-between items-center ${c.is_active ? 'bg-slate-900 border-emerald-500/20' : 'bg-slate-900/50 border-white/5 opacity-50'}`}>
            <div>
              <p className="text-xl">{c.code}</p>
              <p className="text-emerald-500 text-xs">{c.amount} HTG</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => toggleStatus(c.id, c.is_active)} className={`p-3 rounded-full ${c.is_active ? 'bg-orange-500/10 text-orange-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                <Power size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
