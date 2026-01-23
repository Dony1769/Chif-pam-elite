'use client'
import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { User, Send, MessageSquare, Bell } from 'lucide-react'

export default function AdminChat() {
  const [users, setUsers] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [reply, setReply] = useState('')
  
  // Ref pour toujours avoir la valeur actuelle dans le callback Realtime
  const selectedUserRef = useRef(selectedUser)
  useEffect(() => { selectedUserRef.current = selectedUser }, [selectedUser])

  // 1. Chargement initial : Clients + Unread simplifiés
  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .neq('role', 'admin')
      
      if (profiles) setUsers(profiles)
    }
    fetchInitialData()

    // 2. LE MOTEUR ULTRA-INSTANTANÉ (Global)
    const globalChannel = supabase
      .channel('admin-global-chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const newMessage = payload.new
        
        // A. Faire monter l'utilisateur en haut
        setUsers(prevUsers => {
          const userIdx = prevUsers.findIndex(u => u.id === newMessage.user_id)
          if (userIdx === -1) return prevUsers // Cas rare
          
          const newUsers = [...prevUsers]
          const [movedUser] = newUsers.splice(userIdx, 1)
          return [movedUser, ...newUsers] // Remonte en haut de liste
        })

        // B. Gérer le compteur si ce n'est pas l'admin qui parle
        if (!newMessage.is_admin_message) {
          // Si on n'est pas sur la discussion du client ou si la fenêtre n'est pas active
          if (selectedUserRef.current?.id !== newMessage.user_id) {
            setUnreadCounts(prev => ({
              ...prev,
              [newMessage.user_id]: (prev[newMessage.user_id] || 0) + 1
            }))
            // Optionnel : Jouer un petit son ici
          }
        }

        // C. Ajouter au chat si c'est le client actuellement sélectionné
        if (selectedUserRef.current?.id === newMessage.user_id) {
          setMessages(prev => [newMessage, ...prev])
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(globalChannel) }
  }, [])

  // 3. Switch de client : On reset le compteur
  const selectClient = async (user: any) => {
    setSelectedUser(user)
    setUnreadCounts(prev => ({ ...prev, [user.id]: 0 })) // Reset notification
    
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    setMessages(data || [])
  }

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reply.trim() || !selectedUser) return
    const txt = reply; setReply('')
    
    // Insertion (Le Realtime s'occupera de l'afficher)
    await supabase.from('messages').insert({
      content: txt,
      user_id: selectedUser.id,
      is_admin_message: true
    })
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white flex p-4 gap-4 overflow-hidden">
      
      {/* SIDEBAR DYNAMIQUE */}
      <div className="w-80 bg-slate-900/40 border border-white/5 rounded-[2rem] backdrop-blur-2xl flex flex-col">
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <h1 className="text-xl font-black italic text-emerald-500 uppercase">Inbox</h1>
          <Bell size={18} className="text-slate-600" />
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {users.map(u => {
            const count = unreadCounts[u.id] || 0
            return (
              <button 
                key={u.id} 
                onClick={() => selectClient(u)}
                className={`w-full p-4 rounded-2xl flex items-center gap-3 transition-all relative group ${
                  selectedUser?.id === u.id ? 'bg-emerald-500 text-slate-950' : 'hover:bg-white/5 text-slate-400'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${
                  selectedUser?.id === u.id ? 'bg-slate-950/20 border-slate-950/20' : 'bg-slate-800 border-white/10'
                }`}>
                  <User size={18}/>
                </div>
                
                <div className="text-left flex-1 overflow-hidden">
                  <p className="font-black text-xs uppercase truncate">{u.username || u.phone || 'Client'}</p>
                  <p className="text-[10px] opacity-60 truncate">Cliquer pour répondre</p>
                </div>

                {count > 0 && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 bg-emerald-500 text-slate-950 text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center animate-bounce shadow-[0_0_10px_#10b981]">
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ZONE DE CHAT */}
      <div className="flex-1 bg-slate-900/20 border border-white/5 rounded-[2.5rem] flex flex-col overflow-hidden">
        {selectedUser ? (
          <>
            <div className="p-6 bg-slate-950/40 border-b border-white/5 backdrop-blur-md flex items-center gap-4">
              <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
              <h2 className="font-black uppercase italic tracking-widest text-emerald-500">
                {selectedUser.username || 'Client Session'}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col">
              {/* Input collé en haut pour Admin */}
              <form onSubmit={sendReply} className="mb-4">
                <div className="relative">
                  <input 
                    value={reply} onChange={(e) => setReply(e.target.value)}
                    placeholder="Tapez votre réponse..."
                    className="w-full bg-[#020617] border border-emerald-500/30 p-5 rounded-2xl outline-none focus:border-emerald-500 transition-all font-bold placeholder:text-slate-700 shadow-inner"
                  />
                  <button type="submit" className="absolute right-3 top-3 p-3 bg-emerald-500 rounded-xl text-slate-950 hover:scale-105 active:scale-95 transition-transform">
                    <Send size={18} />
                  </button>
                </div>
              </form>

              {messages.map((m, i) => (
                <div key={m.id || i} className={`flex ${m.is_admin_message ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-top-1 duration-300`}>
                   <div className={`p-4 rounded-2xl max-w-[80%] text-sm font-bold shadow-lg ${
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
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-slate-900/50 rounded-full flex items-center justify-center mb-4 border border-white/5">
              <MessageSquare size={32} className="text-emerald-500 opacity-40" />
            </div>
            <p className="font-black italic uppercase tracking-[0.3em] text-slate-600 text-sm">Sélectionner une discussion</p>
          </div>
        )}
      </div>
    </main>
  )
}
