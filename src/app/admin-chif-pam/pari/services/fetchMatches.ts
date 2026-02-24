// /services/fetchMatches.ts
export interface MatchAPI {
  id: number;
  homeTeam: { name: string };
  awayTeam: { name: string };
  competition: { name: string; code: string };
  utcDate: string;
}

export async function fetchTodayMatches(): Promise<MatchAPI[]> {
  const today = new Date().toISOString().split("T")[0];
  const leagues = ["PL", "PD", "SA", "BL1", "FL1"];
  let allMatches: MatchAPI[] = [];

  for (const league of leagues) {
    const res = await fetch(
      `https://api.football-data.org/v4/competitions/${league}/matches?dateFrom=${today}&dateTo=${today}`,
      {
        headers: {
          "X-Auth-Token": process.env.FOOTBALL_API_KEY!,
        },
      }
    );

    if (!res.ok) {
      console.error(`Erreur fetch league ${league}: ${res.status}`);
      continue;
    }

    const data = await res.json();
    if (data.matches) {
      allMatches.push(...data.matches);
    }
  }

  // On limite à 10 matchs pour la page
  return allMatches.slice(0, 10);
}
