// types/support.ts

export type TicketCategory = 'paiement' | 'technique' | 'autre';
export type TicketPriority = 'normal' | 'important' | 'critique';
export type TicketStatus = 'ouvert' | 'en_cours' | 'ferme';


export interface TicketMessage {
  text: string;
  sender: 'user' | 'admin';
  time: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  attachment_url?: string | null;
  created_at: string;
  closed_at?: string | null;
}

