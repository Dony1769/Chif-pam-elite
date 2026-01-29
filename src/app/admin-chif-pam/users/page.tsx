"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; // Ton client habituel
import { adminResetPassword } from '@/app/actions/adminActions'; // Import de l'action créée étape 2
import { Search, Ban, UserCheck, Wallet, Loader2, ShieldAlert, User, Calendar, MessageSquare, Key } from 'lucide-react';

// Définition simple du type User pour TypeScript
interface UserProfile {
  id: string;
  username: string;
  phone: string;
  balance: number;
  is_banned: boolean;
  ban_reason: string | null;
  created_at: string;
  role: 'admin' | 'client';
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    // On sélectionne tout depuis profiles
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
      
    setUsers((data as UserProfile[]) || []);
    setLoading(false);
  };

  // --- FONCTION CORRIGÉE ---
  const handleResetPassword = async (id: string, username: string) => {
    const newPass = prompt(`Nouveau mot de passe pour @${username || 'cet utilisateur'} :`);
    
    // Validation basique
    if (!newPass) return;
    if (newPass.length < 6) {
      alert("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    try {
      // Appel de la Server Action (côté serveur)
      const result = await adminResetPassword(id, newPass);

      if (result.success) {
        alert("✅ " + result.message);
      } else {
        alert("❌ Erreur : " + result.message);
      }
    } catch (err) {
      console.error(err);
      alert("Erreur technique lors de la réinitialisation.");
    }
  };

  const toggleBan = async (id: string, currentStatus: boolean) => {
    let banReason = null;
    if (!currentStatus) {
      banReason = prompt("Motif du blocage (Ex: Fraude, non-respect des règles...) :");
      if (banReason === null) return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_banned: !currentStatus,
          ban_reason: !currentStatus ? (banReason || "Non spécifié") : null 
        })
        .eq('id', id);

      if (error) throw error;

      setUsers(prevUsers => 
        prevUsers.map(u => u.id === id 
          ? { ...u, is_banned: !currentStatus, ban_reason: !currentStatus ? banReason : null } 
          : u
        )
      );
    } catch (err) {
      alert("Erreur technique : Vérifiez vos droits d'admin (RLS).");
    }
  };

  const adjustBalance = async (id: string) => {
    const newBalance = prompt("Entrez le nouveau solde total (HTG) :");
    if (newBalance !== null && !isNaN(Number(newBalance))) {
      const { error } = await supabase
        .from('profiles')
        .update({ balance: Number(newBalance) })
        .eq('id', id);
        
      if (!error) {
        fetchUsers(); // Rafraichir pour être sûr
      } else {
        alert("Erreur lors de la mise à jour du solde.");
      }
    }
  };

  const filteredUsers = users.filter(u => 
    (u.phone && u.phone.includes(searchTerm)) || 
    (u.username && u.username.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto text-white italic uppercase font-black">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl tracking-tighter">Gestion <span className="text-emerald-500">Elite</span></h1>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Nom ou Numéro..." 
            className="w-full bg-slate-900 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-[10px] outline-none focus:border-emerald-500 transition-all font-bold"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map(user => (
          <div key={user.id} className={`p-6 rounded-[2.5rem] border transition-all duration-500 ${user.is_banned ? 'bg-rose-500/5 border-rose-500/20' : 'bg-slate-900/50 border-white/5 shadow-xl'}`}>
            
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg ${user.is_banned ? 'bg-rose-500' : 'bg-emerald-500 text-slate-950'}`}>
                  <User size={24} />
                </div>
                <div>
                  <p className="text-sm tracking-tighter">@{user.username || 'Inconnu'}</p>
                  <p className="text-[10px] text-emerald-500 font-bold">+{user.phone}</p>
                  <p className="text-[8px] text-slate-500 mt-1 border border-white/10 px-1 rounded inline-block">{user.role}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {/* BOUTON RESET MOT DE PASSE CONNECTÉ À LA SERVER ACTION */}
                <button 
                  onClick={() => handleResetPassword(user.id, user.username)} 
                  className="p-3 bg-slate-800 rounded-2xl text-amber-500 hover:bg-amber-500 hover:text-slate-950 transition-all active:scale-90"
                  title="Réinitialiser le mot de passe"
                >
                  <Key size={18} />
                </button>
                <button onClick={() => toggleBan(user.id, user.is_banned)} className={`p-3 rounded-2xl transition-all active:scale-90 ${user.is_banned ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                  {user.is_banned ? <UserCheck size={20} /> : <Ban size={20} />}
                </button>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-[9px] text-slate-500">
                <Calendar size={12} />
                <span>Inscrit le : {new Date(user.created_at).toLocaleDateString()}</span>
              </div>
              
              <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                <div>
                  <p className="text-[8px] text-slate-500 mb-1">Portefeuille</p>
                  <p className="text-lg text-emerald-500">{user.balance?.toLocaleString()} HTG</p>
                </div>
                <button onClick={() => adjustBalance(user.id)} className="p-3 bg-slate-800 rounded-xl text-emerald-500 hover:bg-emerald-500 hover:text-slate-950 transition-all">
                  <Wallet size={18} />
                </button>
              </div>
            </div>

            {user.is_banned && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-rose-500">
                  <ShieldAlert size={14} />
                  <span className="text-[9px] tracking-widest font-black">COMPTE SUSPENDU</span>
                </div>
                {user.ban_reason && (
                  <div className="bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 flex gap-2 items-start">
                    <MessageSquare size={12} className="text-rose-500 shrink-0 mt-0.5" />
                    <p className="text-[8px] italic lowercase font-bold text-rose-200">"{user.ban_reason}"</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}