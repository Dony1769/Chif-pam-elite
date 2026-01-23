'use client'
import React, { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { User, MessageSquare, Bell } from 'lucide-react'

export default function AdminChat() {
  const [users, setUsers] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [reply, setReply] = useState('')

  // 1. Initialisation : Charger les profils et leurs derniers messages
  useEffect(() => {
    const fetchInitialData = async () => {
      // On récupère les profils
      const { data: profiles } = await supabase.from('profiles').select('*').neq('role', 'admin')
      
      if (profiles) {
        // Pour chaque profil, on va chercher le compte de messages non lus et le dernier message
        const usersWithStats = await Promise.all(profiles.map(async (u) => {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', u.id)
            .eq('is_read', false)
            .eq('is_admin_message', false)

          const { data: lastMsg } = await supabase
            .from('messages')
            .select('created_at')
            .eq('user_id', u.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          return { ...u, unread_count: count || 0, last_message_at: lastMsg?.created_at || u.created_at }
        }))
        setUsers(usersWithStats)
      }
    }
    fetchInitialData()

    // --- ÉCOUTEUR GLOBAL (Pour la barre latérale) ---
    const globalSub = supabase.channel('global-admin-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const newMsg = payload.new
        
        setUsers(currentUsers => {
          return currentUsers.map(u => {
            if (u.id === newMsg.user_id) {
              return {
                ...u,
                last_message_at: newMsg.created_at,
                // Incrémenter si ce n'est pas l'admin qui parle et si l'user n'est pas sélectionné
                unread_count: (!newMsg.is_admin_message && selectedUser?.id !== u.id) 
                  ? u.unread_count + 1 
                  : u.unread_count
              }
            }
            return u
          })
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(globalSub) }
  }, [selectedUser])

  // 2. Tri des utilisateurs : Le plus récent en haut
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => 
      new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    )
  }, [users])

  // 3. Gestion du marquage "LU"
  const markAsRead = async (userId: string) => {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_admin_message', false)
    
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, unread_count: 0 } : u))
  }

  // 4. Chargement de la discussion sélectionnée
  useEffect(() => {
    if (!selectedUser) return
    
    markAsRead(selectedUser.id)

    const fetchMsgs = async () => {
      const { data } = await supabase.from('messages')
        .select('*')
        .eq('user_id', selectedUser.id)
        .order('created_at', { ascending: false })
      setMessages(data || [])
    }
    fetchMsgs()

    const chatSub = supabase.channel(`chat:${selectedUser.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `user_id=eq.${selectedUser.id}` }, 
      (p) => {
        setMessages(prev => [p.new, ...prev])
        if (!p.new.is_admin_message) markAsRead(selectedUser.id)
      })
      .subscribe()

    return () => { supabase.removeChannel(chatSub) }
  }, [selectedUser])

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reply.trim() || !selectedUser) return
    const txt = reply; setReply('')
    await supabase.from('messages').insert({ content: txt, user_id: selectedUser.id, is_admin_message: true, is_read: true })
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white flex p-4 gap-4 overflow-hidden">
      {/* SIDEBAR : LISTE CLIENTS */}
      <div className="w-80 bg-slate-900/40 border border-white/10 rounded-[2.5rem] backdrop-blur-xl flex flex-col overflow-hidden">
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <h1 className="text-xl font-black italic uppercase tracking-tighter text-emerald-500">MESSAGES</h1>
          <Bell size={18} className="text-slate-500" />
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {sortedUsers.map(u => (
            <button 
              key={u.id} 
              onClick={() => setSelectedUser(u)} 
              className={`w-full p-4 rounded-[2rem] flex items-center gap-3 transition-all relative ${
                selectedUser?.id === u.id ? 'bg-emerald-500 text-slate-950 scale-[1.02]' : 'hover:bg-white/5 text-slate-400'
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${selectedUser?.id === u.id ? 'bg-emerald-600 border-emerald-400' : 'bg-slate-800 border-white/10'}`}>
                <User size={20}/>
              </div>
              
              <div className="text-left flex-1 overflow-hidden">
                <p className={`font-black text-xs uppercase truncate ${selectedUser?.id === u.id ? 'text-slate-950' : 'text-white'}`}>
                  {u.username || u.phone || 'Anonyme'}
                </p>
                <p className="text-[10px] opacity-60 italic truncate">
                  {u.last_message_at ? new Date(u.last_message_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Aucun message'}
                </p>
              </div>

              {u.unread_count > 0 && selectedUser?.id !== u.id && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-emerald-500 text-[#020617] text-[10px] font-black h-5 min-w-[20px] px-1 rounded-full flex items-center justify-center animate-bounce shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                  {u.unread_count}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* CHAT WINDOW */}
      <div className="flex-1 bg-slate-900/20 border border-white/5 rounded-[3rem] flex flex-col overflow-hidden backdrop-blur-sm">
        {selectedUser ? (
          <>
            <div className="p-6 bg-slate-950/50 border-b border-white/5 flex items-center gap-4">
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
               <h2 className="font-black uppercase italic tracking-widest text-emerald-500">
                 {selectedUser.username || selectedUser.phone}
               </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col">
              <form onSubmit={sendReply} className="mb-4 sticky top-0 z-10">
                <div className="relative">
                  <input 
                    value={reply} onChange={(e) => setReply(e.target.value)}
                    placeholder="Tape ta réponse flash..."
                    className="w-full bg-[#020617] border border-emerald-500/30 p-5 rounded-[2rem] outline-none focus:border-emerald-500 transition-all font-bold text-emerald-50 pr-16 shadow-2xl"
                  />
                  <button type="submit" className="absolute right-3 top-2 bottom-2 px-6 bg-emerald-500 text-slate-950 rounded-[1.5rem] font-black text-xs hover:bg-emerald-400 transition-all uppercase italic">
                    Envoyer
                  </button>
                </div>
              </form>

              {messages.map(m => (
                <div key={m.id} className={`flex ${m.is_admin_message ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-top-1 duration-300`}>
                   <div className={`p-4 rounded-[1.8rem] max-w-md text-sm font-bold shadow-lg ${
                     m.is_admin_message 
                     ? 'bg-emerald-500 text-slate-950 rounded-tr-none' 
                     : 'bg-slate-800 text-white border border-white/5 rounded-tl-none'
                   }`}>
                      {m.content}
                   </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center opacity-10">
            <MessageSquare size={100} className="text-emerald-500 mb-4" />
            <p className="font-black italic uppercase tracking-[1em]">En attente</p>
          </div>
        )}
      </div>
    </main>
  )
}

