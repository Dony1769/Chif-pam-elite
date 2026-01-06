"use client";

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Users, ShieldCheck, LogOut, Check, X, 
  Send, Search, Image as ImageIcon, Activity,
  Ban, UserCheck, Loader2, Dices, Trophy, Timer
} from 'lucide-react';

const ADMIN_ID = process.env.NEXT_PUBLIC_ADMIN_ID || '9e141172-93db-4df4-a72b-47b89211b46e';

export default function AdminDashboard() {
  // --- ÉTATS ---
  const [activeTab, setActiveTab] = useState<'users' | 'finance' | 'chat' | 'loterie'>('users');
  const [profiles, setProfiles] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [selectedUserChat, setSelectedUserChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'depot' | 'retrait'>('all');
  const [loading, setLoading] = useState(true);
  
  // États Loterie
  const [currentTirage, setCurrentTirage] = useState<any>(null);
  const [multiplicateur, setMultiplicateur] = useState(5);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => { checkAdmin(); }, []);
  useEffect(() => { if (activeTab === 'chat') scrollToBottom(); }, [messages]);

  const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: "smooth" });

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== '99999999@chifpam.ht') return router.push('/connexion');
    fetchData();
  };

  const fetchData = async () => {
    setLoading(true);
    const { data: profs } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    const { data: trans } = await supabase.from('transactions').select(`*, profiles(phone)`).order('created_at', { ascending: false });
    const { data: unread } = await supabase.from('messages').select('sender_id').eq('receiver_id', ADMIN_ID).eq('is_read', false);

    const counts: Record<string, number> = {};
    unread?.forEach(m => counts[m.sender_id] = (counts[m.sender_id] || 0) + 1);
    
    setUnreadCounts(counts);
    setProfiles(profs || []);
    setTransactions(trans || []);
    setLoading(false);
  };

  // --- LOGIQUE LOTERIE (MISE À JOUR) ---
  const preparerTirage = async (moment: string) => {
    // Empêcher la création si une session existe déjà localement
    if (currentTirage) {
      return alert("Une session est déjà active. Clôturez-la d'abord.");
    }

    // 1. Générer le gagnant
    const gagnant = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    
    // 2. Générer 9 chiffres uniques différents du gagnant
    const faux = new Set<string>();
    while(faux.size < 9) {
      const n = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      if (n !== gagnant) faux.add(n);
    }

    // 3. Mélanger (Shuffle)
    const tous = [gagnant, ...Array.from(faux)].sort(() => Math.random() - 0.5);

    const { data, error } = await supabase.from('tirage_sessions').insert([{
      moment,
      chiffre_gagnant: gagnant,
      tous_chiffres: tous,
      multiplicateur: multiplicateur,
      status: 'ouvert'
    }]).select().single();

    if (!error) {
      setCurrentTirage(data);
      alert(`Tirage ${moment} lancé ! Chiffre gagnant caché : ${gagnant}`);
    }
  };

  const cloreTirage = async () => {
    if (!currentTirage) return;
    
    // 1. Fermer le tirage
    await supabase.from('tirage_sessions').update({ status: 'ferme' }).eq('id', currentTirage.id);
    
    // 2. Récupérer les mises
    const { data: mises } = await supabase.from('mises').select('*').eq('tirage_id', currentTirage.id);
    
    // 3. Distribuer les gains
    if (mises) {
      for (const mise of mises) {
        const estGagne = mise.chiffre_choisi === currentTirage.chiffre_gagnant;
        await supabase.from('mises').update({ status: estGagne ? 'gagne' : 'perdu' }).eq('id', mise.id);
        
        if (estGagne) {
          await supabase.rpc('increment_balance', { user_id: mise.user_id, amount: mise.gain_potentiel });
        }
      }
    }
    
    alert("Tirage terminé et gains distribués !");
    setCurrentTirage(null);
  };

  // --- ACTIONS CHAT/FINANCE (RESTE DU CODE IDENTIQUE) ---
  const fetchUserMessages = async (userId: string) => {
    setSelectedUserChat(userId);
    await supabase.from('messages').update({ is_read: true }).eq('sender_id', userId).eq('receiver_id', ADMIN_ID);
    setUnreadCounts(prev => ({ ...prev, [userId]: 0 }));
    const { data } = await supabase.from('messages').select('*').or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).order('created_at', { ascending: true });
    setMessages(data || []);
  };

  const handleAdminResponse = async () => {
    if (!newMessage.trim() || !selectedUserChat) return;
    const { error } = await supabase.from('messages').insert([{ content: newMessage, sender_id: ADMIN_ID, receiver_id: selectedUserChat, is_admin: true, is_read: false }]);
    if (!error) { setNewMessage(''); fetchUserMessages(selectedUserChat); }
  };

  const handleTransaction = async (id: string, status: 'approuve' | 'rejete', type: string, userId: string, amount: number) => {
    const note = status === 'rejete' ? window.prompt("Raison du rejet :") : "Validé";
    if (status === 'approuve' && type === 'depot') await supabase.rpc('increment_balance', { user_id: userId, amount: amount });
    if (status === 'rejete' && type === 'retrait') await supabase.rpc('increment_balance', { user_id: userId, amount: amount });
    await supabase.from('transactions').update({ status, admin_note: note }).eq('id', id);
    fetchData();
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-emerald-500 gap-4">
      <Loader2 className="animate-spin" size={40} />
      <p className="text-[10px] font-black uppercase tracking-[0.3em]">Elite Panel...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col font-sans">
      <nav className="bg-slate-900/80 backdrop-blur-md border-b border-white/5 p-6 flex justify-between items-center z-50">
        <div className="flex items-center gap-4">
          <ShieldCheck className="text-emerald-500" size={32} />
          <h1 className="font-black italic uppercase tracking-tighter text-xl">Elite <span className="text-emerald-500 text-sm">Admin</span></h1>
        </div>
        <div className="flex gap-4">
          {['users', 'finance', 'chat', 'loterie'].map(t => (
            <button key={t} onClick={() => setActiveTab(t as any)} className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'text-slate-500 hover:text-white'}`}>
              {t === 'loterie' ? '🎰 Loterie' : t}
            </button>
          ))}
          <button onClick={() => { supabase.auth.signOut(); router.push('/connexion'); }} className="p-2 text-rose-500"><LogOut/></button>
        </div>
      </nav>

      <main className="p-8 flex-1 flex flex-col overflow-hidden">
        {activeTab === 'loterie' && (
          <div className="max-w-4xl mx-auto w-full space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900/60 p-8 rounded-[2.5rem] border border-white/5 text-center space-y-4">
                <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Multiplicateur</p>
                <input type="number" value={multiplicateur} onChange={(e) => setMultiplicateur(parseInt(e.target.value))} className="bg-slate-950 border border-white/10 w-20 text-center text-2xl font-black rounded-xl p-2" />
                <p className="text-[8px] text-slate-500 uppercase italic">Actuel: x{multiplicateur}</p>
              </div>

              <div className="md:col-span-2 bg-linear-to-br from-slate-900 to-slate-950 p-8 rounded-[2.5rem] border border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="font-black italic uppercase text-xl">Session Active</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase">{currentTirage ? `Tirage ${currentTirage.moment} en cours...` : "Aucune session ouverte"}</p>
                </div>
                {currentTirage ? (
                  <button onClick={cloreTirage} className="px-8 py-4 bg-rose-500 text-white font-black rounded-2xl uppercase text-[10px] animate-pulse">Clôturer & Payer</button>
                ) : (
                  <Dices className="text-slate-700" size={40} />
                )}
              </div>
            </div>

            {!currentTirage && (
              <div className="grid grid-cols-3 gap-4">
                {['Matin', 'Midi', 'Soir'].map(m => (
                  <button key={m} onClick={() => preparerTirage(m)} className="bg-slate-900 border border-white/5 p-6 rounded-4xl hover:bg-emerald-500 hover:text-slate-950 transition-all group">
                    <Timer className="mx-auto mb-2 opacity-50 group-hover:opacity-100" />
                    <span className="font-black uppercase text-[10px] tracking-widest">{m}</span>
                  </button>
                ))}
              </div>
            )}

            {currentTirage && (
              <div className="bg-slate-900/40 p-10 rounded-[3rem] border border-white/5 text-center">
                <p className="text-[10px] font-black uppercase text-slate-500 mb-6">Chiffre Gagnant (Masqué aux clients)</p>
                <div className="text-7xl font-black italic text-emerald-500 mb-8">{currentTirage.chiffre_gagnant}</div>
                <div className="flex flex-wrap justify-center gap-3">
                  {currentTirage.tous_chiffres.map((c: string, i: number) => (
                    <div key={i} className={`w-12 h-12 rounded-xl flex items-center justify-center font-black border ${c === currentTirage.chiffre_gagnant ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/5 bg-slate-950'}`}>
                      {c}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ... Autres onglets (Chat, Users, Finance) restent identiques ... */}
        {activeTab === 'chat' && (
          <div className="flex h-full gap-6 overflow-hidden animate-in fade-in duration-500">
             <div className="w-1/4 bg-slate-900/50 rounded-[2.5rem] border border-white/5 overflow-y-auto p-4 space-y-2">
                <h3 className="text-[10px] font-black uppercase text-slate-500 mb-4 px-4 tracking-[0.2em]">Clients</h3>
                {profiles.map(p => (
                  <button key={p.id} onClick={() => fetchUserMessages(p.id)} className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${selectedUserChat === p.id ? 'bg-emerald-500 text-slate-950' : 'hover:bg-white/5'}`}>
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-black text-[10px]">{p.phone.slice(-2)}</div>
                        <p className="text-xs font-bold">+{p.phone}</p>
                     </div>
                     {unreadCounts[p.id] > 0 && selectedUserChat !== p.id && (
                        <div className="bg-rose-500 text-white text-[8px] font-black px-2 py-1 rounded-full animate-pulse">{unreadCounts[p.id]}</div>
                     )}
                  </button>
                ))}
             </div>
             
             <div className="flex-1 bg-slate-900/30 rounded-[3rem] border border-white/5 flex flex-col overflow-hidden relative shadow-inner">
                {selectedUserChat ? (
                  <>
                    <div className="p-6 border-b border-white/5 bg-slate-900/50 flex justify-between items-center">
                       <p className="font-black uppercase text-[10px] tracking-widest text-emerald-500">Support : +{profiles.find(p=>p.id===selectedUserChat)?.phone}</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                       {messages.map((m, i) => (
                         <div key={i} className={`flex ${m.is_admin ? 'justify-end' : 'justify-start'}`}>
                           <div className={`max-w-[70%] p-4 rounded-3xl text-xs ${m.is_admin ? 'bg-emerald-500 text-slate-950 font-bold rounded-tr-none' : 'bg-slate-800 text-white rounded-tl-none border border-white/5'}`}>
                              {m.content}
                           </div>
                         </div>
                       ))}
                       <div ref={chatEndRef} />
                    </div>
                    <div className="p-6 bg-slate-950 flex gap-3">
                       <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAdminResponse()} placeholder="Répondre..." className="flex-1 bg-slate-900 border border-white/10 rounded-2xl px-6 py-4 text-xs outline-none focus:border-emerald-500 transition-all" />
                       <button onClick={handleAdminResponse} className="p-4 bg-emerald-500 text-slate-950 rounded-2xl active:scale-95 transition-all"><Send size={20}/></button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-600 italic">Sélectionnez une conversation</div>
                )}
             </div>
          </div>
        )}

        {activeTab === 'users' && (
           <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
             <div className="relative w-full max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Chercher un numéro..." className="w-full bg-slate-900 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm" />
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {profiles.filter(p => p.phone.includes(searchTerm)).map(p => (
                  <div key={p.id} className="bg-slate-900/50 p-6 rounded-[2.5rem] border border-white/5 flex items-center justify-between">
                    <div>
                      <p className="font-black italic text-sm">+{p.phone}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">{p.balance.toLocaleString()} HTG</p>
                    </div>
                    <button onClick={() => fetchUserMessages(p.id)} className="p-3 bg-slate-800 rounded-xl text-slate-400 hover:text-emerald-500"><ImageIcon size={18}/></button>
                  </div>
                ))}
             </div>
           </div>
        )}

        {activeTab === 'finance' && (
           <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500 overflow-y-auto">
              {transactions.map(t => (
                <div key={t.id} className="bg-slate-900/40 p-5 rounded-4xl border border-white/5 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${t.type === 'depot' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}><Activity size={20}/></div>
                      <div>
                        <p className="font-black text-sm">+{t.profiles?.phone}</p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase">{t.type}</p>
                      </div>
                   </div>
                   <div className="text-xl font-black italic">{t.amount.toLocaleString()} HTG</div>
                   <div className="flex gap-2">
                      {t.status === 'en_attente' ? (
                        <button onClick={() => handleTransaction(t.id, 'approuve', t.type, t.user_id, t.amount)} className="px-5 py-3 bg-emerald-500 text-slate-950 font-black rounded-xl uppercase text-[9px]">Valider</button>
                      ) : (
                        <span className={`px-4 py-2 rounded-lg text-[8px] font-black uppercase ${t.status === 'approuve' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>{t.status}</span>
                      )}
                   </div>
                </div>
              ))}
           </div>
        )}
      </main>
    </div>
  );
}