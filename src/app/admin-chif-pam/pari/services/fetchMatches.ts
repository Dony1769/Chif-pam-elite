export async function fetchTodayMatches() {
  const today = new Date().toISOString().split("T")[0];

  const leagues = ["PL", "PD", "SA", "BL1", "FL1"];

  let allMatches: any[] = [];

  for (const league of leagues) {
    const res = await fetch(
      `https://api.football-data.org/v4/competitions/${league}/matches?dateFrom=${today}&dateTo=${today}`,
      {
        headers: {
          "X-Auth-Token": process.env.FOOTBALL_API_KEY!,
        },
      }
    );

    const data = await res.json();

    if (data.matches) {
      allMatches.push(...data.matches);
    }
  }

  return allMatches.slice(0, 10);
}
