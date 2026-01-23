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
  const [isSending, setIsSending] = useState(false)

  // Utilisation d'une ref pour toujours avoir l'ID utilisateur à jour dans les callbacks
  const userIdRef = useRef<string | null>(null)

  // FONCTION MAGIQUE : Marque comme lu instantanément
  const markAsRead = async () => {
    if (!userIdRef.current) return
    
    await supabase.from('messages')
      .update({ is_read_by_client: true })
      .eq('user_id', userIdRef.current)
      .eq('is_admin_message', true)
      .eq('is_read_by_client', false) // On ne met à jour que ce qui ne l'est pas
  }

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const uid = session.user.id
        setUser(session.user)
        userIdRef.current = uid
        
        await fetchMessages(uid)
        await markAsRead() // Lecture immédiate à l'entrée
        setLoading(false)

        // REALTIME ULTRA RÉACTIF
        const channel = supabase
          .channel(`chat:${uid}`)
          .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages',
            filter: `user_id=eq.${uid}` 
          }, (payload) => {
            setMessages(prev => [payload.new, ...prev])
            
            // Si c'est l'admin qui parle, on marque comme lu DIRECTEMENT
            if (payload.new.is_admin_message) {
              markAsRead()
            }
          })
          .subscribe()

        // Si l'utilisateur revient sur l'onglet (comme WhatsApp), on marque comme lu
        window.addEventListener('focus', markAsRead)

        return () => {
          supabase.removeChannel(channel)
          window.removeEventListener('focus', markAsRead)
        }
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
    if (!text.trim() || !user || isSending) return
    
    const msg = text
    setText('')
    setIsSending(true)

    const { error } = await supabase.from('messages').insert({ 
      content: msg, 
      user_id: user.id, 
      is_admin_message: false,
      is_read_by_admin: false, // L'admin ne l'a pas encore lu
      is_read_by_client: true  // Le client vient de l'écrire, donc il l'a "lu"
    })

    if (error) {
      console.error(error)
      setText(msg) // On remet le texte si ça échoue
    }
    setIsSending(false)
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans p-4 flex flex-col items-center">
      <div className="w-full max-w-md flex flex-col h-[92vh]">
        
        {/* Header Dynamique */}
        <div className="flex items-center gap-4 mb-6 bg-slate-900/50 p-4 rounded-[2.5rem] border border-white/5 backdrop-blur-xl shadow-2xl">
          <Link href="/client/home" className="p-3 bg-slate-950 rounded-2xl hover:text-emerald-500 transition-all border border-white/5">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h2 className="font-black italic uppercase text-xs tracking-widest">Support <span className="text-emerald-500">Chif-Pam</span></h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
              <span className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">Réponse en temps réel</span>
            </div>
          </div>
        </div>

        {/* Formulaire stylé (WhatsApp Style) */}
        <form onSubmit={send} className="mb-6 relative group">
          <input 
            value={text} 
            onChange={(e) => setText(e.target.value)}
            placeholder="Écris ton message..."
            className="w-full bg-slate-900/80 border border-white/10 p-5 rounded-[2rem] outline-none focus:border-emerald-500/50 transition-all font-bold placeholder:text-slate-700 pr-16 backdrop-blur-md"
          />
          <button 
            type="submit" 
            disabled={isSending}
            className="absolute right-2 top-2 bottom-2 px-5 bg-emerald-500 rounded-2xl text-slate-950 hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-50"
          >
            {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        </form>

        {/* Liste des Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 px-2 custom-scrollbar pb-6">
          {loading ? (
            <div className="flex justify-center pt-10"><Loader2 className="animate-spin text-emerald-500" /></div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.is_admin_message ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-top-2 duration-300`}>
                <div className={`max-w-[85%] p-4 rounded-[1.8rem] text-sm font-bold shadow-xl border ${
                  m.is_admin_message 
                  ? 'bg-slate-900 border-white/5 text-emerald-50 rounded-tl-none' 
                  : 'bg-emerald-500 border-emerald-400 text-slate-950 rounded-tr-none'
                }`}>
                  {m.content}
                  
                  <div className="flex items-center justify-end gap-1 mt-1 opacity-50">
                    <p className="text-[8px] font-black uppercase">
                      {new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                    {!m.is_admin_message && (
                      <CheckCheck size={10} className={m.is_read_by_admin ? "text-blue-500" : "text-slate-900"} />
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
