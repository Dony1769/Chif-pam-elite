import React from 'react'
import ConversationList from './ConversationList'

type UserItem = {
  id: string
  username?: string | null
  phone?: string | null
  unread: number
  last_at: string
}

type Props = {
  users: UserItem[]
  selectedUserId: string | null
  onSelect: (id: string) => void
}

export default function ChatSidebar({ users, selectedUserId, onSelect }: Props) {
  const [query, setQuery] = React.useState('')
  const [filter, setFilter] = React.useState<'all' | 'unread'>('all')

  const filtered = users.filter((u) => {
    if (filter === 'unread' && (!u.unread || u.unread === 0)) return false
    if (!query) return true
    return (u.username || u.phone || '').toLowerCase().includes(query.toLowerCase())
  })

  return (
    <aside className="w-96 bg-slate-900/40 border-r border-white/5 p-4 flex flex-col gap-4">
      <div className="p-4">
        <h3 className="font-black italic uppercase tracking-tight text-emerald-400">Messagerie</h3>
        <p className="text-[12px] text-slate-400">Centre de support</p>
      </div>
      <div className="p-2">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher..." className="w-full p-2 rounded bg-white/5 outline-none" />
        <div className="flex gap-2 mt-2">
          <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded ${filter === 'all' ? 'bg-emerald-500 text-slate-900' : 'bg-white/5'}`}>Tous</button>
          <button onClick={() => setFilter('unread')} className={`px-3 py-1 rounded ${filter === 'unread' ? 'bg-emerald-500 text-slate-900' : 'bg-white/5'}`}>Non lus</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <ConversationList users={filtered} selectedId={selectedUserId} onSelect={onSelect} />
      </div>
    </aside>
  )
}
