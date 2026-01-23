'use client'
import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Send, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function ClientChat() {
  const [messages, setMessages] = useState<any[]>([])
  const [text, setText] = useState('')
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  // Utilisation d'une ref pour accéder à l'ID utilisateur dans les callbacks real-time
  const userIdRef = useRef<string | null>(null)

  // FONCTION : Marquer tous les messages admin comme lus
  const markAsRead = async (uid: string) => {
    const { error } = await supabase
      .from('messages')
      .update({ is_read_by_client: true })
      .eq('user_id', uid)
      .eq('is_admin_message', true)
      .eq('is_read_by_client', false) // Uniquement ceux qui ne sont pas encore lus
    
    if (error) console.error("Erreur markAsRead:", error)
  }

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        const uid = session.user.id
        setUser(session.user)
        userIdRef.current = uid

        // 1. On récupère les messages et on marque comme lu en PARALLÈLE (Vitesse max)
        await Promise.all([
          fetchMessages(uid),
          markAsRead(uid)
        ])
        
        setLoading(false)

        // 2. ABONNEMENT TEMPS RÉEL "ULTRA"
        const channel = supabase
          .channel(`chat_client_${uid}`)
          .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages',
            filter: `user_id=eq.${uid}` 
          }, (payload) => {
            // Ajout immédiat du message dans la liste (UI)
            setMessages(prev => [payload.new, ...prev])

            // Si le nouveau message vient de l'ADMIN, on le marque comme LU instantanément
            if (payload.new.is_admin_message) {
              markAsRead(uid)
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
    
    const msgContent = text
    setText('') // Optimistic Clear : on vide l'input avant l'envoi

    // Insertion DB
    const { error } = await supabase.from('messages').insert({ 
      content: msgContent, 
      user_id: user.id, 
      is_admin_message: false,
      is_read_by_admin: false, // L'admin doit voir une alerte
      is_read_by_client: true  // Le client vient de l'écrire, donc il l'a "lu"
    })

    if (error) {
      console.error("Erreur envoi:", error)
      setText(msgContent) // On remet le texte si ça échoue
    }
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white p-4 flex flex-col items-center font-sans">
      <div className="w-full max-w-md flex flex-col h-[94vh]">
        
        {/* Header Chif-Pam Style */}
        <div className="flex items-center gap-4 mb-6 bg-slate-900/40 p-5 rounded-[2.5rem] border border-white/5 backdrop-blur-2xl shadow-2xl">
          <Link href="/client/home" className="p-3 bg-slate-950 rounded-2xl hover:text-emerald-500 transition-all border border-white/5 active:scale-90">
            <ArrowLeft size={20}/>
          </Link>
          <div className="flex-1">
            <h2 className="font-black italic uppercase text-xs tracking-[0.2em]">Support <span className="text-emerald-500">Chif-Pam</span></h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]" />
              <span className="text-[10px] text-emerald-500/70 uppercase font-black tracking-widest">Ligne Directe</span>
            </div>
          </div>
        </div>

        {/* Input en haut (Flush Top) */}
        <form onSubmit={send} className="mb-6 relative group">
          <input 
            value={text} 
            onChange={(e) => setText(e.target.value)}
            placeholder="Écris ton message ici..."
            className="w-full bg-slate-900/50 border border-white/10 p-5 rounded-[2rem] outline-none focus:border-emerald-500/50 transition-all font-bold placeholder:text-slate-700 pr-16 backdrop-blur-md"
          />
          <button 
            type="submit" 
            disabled={!text.trim()}
            className="absolute right-2 top-2 bottom-2 px-5 bg-emerald-500 rounded-2xl text-slate-950 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale transition-all shadow-lg"
          >
            <Send size={18} />
          </button>
        </form>

        {/* Liste des messages (Flux descendant) */}
        <div className="flex-1 overflow-y-auto space-y-4 px-2 custom-scrollbar pb-10">
          {loading ? (
            <div className="flex justify-center mt-10"><Loader2 className="animate-spin text-emerald-500" /></div>
          ) : (
            messages.map((m) => (
              <div 
                key={m.id} 
                className={`flex ${m.is_admin_message ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-top-2 duration-300`}
              >
                <div className={`max-w-[85%] p-4 rounded-[1.8rem] text-sm font-bold shadow-xl border ${
                  m.is_admin_message 
                  ? 'bg-slate-900 border-white/5 text-emerald-50 rounded-tl-none' 
                  : 'bg-emerald-500 border-emerald-400 text-slate-950 rounded-tr-none shadow-emerald-500/10'
                }`}>
                  {m.content}
                  <div className={`text-[8px] mt-1 opacity-50 font-black uppercase tracking-tighter flex items-center gap-1 ${m.is_admin_message ? 'justify-start' : 'justify-end'}`}>
                      {new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
              </div>
            ))
          )}
          
          {!loading && messages.length === 0 && (
            <div className="text-center py-20 opacity-20 italic font-black text-xs uppercase tracking-widest">
              Aucun message. Pose ta question !
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

