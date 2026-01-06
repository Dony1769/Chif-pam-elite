"use client";

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Wallet, History, MessageSquare, Play, User, 
  ArrowUpCircle, ArrowDownCircle, Send, Plus, 
  Bell, Info, Loader2, Target, Zap, Clock
} from 'lucide-react';

// Configuration centralisée
const ADMIN_ID = process.env.NEXT_PUBLIC_ADMIN_ID || '9e141172-93db-4df4-a72b-47b89211b46e';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function ClientHome() {
  const [activeTab, setActiveTab] = useState<'home' | 'play' | 'history' | 'chat' | 'profile'>('home');
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  
  // --- ÉTATS DU JEU ---
  const [activeSession, setActiveSession] = useState<any>(null);
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState('');
  const [isBetting, setIsBetting] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => { initSession(); }, []);
  useEffect(() => { if (activeTab === 'chat') scrollToBottom(); }, [messages, activeTab]);

  const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: "smooth" });

  const showNotify = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const initSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return router.push('/connexion');

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    if (!profile || profile.is_banned) return router.push('/connexion');

    setUser(profile);
    fetchMessages(profile.id);
    fetchActiveSession();
    setupRealtime(profile.id);
    setLoading(false);
  };

  const setupRealtime = (userId: string) => {
    supabase.channel('global-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tirage_sessions' }, () => fetchActiveSession())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` }, (p) => setUser(p.new))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${userId}` }, (p) => setMessages(prev => [...prev, p.new]))
      .subscribe();
  };

  // --- SÉCURITÉ ULTIME : On ne sélectionne JAMAIS 'chiffre_gagnant' ---
  const fetchActiveSession = async () => {
    const { data, error } = await supabase
      .from('tirage_sessions')
      .select('id, moment, tous_chiffres, multiplicateur, status') 
      .eq('status', 'ouvert')
      .maybeSingle();
    
    setActiveSession(data);
  };

  const fetchMessages = async (userId: string) => {
    const { data } = await supabase.from('messages').select('*').or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  // --- LOGIQUE DE MISE (PROVABLY FAIR) ---
  const handlePlaceBet = async () => {
    if (!selectedNumber || !betAmount || !user || !activeSession) return;
    const amount = parseFloat(betAmount);
    if (amount > user.balance) return showNotify("Solde insuffisant", "error");
    if (amount < 10) return showNotify("Minimum 10 HTG", "error");

    setIsBetting(true);
    try {
      // 1. Déduction solde via RPC sécurisé
      const { error: balanceError } = await supabase.rpc('increment_balance', { user_id: user.id, amount: -amount });
      if (balanceError) throw balanceError;
      
      // 2. Création de la mise
      const { error: miseError } = await supabase.from('mises').insert([{
        user_id: user.id,
        tirage_id: activeSession.id,
        chiffre_choisi: selectedNumber,
        montant_mise: amount,
        gain_potentiel: amount * activeSession.multiplicateur,
        status: 'en_attente'
      }]);

      if (miseError) throw miseError;

      showNotify(`Mise de ${amount} HTG placée sur le ${selectedNumber} !`);
      setBetAmount('');
      setSelectedNumber(null);
    } catch (e: any) {
      showNotify("Erreur transactionnelle", "error");
    } finally {
      setIsBetting(false);
    }
  };

  // --- CALCULATOR ENGINE ---
  const addDigit = (digit: string) => {
    if (betAmount.length >= 7) return; // Limite de sécurité
    setBetAmount(prev => prev + digit);
  };
  const clearDigit = () => setBetAmount('');

  // --- CHAT & DEPOT ---
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;
    const msg = { content: newMessage, sender_id: user.id, receiver_id: ADMIN_ID, is_admin: false };
    const { error } = await supabase.from('messages').insert([msg]);
    if (!error) { setMessages(prev => [...prev, { ...msg, created_at: new Date().toISOString() }]); setNewMessage(''); }
  };

  const handleDepot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > MAX_FILE_SIZE) return showNotify("5MB Max", "error");

    setUploading(true);
    const fileName = `${user.id}/${Date.now()}.${file.name.split('.').pop()}`;
    const { error: upErr } = await supabase.storage.from('transactions').upload(fileName, file);
    
    if (upErr) { setUploading(false); return showNotify("Échec upload", "error"); }

    const { data: { publicUrl } } = supabase.storage.from('transactions').getPublicUrl(fileName);
    const amount = prompt("Montant HTG déposé :");
    
    if (amount && !isNaN(Number(amount))) {
      await supabase.from('transactions').insert([{ user_id: user.id, amount: Number(amount), type: 'depot', image_url: publicUrl, status: 'en_attente' }]);
      showNotify("Dépôt en cours de révision");
    } else {
      await supabase.storage.from('transactions').remove([fileName]);
      showNotify("Dépôt annulé", "error");
    }
    setUploading(false);
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center text-emerald-500 font-black tracking-[0.4em] text-xs">ELITE PAM</div>;

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden">
      {notification && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-100 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in zoom-in duration-300 ${notification.type === 'error' ? 'bg-rose-500' : 'bg-emerald-500'}`}>
          <Info size={16} />
          <span className="text-[10px] font-black uppercase tracking-widest">{notification.msg}</span>
        </div>
      )}

      <main className="max-w-md mx-auto p-4 pb-32">
        {/* HEADER */}
        <header className="flex justify-between items-center mb-8 bg-slate-900/40 p-5 rounded-[2.5rem] border border-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">{user?.phone.slice(-2)}</div>
            <div>
              <p className="text-[8px] text-slate-500 font-black uppercase tracking-[0.2em]">Membre Elite</p>
              <p className="font-black italic text-lg">+{user?.phone}</p>
            </div>
          </div>
          <button className="p-3 bg-slate-800/50 rounded-xl text-slate-400 border border-white/5"><Bell size={20}/></button>
        </header>

        {/* CONTENU DYNAMIQUE DES ONGLETS */}
        {activeTab === 'home' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-linear-to-br from-slate-800 to-[#0f172a] p-8 rounded-[2.5rem] border border-white/10 relative overflow-hidden shadow-2xl">
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase text-emerald-500 mb-2 tracking-widest">Solde Actuel</p>
                <h2 className="text-5xl font-black italic tracking-tighter">{user?.balance?.toLocaleString()} <span className="text-xl text-slate-500 font-medium">HTG</span></h2>
              </div>
              <Wallet className="absolute -right-10 -bottom-10 opacity-5 w-40 h-40" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col items-center justify-center bg-emerald-500 p-8 rounded-[2.5rem] text-slate-950 cursor-pointer shadow-lg shadow-emerald-500/10 active:scale-95 transition-all">
                {uploading ? <Loader2 className="animate-spin" size={32}/> : <Plus size={32} />}
                <span className="text-[10px] font-black uppercase mt-3 tracking-widest">Dépôt</span>
                <input type="file" className="hidden" accept="image/*" disabled={uploading} onChange={handleDepot} />
              </label>
              <button onClick={() => setActiveTab('history')} className="flex flex-col items-center justify-center bg-slate-900 border border-white/5 p-8 rounded-[2.5rem] active:scale-95 transition-all">
                <ArrowUpCircle size={32} className="text-rose-500" />
                <span className="text-[10px] font-black uppercase mt-3 tracking-widest">Retrait</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'play' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-500">
            {activeSession ? (
              <>
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-2 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">
                    <Zap size={14} className="text-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-black uppercase text-emerald-500 tracking-widest">{activeSession.moment} • x{activeSession.multiplicateur}</span>
                  </div>
                  <h2 className="text-xl font-black italic uppercase tracking-tight">Le Rideau de Fumée</h2>
                  <p className="text-[9px] text-slate-500 uppercase font-bold">Un seul chiffre est gagnant. Lequel ?</p>
                </div>

                <div className="grid grid-cols-5 gap-3">
                  {activeSession.tous_chiffres.map((num: string) => (
                    <button
                      key={num}
                      onClick={() => setSelectedNumber(num)}
                      className={`h-14 rounded-2xl font-black text-lg transition-all duration-300 border ${
                        selectedNumber === num 
                        ? 'bg-emerald-500 border-emerald-400 text-slate-950 scale-110 shadow-[0_0_20px_rgba(16,185,129,0.3)]' 
                        : 'bg-slate-900/50 border-white/5 text-slate-400 hover:border-emerald-500/30'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>

                <div className="bg-slate-900/60 p-6 rounded-[2.5rem] border border-white/10 backdrop-blur-xl shadow-inner">
                  <div className="flex justify-between items-center mb-6 px-2">
                    <span className="text-[10px] font-black uppercase text-slate-500">Mise (HTG)</span>
                    <span className="text-2xl font-black text-emerald-500 italic">{betAmount || '0'}</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 mb-6">
                    {['1','2','3','4','5','6','7','8','9','0','00','CLR'].map(btn => (
                      <button
                        key={btn}
                        onClick={() => btn === 'CLR' ? clearDigit() : addDigit(btn)}
                        className={`h-12 rounded-xl font-black text-xs transition-all ${btn === 'CLR' ? 'text-rose-500 bg-rose-500/10' : 'bg-white/5 hover:bg-white/10'}`}
                      >
                        {btn}
                      </button>
                    ))}
                  </div>

                  <button
                    disabled={!selectedNumber || !betAmount || isBetting}
                    onClick={handlePlaceBet}
                    className="w-full py-5 bg-emerald-500 text-slate-950 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-lg shadow-emerald-500/20 disabled:opacity-30 transition-all active:scale-95"
                  >
                    {isBetting ? 'Validation...' : 'Placer la Mise'}
                  </button>
                </div>
              </>
            ) : (
              <div className="py-24 text-center space-y-4 bg-slate-900/20 rounded-[3rem] border border-dashed border-white/5">
                <Clock className="mx-auto text-slate-700 animate-spin-slow" size={40} />
                <p className="text-[10px] font-black uppercase text-slate-600 tracking-widest">En attente du prochain tirage</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="h-[65vh] flex flex-col bg-slate-900/30 rounded-[2.5rem] border border-white/5 overflow-hidden animate-in slide-in-from-right duration-500">
             <div className="p-5 border-b border-white/5 bg-slate-900/50 flex items-center gap-3">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Support Elite Pam</p>
             </div>
             <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.is_admin ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[85%] p-4 rounded-3xl text-xs ${m.is_admin ? 'bg-slate-800 text-white rounded-tl-none' : 'bg-emerald-500 text-slate-950 rounded-tr-none font-bold shadow-lg shadow-emerald-500/10'}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
             </div>
             <div className="p-4 bg-slate-950/50 flex gap-2">
                <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Écrire..." className="flex-1 bg-slate-900 border border-white/5 rounded-2xl px-5 text-xs outline-none focus:border-emerald-500 transition-all" />
                <button onClick={handleSendMessage} className="p-4 bg-emerald-500 text-slate-950 rounded-2xl active:scale-90 transition-all"><Send size={18}/></button>
             </div>
          </div>
        )}
      </main>

      {/* NAVBAR */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-md bg-slate-900/80 backdrop-blur-2xl border border-white/10 h-20 rounded-[2.5rem] flex items-center justify-around px-2 z-50 shadow-2xl">
        {[
          { id: 'home', icon: Wallet },
          { id: 'play', icon: Target },
          { id: 'chat', icon: MessageSquare },
          { id: 'history', icon: History },
          { id: 'profile', icon: User },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={`p-4 rounded-2xl transition-all duration-300 ${activeTab === item.id ? 'bg-emerald-500 text-slate-950 scale-110 shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-white'}`}
          >
            <item.icon size={20} strokeWidth={activeTab === item.id ? 3 : 2} />
          </button>
        ))}
      </nav>
    </div>
  );
}