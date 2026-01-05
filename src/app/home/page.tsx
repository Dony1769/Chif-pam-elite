"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Wallet, History, Gamepad2, User, Send, 
  ArrowDownCircle, ArrowUpCircle, MessageCircle, LogOut, 
  X, ShieldAlert
} from 'lucide-react';

export default function ClientHome() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'home' | 'play' | 'history' | 'profile'>('home');
  const [user, setUser] = useState<any>(null);
  const [myBets, setMyBets] = useState<any[]>([]);
  const [pastTirages, setPastTirages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [adminUUID, setAdminUUID] = useState<string | null>(null);
  const [isBanned, setIsBanned] = useState(false);
  
  const [showDepot, setShowDepot] = useState(false);
  const [showRetrait, setShowRetrait] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [selectedNumber, setSelectedNumber] = useState('');
  const [betAmount, setBetAmount] = useState(''); 
  const [nextTirage, setNextTirage] = useState<any>(null);

  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [isAdminTyping, setIsAdminTyping] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Initialisation des données
  useEffect(() => {
    loadAppData();
  }, [activeTab]);

  // 2. Récupération robuste de l'ID Admin
  useEffect(() => {
    const fetchAdminId = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', '99999999@chifpam.ht')
        .maybeSingle();
      
      if (data) {
        setAdminUUID(data.id);
      } else {
        console.error("Admin non trouvé. Vérifiez l'email dans la table profiles.");
      }
    };
    fetchAdminId();
  }, []);

  // 3. Temps Réel & Auto-scroll
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel(`chat:${user.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `receiver_id=eq.${user.id}` 
      }, (payload) => {
        setChatHistory((prev) => [...prev, payload.new]);
        if (!showChat) setUnreadCount(prev => prev + 1);
        setTimeout(scrollToBottom, 100);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, showChat]);

  useEffect(() => {
    if (showChat) {
      fetchMessages();
      setTimeout(scrollToBottom, 200);
    }
  }, [showChat]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const loadAppData = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return router.push('/connexion');

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
    
    if (profile?.is_banned) {
      setIsBanned(true);
      return;
    }

    if (profile) setUser(profile);
    
    const { data: bets } = await supabase.from('bets').select('*').eq('user_id', authUser.id).order('created_at', { ascending: false });
    if (bets) setMyBets(bets);
    
    const { data: tirage } = await supabase.from('tirages').select('*').eq('status', 'futur').order('created_at', { ascending: true }).limit(1).maybeSingle();
    setNextTirage(tirage);
    
    const { data: results } = await supabase.from('tirages').select('*').eq('status', 'publie').order('created_at', { ascending: false }).limit(5);
    if (results) setPastTirages(results);
  };

  const fetchMessages = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: true });
    if (data) setChatHistory(data);
    setUnreadCount(0);
  };

  // 4. FIX: Envoi de message avec vérification et typage strict
  const handleSendMessage = async () => {
    const msg = chatMessage.trim();
    if (!msg || !user) return;
    
    // Si l'adminUUID n'est pas encore là, on tente une dernière fois de le récupérer
    let targetAdminId = adminUUID;
    if (!targetAdminId) {
        const { data } = await supabase.from('profiles').select('id').eq('email', '99999999@chifpam.ht').single();
        if (data) targetAdminId = data.id;
    }

    if (!targetAdminId) return alert("Erreur : Support indisponible (ID Admin introuvable)");

    const newMessage = { 
      sender_id: user.id.toString(), // Cast en string pour le RLS
      content: msg, 
      receiver_id: targetAdminId.toString() 
    };

    // On vide l'input immédiatement pour une sensation de fluidité
    setChatMessage('');

    const { data, error } = await supabase.from('messages').insert([newMessage]).select();
    
    if (error) {
      console.error("Erreur d'envoi:", error.message);
      alert("Impossible d'envoyer le message. Vérifiez votre connexion.");
      setChatMessage(msg); // Restaure le message en cas d'échec
    } else if (data) {
      setChatHistory(prev => [...prev, data[0]]);
      setTimeout(scrollToBottom, 50);
    }
  };

  const handlePlaceBet = async () => {
    if (!nextTirage) return alert("Aucun tirage ouvert.");
    if (selectedNumber.length < 2 || !betAmount || parseFloat(betAmount) < 10) return alert("Mise invalide (min 10 HTG)");
    if (parseFloat(betAmount) > user.balance) return alert("Solde insuffisant");
    
    setLoading(true);
    const newBalance = user.balance - parseFloat(betAmount);
    const { error: balErr } = await supabase.from('profiles').update({ balance: newBalance }).eq('id', user.id);
    
    if (!balErr) {
      await supabase.from('bets').insert([{ 
        user_id: user.id, 
        user_phone: user.phone, 
        number_played: selectedNumber, 
        stake: parseFloat(betAmount), 
        tirage_id: nextTirage.id, 
        status: 'en_attente' 
      }]);
      setUser({ ...user, balance: newBalance });
      setSelectedNumber(''); setBetAmount(''); setActiveTab('history');
    }
    setLoading(false);
  };

  if (isBanned) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-slate-900 border border-rose-500/30 p-10 rounded-[3rem] space-y-6 shadow-2xl shadow-rose-500/10">
          <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
            <ShieldAlert size={40} className="text-rose-500" />
          </div>
          <h2 className="text-2xl font-black uppercase italic text-white tracking-tighter">Accès <span className="text-rose-500">Restreint</span></h2>
          <p className="text-slate-400 text-sm leading-relaxed font-medium">Votre compte a été suspendu. Contactez le support Elite Pam.</p>
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/connexion'))} className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-500 transition-all">Quitter</button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#020617] text-slate-100 font-sans pb-24 overflow-x-hidden">
      {/* HEADER */}
      <div className="p-6 flex justify-between items-center border-b border-white/5 bg-[#020617]/80 backdrop-blur-md sticky top-0 z-60">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg rotate-3 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)]">
            <span className="font-black italic text-xs text-white">CP</span>
          </div>
          <h1 className="font-black italic tracking-tighter text-xl uppercase">Elite <span className="text-emerald-500">Pam</span></h1>
        </div>
        <button onClick={() => setShowChat(true)} className="p-2 bg-slate-900 rounded-full border border-slate-800 text-emerald-400 relative active:scale-90 transition-transform">
          <MessageCircle size={22} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full border-2 border-[#020617] flex items-center justify-center text-[10px] text-white font-bold animate-bounce">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      <div className="p-6 max-w-md mx-auto space-y-8">
        {activeTab === 'home' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-linear-to-br from-emerald-600 to-emerald-900 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
              <p className="text-emerald-100/70 text-[10px] font-black uppercase mb-2">Solde Actuel</p>
              <h2 className="text-5xl font-black text-white mb-6 italic">
                {user?.balance?.toLocaleString() || 0} <span className="text-lg opacity-50">HTG</span>
              </h2>
              <div className="flex gap-3">
                <button onClick={() => setShowDepot(true)} className="flex-1 bg-white/10 py-4 rounded-2xl font-black text-[10px] flex items-center justify-center gap-2 uppercase italic hover:bg-white/20"><ArrowDownCircle size={16} /> Dépôt</button>
                <button onClick={() => setShowRetrait(true)} className="flex-1 bg-black/20 py-4 rounded-2xl font-black text-[10px] flex items-center justify-center gap-2 uppercase italic hover:bg-black/30"><ArrowUpCircle size={16} /> Retrait</button>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl flex justify-between items-center">
              <div>
                <p className="font-black text-sm text-white uppercase italic">{nextTirage?.moment || 'Fermé'}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase italic">Cotes x80</p>
              </div>
              <button onClick={() => setActiveTab('play')} className="bg-emerald-500 text-slate-950 px-6 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform">JOUER</button>
            </div>

            <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Dernières sorties</h3>
                {pastTirages.map((t) => (
                  <div key={t.id} className="bg-slate-900/20 border border-slate-800/50 p-5 rounded-3xl flex justify-between items-center hover:border-slate-700">
                    <p className="text-xs font-bold text-slate-400 uppercase italic">{t.moment} - {new Date(t.date_tirage).toLocaleDateString()}</p>
                    <span className="text-3xl font-black text-white italic">{t.numero_gagnant}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ... PLAY & HISTORY TABS STAY THE SAME AS THEY ARE FUNCTIONAL ... */}
        {activeTab === 'play' && (
           <div className="space-y-6 animate-in fade-in duration-500">
             <div className="text-center space-y-2">
               <h2 className="text-3xl font-black italic uppercase text-white">CHANCE <span className="text-emerald-500">EXTRÊME</span></h2>
             </div>
             <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[3rem] shadow-2xl">
                <div className="text-8xl font-black text-white italic mb-8 bg-[#020617] py-10 rounded-4xl border border-slate-800 flex items-center justify-center shadow-inner">
                   {selectedNumber || <span className="opacity-10 text-6xl">00</span>}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[1,2,3,4,5,6,7,8,9].map(n => (
                    <button key={n} onClick={() => selectedNumber.length < 2 && setSelectedNumber(prev => prev + n)} className="h-16 bg-slate-800/40 rounded-2xl flex items-center justify-center font-black text-xl hover:bg-emerald-500 hover:text-slate-950 transition-all active:scale-90 border border-slate-700/50">{n}</button>
                  ))}
                  <button onClick={() => setSelectedNumber('')} className="bg-rose-500/10 text-rose-500 rounded-2xl font-black text-[10px] uppercase hover:bg-rose-500 hover:text-white transition-colors">Effacer</button>
                  <button onClick={() => selectedNumber.length < 2 && setSelectedNumber(prev => prev + '0')} className="h-16 bg-slate-800/40 rounded-2xl flex items-center justify-center font-black text-xl border border-slate-700/50 hover:bg-emerald-500 hover:text-slate-950 transition-all">0</button>
                  <button className="bg-emerald-500/10 text-emerald-500 rounded-2xl font-black text-[10px] uppercase">Max</button>
                </div>
             </div>
             <div className="space-y-4">
                <div className="relative">
                  <input type="number" placeholder="MONTANT" value={betAmount} onChange={(e) => setBetAmount(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-6 px-6 font-black text-2xl text-center text-emerald-500 outline-none focus:ring-2 focus:ring-emerald-500 transition-all" />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-600 text-xs">HTG</span>
                </div>
                <button onClick={handlePlaceBet} disabled={loading || !nextTirage} className={`w-full py-6 rounded-2xl font-black uppercase tracking-[0.3em] transition-all active:scale-95 ${!nextTirage ? 'bg-slate-800 text-slate-600' : 'bg-emerald-500 text-slate-950 shadow-xl shadow-emerald-500/20 hover:brightness-110'}`}>
                  {loading ? "VÉRIFICATION..." : nextTirage ? "CONFIRMER LE PARI" : "TIRAGE FERMÉ"}
                </button>
             </div>
           </div>
        )}

        {activeTab === 'history' && (
           <div className="space-y-4 animate-in fade-in">
             <h2 className="text-xl font-black italic uppercase text-white">Mes <span className="text-emerald-500">Tickets</span></h2>
             {myBets.length > 0 ? myBets.map((bet) => (
               <div key={bet.id} className="bg-slate-900/40 border border-slate-800 p-5 rounded-3xl flex items-center justify-between hover:border-slate-700 transition-colors">
                 <div className="flex items-center gap-4">
                   <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl border italic shadow-sm ${bet.status === 'gagne' ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'bg-slate-800 text-white border-slate-700'}`}>{bet.number_played}</div>
                   <div>
                     <p className="font-black text-sm text-white">{bet.stake} HTG</p>
                     <p className="text-[10px] text-slate-500 font-bold uppercase">{new Date(bet.created_at).toLocaleDateString()}</p>
                   </div>
                 </div>
                 <div className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase ${bet.status === 'gagne' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>{bet.status}</div>
               </div>
             )) : (
               <div className="text-center py-20 text-slate-600 italic font-bold uppercase text-xs">Aucun pari pour le moment</div>
             )}
           </div>
        )}
      </div>

      {/* MODAL CHAT - OPTIMISÉ POUR L'ENVOI */}
      {showChat && (
        <div className="fixed inset-0 z-100 bg-[#020617] flex flex-col animate-in slide-in-from-right duration-300">
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#020617]/90 backdrop-blur-xl sticky top-0 z-10">
            <button onClick={() => setShowChat(false)} className="p-2 bg-slate-900 rounded-xl hover:bg-slate-800"><X size={20}/></button>
            <div className="flex flex-col items-center">
              <p className="font-black text-xs uppercase italic">Support <span className="text-emerald-500">Elite</span></p>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest">En ligne</p>
              </div>
            </div>
            <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-4 bg-linear-to-b from-[#020617] to-slate-950 scroll-smooth">
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-4 rounded-2xl text-[11px] font-bold shadow-lg ${msg.sender_id === user?.id ? 'bg-emerald-500 text-slate-950 rounded-tr-none' : 'bg-slate-900 border border-slate-800 text-white rounded-tl-none'}`}>
                  {msg.content}
                  <div className="flex justify-end mt-1">
                    <p className={`text-[8px] opacity-40 italic ${msg.sender_id === user?.id ? 'text-slate-950' : 'text-slate-500'}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 bg-slate-900/50 border-t border-white/5 backdrop-blur-md">
            <div className="flex gap-2 max-w-xl mx-auto">
              <input 
                type="text" 
                value={chatMessage} 
                onChange={(e) => setChatMessage(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} 
                placeholder="Message de support..." 
                className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-xs outline-none focus:border-emerald-500 text-white" 
              />
              <button 
                onClick={handleSendMessage} 
                className="bg-emerald-500 text-slate-950 p-4 rounded-2xl active:scale-90 shadow-lg shadow-emerald-500/20 transition-all"
              >
                <Send size={20}/>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NAVBAR */}
      <nav className="fixed bottom-6 left-6 right-6 bg-slate-900/80 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-4 z-50 shadow-2xl">
        <div className="max-w-md mx-auto flex justify-between items-center px-4">
          <NavBtn icon={<Wallet size={20}/>} label="Solde" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <NavBtn icon={<Gamepad2 size={20}/>} label="Jouer" active={activeTab === 'play'} onClick={() => setActiveTab('play')} />
          <NavBtn icon={<History size={20}/>} label="Tickets" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
          <NavBtn icon={<User size={20}/>} label="Moi" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
        </div>
      </nav>
    </main>
  );
}

function NavBtn({ icon, label, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all active:scale-90 ${active ? 'text-emerald-500 scale-110' : 'text-slate-500'}`}>
      {icon}
      <span className="text-[8px] font-black uppercase tracking-tighter">{label}</span>
    </button>
  );
}