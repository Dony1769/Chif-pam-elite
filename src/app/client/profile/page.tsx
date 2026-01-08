"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  User, Mail, Wallet, ShieldCheck, LogOut, 
  TrendingUp, ArrowUpRight, ArrowDownRight, 
  Settings, Camera, Loader2, ChevronRight
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Form states
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (prof) {
      setProfile(prof);
      setFullName(prof.full_name || "");
      // Simulation de données pour le graphe (À lier à ta table transactions plus tard)
      setStats([
        { name: 'Lun', gain: 400 },
        { name: 'Mar', gain: 700 },
        { name: 'Mer', gain: 500 },
        { name: 'Jeu', gain: 900 },
        { name: 'Ven', gain: 1500 },
        { name: 'Sam', gain: 1200 },
        { name: 'Dim', gain: 1800 },
      ]);
    }
    setLoading(false);
  };

  const handleUpdateProfile = async () => {
    setUpdating(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', profile.id);

    if (error) alert(error.message);
    else alert("Profil mis à jour !");
    setUpdating(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loader2 className="animate-spin text-emerald-500" size={40} />
    </div>
  );

  return (
    <main className="min-h-screen bg-[#020617] text-white p-6 pb-32 font-black italic uppercase tracking-tighter">
      <div className="max-w-md mx-auto space-y-8">
        
        {/* HEADER PROFIL */}
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-tr from-emerald-500 to-emerald-800 rounded-full flex items-center justify-center border-4 border-white/5 shadow-2xl">
              <User size={48} className="text-slate-950" />
            </div>
            <button className="absolute bottom-0 right-0 bg-white text-slate-950 p-2 rounded-full shadow-lg border-2 border-slate-950">
              <Camera size={14} />
            </button>
          </div>
          <div className="text-center">
            <h1 className="text-2xl tracking-tighter">{profile?.full_name || 'Joueur Anonyme'}</h1>
            <p className="text-[10px] text-slate-500 not-italic lowercase tracking-widest">{profile?.username || 'ID: '+profile?.id.slice(0,8)}</p>
          </div>
        </div>

        {/* ANALYTICS CARD (GRAPHIQUE) */}
        
        <div className="bg-slate-900/50 rounded-[2.5rem] border border-white/5 p-6 space-y-4 overflow-hidden shadow-2xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-emerald-500" size={18} />
              <span className="text-xs">Performance Gains</span>
            </div>
            <span className="text-[10px] text-emerald-500">+24% ce mois</span>
          </div>
          
          <div className="h-48 w-full -ml-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats}>
                <defs>
                  <linearGradient id="colorGain" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '10px' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Area type="monotone" dataKey="gain" stroke="#10b981" fillOpacity={1} fill="url(#colorGain)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
            <div className="text-center">
              <p className="text-[8px] text-slate-500 mb-1">Total Déposé</p>
              <p className="text-sm text-white">45,000 HTG</p>
            </div>
            <div className="text-center border-l border-white/5">
              <p className="text-[8px] text-slate-500 mb-1">Total Retiré</p>
              <p className="text-sm text-white">12,500 HTG</p>
            </div>
          </div>
        </div>

        {/* FORMULAIRE DE MODIFICATION */}
        <div className="bg-slate-900/80 rounded-[2.5rem] border border-white/5 p-8 space-y-6">
          <div className="flex items-center gap-2 border-b border-white/5 pb-4">
            <Settings size={18} className="text-slate-500" />
            <h2 className="text-sm">Paramètres du compte</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[9px] text-slate-500 ml-2">Nom Complet</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 p-4 pl-12 rounded-2xl outline-none focus:border-emerald-500/50 transition-all text-xs"
                />
              </div>
            </div>

            <button 
              onClick={handleUpdateProfile}
              disabled={updating}
              className="w-full py-4 bg-emerald-500 text-slate-950 rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
            >
              {updating ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
              Sauvegarder les modifications
            </button>
          </div>
        </div>

        {/* ACTIONS SECONDAIRES */}
        <div className="space-y-3">
          <button className="w-full p-6 bg-slate-900/40 rounded-[1.5rem] border border-white/5 flex justify-between items-center group active:scale-95 transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/5 rounded-xl"><ShieldCheck size={20} className="text-blue-500" /></div>
              <span className="text-xs">Sécurité & Mot de passe</span>
            </div>
            <ChevronRight size={18} className="text-slate-700 group-hover:text-white transition-all" />
          </button>

          <button 
            onClick={() => supabase.auth.signOut()}
            className="w-full p-6 bg-rose-500/5 rounded-[1.5rem] border border-rose-500/10 flex justify-between items-center group active:scale-95 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-rose-500/10 rounded-xl"><LogOut size={20} className="text-rose-500" /></div>
              <span className="text-xs text-rose-500">Déconnexion</span>
            </div>
          </button>
        </div>

      </div>
    </main>
  );
}
