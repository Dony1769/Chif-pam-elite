import React, { useMemo } from 'react'
import ConversationItem from './ConversationItem'

type UserItem = {
  id: string
  username?: string | null
  phone?: string | null
  unread: number
  last_at: string
}

type Props = {
  users: UserItem[]
  selectedId: string | null
  onSelect: (id: string) => void
}

const ConversationList = React.memo(function ConversationList({ users, selectedId, onSelect }: Props) {
  const sorted = useMemo(() => [...users].sort((a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime()), [users])

  return (
    <div className="space-y-3 p-2">
      {sorted.map((u) => (
        <ConversationItem key={u.id} user={u} selected={u.id === selectedId} onClick={() => onSelect(u.id)} />
      ))}
    </div>
  )
})

export default ConversationList
