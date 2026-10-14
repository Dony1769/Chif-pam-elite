/**
 * FC CAREER — Domaine : Économie
 */

export interface Wallet {
  balance: number;     // € total
  weeklyWage: number;  // € automatiquement crédité chaque semaine
  totalEarned: number;
  totalSpent: number;
}

export interface Transfer {
  id: string;
  season: number;
  fromClubId: string;
  toClubId: string;
  fee: number;         // 0 = libre
  isLoan: boolean;
  loanEndSeason?: number;
}
