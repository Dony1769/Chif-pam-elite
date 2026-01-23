'use client'
import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Send, ArrowLeft, Loader2, CheckCheck } from 'lucide-react'
import Link from 'next/link'

export default function ClientChat() {
  const [messages, setMessages] = useState<any[]>([])
  const [text, setText] = useState('')
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // FONCTION CRUCIALE : Marque tout comme lu pour ce client
  const markAllAsRead = async (userId: string) => {
    const { error } = await supabase
      .from('messages')
      .update({ is_read_by_client: true })
      .eq('user_id', userId)
      .eq('is_admin_message', true)
      .eq('is_read_by_client', false) // Uniquement ceux qui ne sont pas encore lus
    
    if (error) console.error("Erreur lecture:", error)
  }

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        const currentUser = session.user
        setUser(currentUser)
        
        // 1. Charger les messages existants
        await fetchMessages(currentUser.id)
        
        // 2. IMMEDIATEMENT : Passer tout en "lu" dès l'entrée sur la page
        await markAllAsRead(currentUser.id)
        
        setLoading(false)

        // 3. REALTIME : Écouteur ultra-réactif
        const channel = supabase.channel(`chat_client_${currentUser.id}`)
          .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages',
            filter: `user_id=eq.${currentUser.id}` 
          }, (payload) => {
            // Ajouter le message à la liste
            setMessages(prev => [payload.new, ...prev])

            // Si le message vient de l'ADMIN, on le marque comme lu INSTANTANÉMENT
            if (payload.new.is_admin_message) {
              markAllAsRead(currentUser.id)
            }
          })
          .subscribe()

        return () => { supabase.removeChannel(channel) }
      }
    }
    init()
  }, [])

  const fetchMessages = async (uid: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
    if (data) setMessages(data)
  }

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || !user) return
    const msg = text; setText('')
    
    // Insertion avec statut par défaut
    await supabase.from('messages').insert({ 
        content: msg, 
        user_id: user.id, 
        is_admin_message: false,
        is_read_by_admin: false,
        is_read_by_client: true // Le client l'a forcément lu puisqu'il l'envoie
    })
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white p-4 flex flex-col items-center font-sans">
      <div className="w-full max-w-md flex flex-col h-[92vh]">
        
        {/* Header Style Chif-Pam */}
        <div className="flex items-center gap-4 mb-6 bg-slate-900/40 p-5 rounded-[2.5rem] border border-white/5 backdrop-blur-2xl shadow-2xl">
          <Link href="/client/home" className="p-3 bg-slate-950 rounded-2xl hover:text-emerald-500 transition-all border border-white/5">
            <ArrowLeft size={20}/>
          </Link>
          <div className="flex-1">
            <h2 className="font-black italic uppercase text-xs tracking-[0.2em]">Support <span className="text-emerald-500">Chif-Pam</span></h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]" />
              <span className="text-[10px] text-emerald-500/70 uppercase font-black tracking-widest text-glow">En direct</span>
            </div>
          </div>
          {/* Bouton de secours "Tout marquer comme lu" (optionnel mais propre) */}
          <button 
            onClick={() => user && markAllAsRead(user.id)}
            className="p-2 text-slate-500 hover:text-emerald-500 transition-colors"
            title="Marquer tout comme lu"
          >
            <CheckCheck size={18} />
          </button>
        </div>

        {/* Formulaire en haut */}
        <form onSubmit={send} className="mb-6 relative group">
          <input 
            value={text} onChange={(e) => setText(e.target.value)}
            placeholder="Écris ton message ici..."
            className="w-full bg-slate-900/50 border border-white/10 p-5 rounded-[2rem] outline-none focus:border-emerald-500/50 transition-all font-bold placeholder:text-slate-700 pr-16 backdrop-blur-md"
          />
          <button type="submit" className="absolute right-2 top-2 bottom-2 px-5 bg-emerald-500 rounded-2xl text-slate-950 hover:scale-105 active:scale-95 transition-all shadow-lg">
            <Send size={18} />
          </button>
        </form>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 px-2 custom-scrollbar pb-10 flex flex-col">
          {loading ? (
            <div className="flex justify-center mt-10"><Loader2 className="animate-spin text-emerald-500" /></div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.is_admin_message ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-top-2 duration-300`}>
                <div className={`max-w-[85%] p-4 rounded-[1.8rem] text-sm font-bold shadow-xl border ${
                  m.is_admin_message 
                  ? 'bg-slate-900 border-white/5 text-emerald-50 rounded-tl-none' 
                  : 'bg-emerald-500 border-emerald-400 text-slate-950 rounded-tr-none'
                }`}>
                  {m.content}
                  <div className="flex items-center justify-between gap-4 mt-1">
                    <p className="text-[8px] opacity-50 font-black uppercase tracking-tighter">
                        {new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                    {!m.is_admin_message && (
                       <CheckCheck size={10} className={m.is_read_by_admin ? "text-blue-400" : "text-slate-900/40"} />
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  )
}
