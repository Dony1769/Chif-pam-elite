import React from 'react'
import { User } from 'lucide-react'

type UserItem = {
  id: string
  username?: string | null
  phone?: string | null
  unread: number
  last_at: string
}

type Props = {
  user: UserItem
  selected?: boolean
  onClick: () => void
}

const ConversationItem = React.memo(function ConversationItem({ user, selected, onClick }: Props) {
  const displayTime = React.useMemo(() => new Date(user.last_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), [user.last_at])

  return (
    <button onClick={onClick} className={`w-full p-3 rounded-xl flex items-center gap-3 transition ${selected ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'hover:bg-white/5'}`}>
      <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center border border-white/5">
        <User />
      </div>
      <div className="flex-1 text-left">
        <div className="flex items-center justify-between gap-2">
          <div className="font-black truncate text-sm">{user.username || user.phone}</div>
          <div className="text-[11px] opacity-60">{displayTime}</div>
        </div>
        <div className="flex items-center justify-between mt-1">
          <div className="text-[12px] text-slate-400 truncate">Dernier message</div>
          {user.unread > 0 && <div className="bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full font-black text-xs">{user.unread}</div>}
        </div>
      </div>
    </button>
  )
})

export default ConversationItem
