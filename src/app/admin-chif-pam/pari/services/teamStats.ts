export async function fetchTeamLastMatches(teamId: number) {
  const res = await fetch(
    `https://api.football-data.org/v4/teams/${teamId}/matches?status=FINISHED&limit=10`,
    {
      headers: {
        "X-Auth-Token": process.env.FOOTBALL_API_KEY!,
      },
    }
  );

  const data = await res.json();

  return data.matches || [];
}
