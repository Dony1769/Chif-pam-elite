"use client";

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Users, ShieldCheck, LogOut, CreditCard, Check, X, 
  MessageSquare, Send, Phone, Trash2, Ban, UserCheck,
  ArrowDownCircle, ArrowUpCircle, Target, Search
} from 'lucide-react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'users' | 'demandes' | 'tirages' | 'chat'>('users');
  const [profiles, setProfiles] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedUserChat, setSelectedUserChat] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // 1. Initialisation
  useEffect(() => { checkAdmin(); }, []);

  // 2. Auto-scroll fluide
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, selectedUserChat]);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== '99999999@chifpam.ht') return router.push('/connexion');
    setAdminUser(user);
    fetchData();
  };

  const fetchData = async () => {
    setLoading(true);
    const { data: profs } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    const { data: trans } = await supabase.from('transactions').select(`*, profiles(phone, balance)`).order('created_at', { ascending: false });
    const { data: msgs } = await supabase.from('messages').select('*').order('created_at', { ascending: true });
    
    setProfiles(profs || []);
    setTransactions(trans || []);
    setMessages(msgs || []);
    setLoading(false);
  };

  // 3. Gestion du Temps Réel
  useEffect(() => {
    const channel = supabase
      .channel('admin-global-sync')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // 4. Signal "En train d'écrire" (Broadcast)
  const handleTyping = () => {
    if (!selectedUserChat || !adminUser) return;
    
    supabase.channel(`chat:${selectedUserChat.id}`).send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: adminUser.id, isTyping: true }
    });
  };

  const sendMessage = async () => {
    if (!replyText.trim() || !selectedUserChat || !adminUser) return;
    
    const textToSend = replyText.trim();
    setReplyText(''); // Clear immédiat pour fluidité

    const { data, error } = await supabase.from('messages').insert([{
      sender_id: adminUser.id,
      receiver_id: selectedUserChat.id,
      content: textToSend
    }]).select();

    if (!error && data) {
      // Signal à l'utilisateur qu'on a fini d'écrire
      supabase.channel(`chat:${selectedUserChat.id}`).send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: adminUser.id, isTyping: false }
      });
    }
  };

  const deleteConversation = async (userId: string) => {
    if (!window.confirm("Supprimer définitivement toute la conversation ?")) return;
    const { error } = await supabase
      .from('messages')
      .delete()
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
    
    if (!error) {
      setMessages(prev => prev.filter(m => m.sender_id !== userId && m.receiver_id !== userId));
    }
  };

  const toggleBanUser = async (user: any) => {
    const newStatus = !user.is_banned;
    if (!window.confirm(`${newStatus ? 'Bannir' : 'Débannir'} l'utilisateur +${user.phone} ?`)) return;
    
    const { error } = await supabase.from('profiles').update({ is_banned: newStatus }).eq('id', user.id);
    if (!error) {
      setProfiles(profiles.map(p => p.id === user.id ? {...p, is_banned: newStatus} : p));
    }
  };

  // --- LOGIQUE DE FILTRE ---
  const currentChatMessages = messages.filter(m => 
    (m.sender_id === adminUser?.id && m.receiver_id === selectedUserChat?.id) ||
    (m.sender_id === selectedUserChat?.id && m.receiver_id === adminUser?.id)
  );

  const filteredProfiles = profiles.filter(p => 
    p.phone.includes(searchTerm) && p.email !== '99999999@chifpam.ht'
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans p-4 md:p-8">
      {/* HEADER */}
      <header className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-6 mb-8 bg-slate-900/40 p-6 rounded-[2.5rem] border border-slate-800 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-500 p-3 rounded-2xl shadow-lg shadow-emerald-500/20">
            <ShieldCheck size={28} className="text-slate-950" />
          </div>
          <div>
            <h1 className="text-xl font-black italic uppercase tracking-tighter">Elite <span className="text-emerald-500">Control</span></h1>
            <p className="text-[8px] font-bold text-slate-500 tracking-[0.3em] uppercase">Administrator Space</p>
          </div>
        </div>

        <nav className="flex bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 flex-wrap justify-center gap-1">
          {[
            { id: 'users', label: 'Membres', icon: Users },
            { id: 'demandes', label: 'Finance', icon: CreditCard },
            { id: 'chat', label: 'Messages', icon: MessageSquare },
          ].map((tab) => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id as any)} 
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-white'}`}
            >
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </nav>
        
        <button onClick={() => { supabase.auth.signOut(); router.push('/connexion'); }} className="p-4 bg-rose-500/10 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all group">
          <LogOut size={20} className="group-hover:rotate-180 transition-transform duration-500" />
        </button>
      </header>

      <main className="max-w-7xl mx-auto">
        
        {/* ONGLET MEMBRES */}
        {activeTab === 'users' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center px-4">
              <h2 className="text-2xl font-black italic uppercase">Gestion <span className="text-emerald-500">Membres</span></h2>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input 
                  type="text" placeholder="Rechercher un numéro..." 
                  className="bg-slate-900 border border-slate-800 rounded-2xl py-3 pl-12 pr-6 text-xs outline-none focus:border-emerald-500 w-64 text-white"
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProfiles.map((p) => (
                <div key={p.id} className={`bg-slate-900/40 border ${p.is_banned ? 'border-rose-500/30' : 'border-slate-800'} p-6 rounded-4xl flex flex-col gap-4 relative overflow-hidden group`}>
                  {p.is_banned && <div className="absolute top-0 right-0 bg-rose-500 text-[8px] font-black px-4 py-1 rounded-bl-xl uppercase">Compte Suspendu</div>}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center font-black text-emerald-500 text-xl italic">{p.phone.slice(-2)}</div>
                    <div>
                      <p className="font-black text-lg">+{p.phone}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase italic">Solde: {p.balance?.toLocaleString()} HTG</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button 
                      onClick={() => { setSelectedUserChat(p); setActiveTab('chat'); }}
                      className="flex-1 bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 py-3 rounded-xl font-black text-[9px] uppercase transition-all flex items-center justify-center gap-2"
                    >
                      <MessageSquare size={14} /> Chat
                    </button>
                    <button 
                      onClick={() => toggleBanUser(p)}
                      className={`p-3 rounded-xl transition-all ${p.is_banned ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white'}`}
                    >
                      {p.is_banned ? <UserCheck size={18} /> : <Ban size={18} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ONGLET CHAT (STYLE WHATSAPP PREMIUM) */}
        {activeTab === 'chat' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[78vh] animate-in fade-in">
            <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] overflow-hidden flex flex-col backdrop-blur-md">
              <div className="p-6 border-b border-white/5 bg-slate-900/20 flex justify-between items-center">
                <h3 className="font-black text-xs uppercase text-emerald-500 tracking-tighter">Utilisateurs</h3>
                <span className="bg-slate-800 text-[10px] px-3 py-1 rounded-full font-black text-white">{filteredProfiles.length}</span>
              </div>
              <div className="overflow-y-auto flex-1 p-4 space-y-2">
                {filteredProfiles.map(p => (
                  <button 
                    key={p.id} onClick={() => setSelectedUserChat(p)} 
                    className={`w-full p-4 rounded-3xl flex items-center gap-4 transition-all relative ${selectedUserChat?.id === p.id ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' : 'bg-slate-950/50 hover:bg-slate-800'}`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-[12px] italic ${selectedUserChat?.id === p.id ? 'bg-slate-950 text-white' : 'bg-slate-800 text-emerald-500'}`}>
                      {p.phone.slice(-2)}
                    </div>
                    <div className="text-left flex-1 overflow-hidden">
                      <p className="font-black text-xs">+{p.phone}</p>
                      <p className={`text-[9px] truncate opacity-60 font-bold ${selectedUserChat?.id === p.id ? 'text-slate-900' : 'text-slate-400'}`}>
                        {p.is_banned ? "Compte banni" : "Ouvrir la discussion..."}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 rounded-[2.5rem] flex flex-col overflow-hidden relative backdrop-blur-md shadow-2xl">
              {selectedUserChat ? (
                <>
                  <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/60 backdrop-blur-md z-10">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-500/20 text-emerald-500 rounded-2xl flex items-center justify-center"><Phone size={20} /></div>
                      <div>
                        <p className="font-black uppercase text-sm tracking-tight">Client : +{selectedUserChat.phone}</p>
                        <p className="text-[10px] font-bold text-emerald-500 flex items-center gap-1.5 animate-pulse">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Session Active
                        </p>
                      </div>
                    </div>
                    <button onClick={() => deleteConversation(selectedUserChat.id)} className="p-3 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={18} /></button>
                  </div>

                  <div ref={scrollRef} className="flex-1 p-8 overflow-y-auto space-y-6 bg-[#020617]/40">
                    {currentChatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.sender_id === adminUser?.id ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] group relative`}>
                          <div className={`p-4 rounded-[1.8rem] text-[11px] font-bold shadow-xl leading-relaxed ${
                            msg.sender_id === adminUser?.id ? 'bg-emerald-500 text-slate-950 rounded-tr-none' : 'bg-slate-800 text-white border border-slate-700 rounded-tl-none'
                          }`}>
                            {msg.content}
                          </div>
                          <p className={`text-[8px] mt-2 font-black uppercase tracking-tighter opacity-40 ${msg.sender_id === adminUser?.id ? 'text-right' : 'text-left'}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-6 bg-slate-950/80 border-t border-white/5 backdrop-blur-xl">
                    <div className="flex gap-3 max-w-4xl mx-auto">
                      <input 
                        type="text" value={replyText} 
                        onChange={(e) => { setReplyText(e.target.value); handleTyping(); }}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Tapez votre réponse..." 
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:border-emerald-500 transition-all text-white" 
                      />
                      <button onClick={sendMessage} disabled={!replyText.trim()} className="bg-emerald-500 text-slate-950 px-8 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"><Send size={20}/></button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-600 italic">
                  <div className="w-24 h-24 bg-slate-900/50 rounded-[2.5rem] flex items-center justify-center mb-6 border border-slate-800 opacity-20"><MessageSquare size={40} /></div>
                  <p className="font-black text-[10px] uppercase tracking-[0.2em]">Aucun utilisateur sélectionné</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* FINANCE (SIMPLIFIÉ) */}
        {activeTab === 'demandes' && (
          <div className="space-y-6 animate-in fade-in">
             <h2 className="text-2xl font-black italic uppercase px-4 text-emerald-500">Flux Financier</h2>
             <div className="grid grid-cols-1 gap-3">
                {transactions.filter(t => t.status === 'en_attente').map((t) => (
                    <div key={t.id} className="bg-slate-900/40 border border-slate-800 p-6 rounded-4xl flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center">
                                {t.type === 'depot' ? <ArrowDownCircle size={24}/> : <ArrowUpCircle size={24}/>}
                            </div>
                            <div>
                                <p className="font-black text-lg">+{t.profiles?.phone}</p>
                                <p className="text-[9px] text-slate-500 font-bold uppercase">{t.method} • {new Date(t.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <p className="text-2xl font-black italic text-white">{t.amount?.toLocaleString()} <span className="text-emerald-500 text-sm">HTG</span></p>
                        <button className="px-8 py-3 bg-emerald-500 text-slate-950 font-black text-[10px] uppercase rounded-xl hover:brightness-110 transition-all shadow-lg shadow-emerald-500/20">Valider</button>
                    </div>
                ))}
             </div>
          </div>
        )}

      </main>
    </div>
  );
}