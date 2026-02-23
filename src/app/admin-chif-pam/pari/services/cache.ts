// services/cache.ts
const teamCache: { [key: number]: { data: any; timestamp: number } } = {};

export function getTeamStats(teamId: number) {
  const cache = teamCache[teamId];
  if (cache && Date.now() - cache.timestamp < 24 * 60 * 60 * 1000) {
    return cache.data;
  }
  return null;
}

export function setTeamStats(teamId: number, data: any) {
  teamCache[teamId] = { data, timestamp: Date.now() };
}
