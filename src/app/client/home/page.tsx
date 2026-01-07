"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Plus, ArrowDownCircle, Wallet, Loader2, 
  Image as ImageIcon, Home, PlayCircle, 
  History, MessageSquare, User, Bell, CheckCircle2
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

    // SYSTEME REALTIME : Synchronisation immédiate du solde et du profil
    const channel = supabase.channel('profile-update')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'profiles' 
      }, (payload) => {
        // Si la mise à jour concerne l'utilisateur actuel (ex: gain ou dépôt validé)
        if (user && payload.new.id === user.id) {
          setUser(payload.new);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

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
    const valAmount = Number(amount);
    if (!amount || valAmount <= 0) return alert("Veuillez entrer un montant valide.");
    if (method === 'depot' && !file) return alert("Veuillez joindre une preuve de paiement (Screenshot).");
    
    setLoading(true);

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Session expirée");

      if (method === 'retrait') {
        // 1. Vérification de sécurité locale
        if (valAmount > user.balance) throw new Error("Solde insuffisant pour ce retrait.");

        // 2. Déduction immédiate du solde (Sécurité Serveur via RPC)
        const { error: rpcError } = await supabase.rpc('increment_balance', { 
          user_id: authUser.id, 
          amount: -valAmount 
        });
        
        if (rpcError) throw new Error("Erreur lors de la déduction : " + rpcError.message);

        // 3. Création de la demande de retrait pour l'admin
        const { error: transError } = await supabase.from('transactions').insert([{
          user_id: authUser.id, 
          amount: valAmount, 
          type: 'retrait', 
          status: 'en_attente',
          admin_note: "Demande de retrait client"
        }]);

        if (transError) throw transError;

      } else {
        // LOGIQUE DE DÉPÔT
        let publicUrl = "";
        
        if (file) {
          // Upload sécurisé dans le bucket 'transactions'
          const fileExt = file.name.split('.').pop();
          const fileName = `${authUser.id}/${Date.now()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('transactions')
            .upload(fileName, file);

          if (uploadError) throw new Error("Erreur upload image : " + uploadError.message);

          const { data } = supabase.storage.from('transactions').getPublicUrl(fileName);
          publicUrl = data.publicUrl;
        }

        // Création de la transaction de dépôt (ne modifie pas le solde avant validation admin)
        const { error: transError } = await supabase.from('transactions').insert([{
          user_id: authUser.id, 
          amount: valAmount, 
          type: 'depot', 
          proof_url: publicUrl, 
          status: 'en_attente',
          admin_note: "Nouveau dépôt à valider"
        }]);

        if (transError) throw transError;
      }
      
      alert("Votre demande a été transmise à l'administration avec succès !");
      setMethod(null);
      setAmount('');
      setFile(null);
      fetchUser(); // Rechargement du profil pour voir le nouveau solde (si retrait)

    } catch (error: any) {
      alert("Erreur : " + error.message);
      console.error(error);
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
      {/* HEADER SECTION */}
      <header className="p-6 flex justify-between items-center bg-slate-950/20 backdrop-blur-md sticky top-0 z-40">
        <div>
          <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em]">Membre Certifié</p>
          <h1 className="text-xl font-black italic uppercase tracking-tighter text-white">
            {user?.username || 'Utilisateur'}
          </h1>
        </div>
        <button className="p-3 bg-slate-900 rounded-2xl border border-white/5 relative text-slate-400 active:scale-90 transition-all">
          <Bell size={20} />
          <span className="absolute top-3 right-3 w-2 h-2 bg-emerald-500 rounded-full border-2 border-slate-900"></span>
        </button>
      </header>

      <div className="p-4 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
        
        {/* CARTE DE SOLDE ELITE */}
        <div className="bg-gradient-to-br from-emerald-600 via-emerald-800 to-slate-950 p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(16,185,129,0.2)] relative overflow-hidden group border border-white/10">
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase text-emerald-200 tracking-[0.2em] mb-1 opacity-80">Solde Disponible</p>
            <div className="flex items-baseline gap-2">
                <h2 className="text-5xl font-black italic text-white tracking-tighter">
                {user?.balance?.toLocaleString()}
                </h2>
                <span className="text-sm font-bold text-emerald-300 italic uppercase">HTG</span>
            </div>
            
            <div className="mt-6 inline-flex items-center gap-2 bg-black/30 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/5">
                <CheckCircle2 size={12} className="text-emerald-400" />
                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-100">Compte Sécurisé</span>
            </div>
          </div>
          <Wallet className="absolute -right-8 -bottom-8 text-white/5 w-48 h-48 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-1000" />
        </div>

        {/* ACTIONS RAPIDES */}
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => setMethod('depot')} 
            className={`p-6 rounded-[2rem] border transition-all active:scale-95 flex flex-col items-center gap-3 ${method === 'depot' ? 'bg-emerald-500 border-emerald-400 text-black' : 'bg-slate-900/50 border-white/5 text-slate-400'}`}
          >
            <div className={`p-3 rounded-2xl ${method === 'depot' ? 'bg-black/10' : 'bg-emerald-500/10 text-emerald-500'}`}><Plus size={24} /></div>
            <span className="text-[10px] font-black uppercase tracking-widest">Faire un Dépôt</span>
          </button>
          
          <button 
            onClick={() => setMethod('retrait')} 
            className={`p-6 rounded-[2rem] border transition-all active:scale-95 flex flex-col items-center gap-3 ${method === 'retrait' ? 'bg-rose-500 border-rose-400 text-white' : 'bg-slate-900/50 border-white/5 text-slate-400'}`}
          >
            <div className={`p-3 rounded-2xl ${method === 'retrait' ? 'bg-black/10' : 'bg-rose-500/10 text-rose-500'}`}><ArrowDownCircle size={24} /></div>
            <span className="text-[10px] font-black uppercase tracking-widest">Retrait Gains</span>
          </button>
        </div>

        {/* FORMULAIRE DYNAMIQUE DE TRANSACTION */}
        {method && (
          <div className="bg-slate-900 border border-white/10 p-6 rounded-[2.5rem] animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6 px-2">
                <h3 className="font-black uppercase text-[10px] tracking-[0.2em] text-emerald-500">
                    {method === 'depot' ? 'Configuration Dépôt' : 'Configuration Retrait'}
                </h3>
                <button onClick={() => {setMethod(null); setFile(null); setAmount('');}} className="text-slate-500 text-[10px] font-black uppercase hover:text-white transition-colors">Annuler</button>
            </div>
            
            <div className="space-y-4">
              <div className="relative">
                <input 
                    type="number" 
                    placeholder="0.00" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-white/5 p-6 rounded-3xl text-center font-black text-3xl text-emerald-500 outline-none focus:border-emerald-500/30 transition-all"
                />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-700">HTG</span>
              </div>

              {method === 'depot' && (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-white/5 p-8 rounded-3xl cursor-pointer hover:bg-white/5 hover:border-emerald-500/20 transition-all group">
                  <ImageIcon className="text-slate-500 mb-2 group-hover:text-emerald-500 transition-colors" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase text-center group-hover:text-slate-300">
                    {file ? `✓ ${file.name.substring(0,20)}...` : "Télécharger la preuve de paiement"}
                  </span>
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                </label>
              )}

              <button 
                disabled={loading}
                onClick={handleTransaction}
                className="w-full py-5 bg-emerald-500 text-slate-950 font-black rounded-3xl uppercase text-[11px] tracking-[0.2em] shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Confirmer la demande'}
              </button>
            </div>
          </div>
        )}

        {/* SECTION JEUX */}
        <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 px-2">Zone de Jeu Active</h4>
            <Link href="/client/play" className="flex bg-slate-900 border border-white/5 p-5 rounded-[2.5rem] items-center gap-5 hover:border-emerald-500/30 transition-all group relative overflow-hidden">
                <div className="w-16 h-16 bg-emerald-500 rounded-3xl flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20 group-hover:rotate-12 transition-transform">
                    <PlayCircle size={32} />
                </div>
                <div>
                    <p className="font-black uppercase italic tracking-tighter text-lg leading-tight">Rideau de <span className="text-emerald-500">Fumée</span></p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Multiplicateur de gain x10</p>
                </div>
                <div className="ml-auto p-3 bg-slate-950 rounded-2xl text-slate-700 group-hover:text-emerald-500 transition-colors">
                    <ArrowDownCircle className="-rotate-90" size={20} />
                </div>
            </Link>
        </div>
      </div>

      {/* NAVIGATION BAS DE PAGE (STICKY) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-2xl border-t border-white/5 px-8 py-5 flex justify-between items-center z-50 rounded-t-[2rem]">
        <NavLink href="/client/home" icon={<Home size={22}/>} label="Accueil" active={pathname === '/client/home'} />
        <NavLink href="/client/play" icon={<PlayCircle size={22}/>} label="Jouer" active={pathname === '/client/play'} />
        <NavLink href="/client/history" icon={<History size={22}/>} label="Billets" active={pathname === '/client/history'} />
        <NavLink href="/client/chat" icon={<MessageSquare size={22}/>} label="Support" active={pathname === '/client/chat'} />
        <NavLink href="/client/profile" icon={<User size={22}/>} label="Compte" active={pathname === '/client/profile'} />
      </nav>
    </div>
  );
}

function NavLink({ href, icon, label, active }: any) {
  return (
    <Link href={href} className="flex flex-col items-center gap-1.5 transition-all active:scale-90">
      <div className={`p-2 rounded-xl transition-all ${active ? 'text-emerald-500 bg-emerald-500/10 shadow-inner' : 'text-slate-600 hover:text-slate-300'}`}>
        {icon}
      </div>
      <span className={`text-[7px] font-black uppercase tracking-[0.2em] ${active ? 'text-emerald-500' : 'text-slate-700'}`}>
        {label}
      </span>
    </Link>
  );
}
