export interface MatchAnalysis {
  homeTeam: string;
  awayTeam: string;
  league: string;
  date: string;

  probabilityHome: number;
  probabilityDraw: number;
  probabilityAway: number;

  over25: number;

  mentalScoreHome: number;
  mentalScoreAway: number;

  valueDetected: boolean;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
}
