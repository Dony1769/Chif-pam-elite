'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

type Profile = {
  id: string
  email: string
  username: string | null
  role: string
}

type Message = {
  id: string
  content: string
  is_admin_message: boolean
  user_id: string
  created_at: string
}

export default function AdminChatPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 1. Charger la liste des utilisateurs (Clients seulement)
  useEffect(() => {
    const fetchUsers = async () => {
      // Tu peux optimiser ceci pour ne charger que les utilisateurs qui ont envoyé des messages
      // Pour l'instant, on charge tous les profils 'client'
      const { data } = await supabase
        .from('profiles')
        .select('id, email, username, role')
        .neq('role', 'admin') // Exclure les autres admins
        .limit(50) 
      
      if (data) setUsers(data)
    }
    fetchUsers()
  }, [])

  // 2. Charger les messages quand on clique sur un utilisateur
  useEffect(() => {
    if (!selectedUser) return

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', selectedUser.id)
        .order('created_at', { ascending: true })
      
      if (data) setMessages(data)
    }

    fetchMessages()

    // Realtime pour l'admin (écouter la conversation active)
    const channel = supabase
      .channel(`admin-chat-${selectedUser.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `user_id=eq.${selectedUser.id}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selectedUser])

  // Scroll en bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedUser) return

    const { error } = await supabase
      .from('messages')
      .insert({
        content: newMessage,
        user_id: selectedUser.id, // IMPORTANT: On lie le message à l'ID du client
        is_admin_message: true   // C'est l'admin qui parle
      })

    if (!error) setNewMessage('')
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar : Liste des utilisateurs */}
      <div className="w-1/4 border-r bg-gray-50 overflow-y-auto">
        <div className="p-4 border-b font-bold text-lg">Clients</div>
        {users.map((user) => (
          <div
            key={user.id}
            onClick={() => setSelectedUser(user)}
            className={`p-3 cursor-pointer hover:bg-gray-200 border-b ${
              selectedUser?.id === user.id ? 'bg-blue-100 border-l-4 border-l-blue-500' : ''
            }`}
          >
            <p className="font-medium text-sm">{user.username || 'Sans nom'}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
        ))}
      </div>

      {/* Zone de Chat */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            {/* Header Chat */}
            <div className="p-4 border-b bg-white shadow-sm flex justify-between items-center">
              <h2 className="font-bold">Chat avec {selectedUser.username || selectedUser.email}</h2>
              <span className="text-xs bg-gray-100 px-2 py-1 rounded">ID: {selectedUser.id.slice(0,8)}...</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.length === 0 && (
                <p className="text-center text-gray-400 mt-10">Aucun message pour l'instant.</p>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.is_admin_message ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] p-3 rounded-lg text-sm shadow-sm ${
                      msg.is_admin_message
                        ? 'bg-blue-600 text-white rounded-br-none' // Admin en bleu
                        : 'bg-white text-gray-800 border rounded-bl-none' // Client en blanc/gris
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Admin */}
            <form onSubmit={sendMessage} className="p-4 bg-white border-t flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Répondre au client..."
                className="flex-1 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 font-medium"
              >
                Envoyer
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Sélectionnez un client à gauche pour commencer le chat.
          </div>
        )}
      </div>
    </div>
  )
}
