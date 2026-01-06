"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Ban, UserCheck, Wallet, Loader2, ShieldAlert } from 'lucide-react';

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers(data || []);
    setLoading(false);
  };

  const toggleBan = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from('profiles').update({ is_banned: !currentStatus }).eq('id', id);
    if (!error) fetchUsers();
  };

  const adjustBalance = async (id: string) => {
    const newBalance = prompt("Entrez le nouveau solde total (HTG) :");
    if (newBalance !== null && !isNaN(Number(newBalance))) {
      const { error } = await supabase.from('profiles').update({ balance: Number(newBalance) }).eq('id', id);
      if (!error) fetchUsers();
    }
  };

  const filteredUsers = users.filter(u => u.phone.includes(searchTerm));

  if (loading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-black italic uppercase">Gestion <span className="text-emerald-500">Elite</span></h1>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Chercher un numéro..." 
            className="w-full bg-slate-900 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-xs outline-none focus:border-emerald-500 transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map(user => (
          <div key={user.id} className={`p-6 rounded-[2.5rem] border transition-all ${user.is_banned ? 'bg-rose-500/5 border-rose-500/20' : 'bg-slate-900/50 border-white/5'}`}>
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${user.is_banned ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-slate-950'}`}>
                  {user.phone.slice(-2)}
                </div>
                <div>
                  <p className="font-black text-sm">+{user.phone}</p>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Client</p>
                </div>
              </div>
              <button onClick={() => toggleBan(user.id, user.is_banned)} className={`p-2 rounded-xl transition-colors ${user.is_banned ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-rose-500 hover:bg-rose-500/10'}`}>
                {user.is_banned ? <UserCheck size={20} /> : <Ban size={20} />}
              </button>
            </div>

            <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5 flex justify-between items-center mb-4">
              <div>
                <p className="text-[8px] font-black uppercase text-slate-500">Solde Actuel</p>
                <p className="font-black italic text-emerald-500">{user.balance.toLocaleString()} HTG</p>
              </div>
              <button onClick={() => adjustBalance(user.id)} className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white">
                <Wallet size={16} />
              </button>
            </div>

            {user.is_banned && (
              <div className="flex items-center gap-2 text-rose-500">
                <ShieldAlert size={12} />
                <span className="text-[8px] font-black uppercase tracking-tighter">Compte Suspendu</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}