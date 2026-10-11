export type UnoColor = 'red' | 'yellow' | 'green' | 'blue' | 'black';
export type UnoValue = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4';

export interface UnoCard {
  id: string;
  color: UnoColor;
  value: UnoValue;
}

export interface UnoRoom {
  id: string;
  match_code: string;
  host_id: string;
  min_bet: number;
  max_players: number;
  status: 'waiting' | 'playing' | 'finished' | 'cancelled';
  pot_cp: number;
  current_turn: string | null;
  current_color: UnoColor | null;
  top_card: UnoCard;
  turn_direction: 1 | -1;
  turn_number: number;
  winner_id: string | null;
  vip_bonus_cp: number;
  expires_at: string | null;
  turn_deadline_at: string | null;
}

export interface UnoPlayer {
  room_id: string;
  user_id: string;
  seat: number;
  bet_cp: number;
  hand: UnoCard[];
  is_connected: boolean;
}

export const UNO_COLORS: Array<{ value: Exclude<UnoColor, 'black'>; label: string; className: string }> = [
  { value: 'red', label: 'Rouge', className: 'bg-rose-500' },
  { value: 'yellow', label: 'Jaune', className: 'bg-amber-300' },
  { value: 'green', label: 'Vert', className: 'bg-emerald-500' },
  { value: 'blue', label: 'Bleu', className: 'bg-sky-500' },
];

export function unoValueLabel(value: UnoValue): string {
  const specialLabels: Partial<Record<UnoValue, string>> = {
    skip: '⊘', reverse: '↺', draw2: '+2', wild: '★', wild4: '+4',
  };
  return specialLabels[value] ?? value;
}

export function unoColorClass(color: UnoColor): string {
  return {
    red: 'border-rose-300 bg-rose-500 text-white',
    yellow: 'border-amber-200 bg-amber-300 text-slate-950',
    green: 'border-emerald-300 bg-emerald-500 text-white',
    blue: 'border-sky-300 bg-sky-500 text-white',
    black: 'border-white/50 bg-slate-950 text-white',
  }[color];
}