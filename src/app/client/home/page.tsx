"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Plus, ArrowDownCircle, Wallet, Loader2, 
  Image as ImageIcon, Home, PlayCircle, 
  History, MessageSquare, User, Bell
} from 'lucide-react';

export default function ClientHome() {
  const [user, setUser] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'depot' | 'retrait' | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => { 
    fetchUser(); 

    // SYSTEME REALTIME : Met à jour le solde si la table profile change (gains, dépôts valides)
    const channel = supabase.channel('profile-changes')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'profiles' 
      }, (payload) => {
        if (user && payload.new.id === user.id) {
          setUser(payload.new);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  // Fonction fetchUser Robuste
  const fetchUser = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return router.push('/connexion');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();
      
      if (error) throw error;
      setUser(data);
    } catch (e) {
      console.error("Erreur de chargement profil:", e);
    } finally {
      setFetching(false);
    }
  };

  const handleTransaction = async () => {
    if (!amount || Number(amount) <= 0) return alert("Montant invalide");
    setLoading(true);

    try {
      if (method === 'retrait') {
        if (Number(amount) > user.balance) throw new Error("Solde insuffisant");
        
        // Déduction immédiate via RPC pour sécurité
        const { error: rpcError } = await supabase.rpc('increment_balance', { 
          user_id: user.id, 
          amount: -Number(amount) 
        });
        
        if (rpcError) throw rpcError;

        await supabase.from('transactions').insert([{
          user_id: user.id, 
          amount: Number(amount), 
          type: 'retrait', 
          status: 'en_attente'
        }]);
      } else {
        // Logique de Dépôt
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
      
      alert("Demande transmise avec succès !");
      setMethod(null);
      setAmount('');
      setFile(null);
      fetchUser(); // Rafraîchissement manuel par sécurité
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <Loader2 className="animate-spin text-emerald-500" size={32} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans pb-32">
      {/* HEADER */}
      <header className="p-6 flex justify-between items-center">
        <div>
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Bienvenue,</p>
          <h1 className="text-xl font-black italic uppercase tracking-tighter">
            {user?.username || 'Membre Elite'}
          </h1>
        </div>
        <button className="p-3 bg-slate-900 rounded-full border border-white/5 relative text-slate-400">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full border-2 border-slate-900"></span>
        </button>
      </header>

      <div className="p-4 space-y-6 animate-in fade-in duration-700">
        {/* CARTE DE SOLDE */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-900 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase text-emerald-200 tracking-[0.2em] mb-1">Solde de Jeu</p>
            <h2 className="text-4xl font-black italic text-white tracking-tighter">
              {user?.balance?.toLocaleString()} <span className="text-sm not-italic opacity-60">HTG</span>
            </h2>
            <div className="mt-6 inline-flex items-center gap-2 bg-black/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-100">Compte Certifié</span>
            </div>
          </div>
          <Wallet className="absolute -right-5 -bottom-5 text-white/10 w-40 h-40 group-hover:scale-110 transition-transform duration-700" />
        </div>

        {/* ACTIONS RAPIDES */}
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => setMethod('depot')} className="bg-slate-900/50 border border-white/5 p-6 rounded-[2rem] flex flex-col items-center gap-3 active:scale-95 transition-all">
            <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500"><Plus size={24} /></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dépôt</span>
          </button>
          <button onClick={() => setMethod('retrait')} className="bg-slate-900/50 border border-white/5 p-6 rounded-[2rem] flex flex-col items-center gap-3 active:scale-95 transition-all">
            <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-500"><ArrowDownCircle size={24} /></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Retrait</span>
          </button>
        </div>

        {/* FORMULAIRE DYNAMIQUE */}
        {method && (
          <div className="bg-slate-900/40 p-6 rounded-[2.5rem] border border-white/5 animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center mb-6 px-2">
                <h3 className="font-black uppercase text-[10px] tracking-[0.2em] text-emerald-500">
                    {method === 'depot' ? 'Recharger le compte' : 'Retirer les gains'}
                </h3>
                <button onClick={() => {setMethod(null); setFile(null);}} className="text-slate-500 text-[10px] font-black uppercase hover:text-white transition-colors">Annuler</button>
            </div>
            
            <div className="space-y-4">
              <input 
                type="number" 
                placeholder="Montant HTG" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-950 border border-white/5 p-6 rounded-3xl text-center font-black text-2xl text-emerald-500 outline-none focus:border-emerald-500/30 transition-all"
              />

              {method === 'depot' && (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-white/5 p-8 rounded-3xl cursor-pointer hover:bg-white/5 transition-colors">
                  <ImageIcon className="text-slate-500 mb-2" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase text-center">
                    {file ? file.name : "Joindre preuve (Screenshot)"}
                  </span>
                  <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                </label>
              )}

              <button 
                disabled={loading}
                onClick={handleTransaction}
                className="w-full py-5 bg-emerald-500 text-slate-950 font-black rounded-3xl uppercase text-[11px] tracking-[0.2em] shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
              >
                {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Valider la transaction'}
              </button>
            </div>
          </div>
        )}

        {/* ESPACE DE JEU */}
        <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-2">Espace de jeu</h4>
            <Link href="/client/play" className="flex bg-slate-900 border border-white/5 p-4 rounded-[2rem] items-center gap-4 hover:border-emerald-500/30 transition-all group">
                <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-slate-950">
                    <PlayCircle size={28} />
                </div>
                <div>
                    <p className="font-black uppercase italic tracking-tighter text-sm">Jouer aux 10 chiffres</p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Multipliez votre mise par 10</p>
                </div>
                <div className="ml-auto p-2 text-slate-700 group-hover:text-emerald-500 transition-colors">
                    <ArrowDownCircle className="-rotate-90" size={20} />
                </div>
            </Link>
        </div>
      </div>

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/80 backdrop-blur-2xl border-t border-white/5 px-6 py-4 flex justify-between items-center z-50">
        <NavLink href="/client/home" icon={<Home size={22}/>} label="Home" active={pathname === '/client/home'} />
        <NavLink href="/client/play" icon={<PlayCircle size={22}/>} label="Jouer" active={pathname === '/client/play'} />
        <NavLink href="/client/history" icon={<History size={22}/>} label="Billets" active={pathname === '/client/history'} />
        <NavLink href="/client/chat" icon={<MessageSquare size={22}/>} label="Chat" active={pathname === '/client/chat'} />
        <NavLink href="/client/profile" icon={<User size={22}/>} label="Profil" active={pathname === '/client/profile'} />
      </nav>
    </div>
  );
}

function NavLink({ href, icon, label, active }: any) {
  return (
    <Link href={href} className="flex flex-col items-center gap-1 transition-all">
      <div className={`p-2 rounded-xl transition-all ${active ? 'text-emerald-500 bg-emerald-500/10' : 'text-slate-500'}`}>
        {icon}
      </div>
      <span className={`text-[8px] font-black uppercase tracking-widest ${active ? 'text-emerald-500' : 'text-slate-600'}`}>
        {label}
      </span>
    </Link>
  );
}
