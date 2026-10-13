export const groups = {
  Physique: ['Vitesse', 'Force', 'Endurance', 'Accélération', 'Sprint', 'Agilité', 'Équilibre'],
  Technique: ['Dribble', 'Centres', 'Passes', 'Passes courtes', 'Précision centres', 'Puissance tir', 'Finition', 'Tirs lointains', 'Effet', 'Volées', 'Contrôle', 'Mauvais pied'],
  Mental: ['Placement', 'Sang-froid', 'Décisions', 'Réactivité', 'Vision', 'Conscience du jeu', 'Concentration', 'Détente', 'Tête', 'Lecture défensive', 'Discipline', 'Appels', 'Intensité', 'Leadership', 'Personnalité'],
  Défense: ['Marquage', 'Tacles', 'Placement défensif', 'Tacles glissés', 'Tacles debout', 'Interceptions', 'Tête défensive', 'Contres', 'Dégagements', 'Agressivité', 'Anticipation', 'Force des bras'],
  Gardien: ['Plongeons', 'Prises de balle', 'Dégagements gardien', 'Placement gardien', 'Réflexes'],
};
export const clubs = ['Olympique Lyonnais', 'Paris Saint-Germain', 'RC Lens', 'Stade Rennais', 'Olympique de Marseille', 'AS Monaco', 'LOSC Lille', 'OGC Nice'];
export const positions = ['BU', 'AG', 'AD', 'MC', 'DC', 'GB'];
export type Session = 'Équilibré' | 'Vitesse' | 'Technique' | 'Défense' | 'Finition';
export type Fixture = { id: number; day: number; opponent: string; home: boolean; competition: string; score?: [number, number]; rating?: number };
export type Career = {
  player: { name: string; age: number; height: number; weight: number; position: string; club: string; attributes: Record<string, number>; potential: number; fatigue: number };
  season: number; day: number; fixtures: Fixture[]; balance: number; salary: number; matches: number; goals: number; assists: number; ratings: number[];
  history: string[]; offers: { club: string; salary: number; bonus: number }[]; lastSaved?: number;
};
const clamp = (n: number, max = 99) => Math.max(0, Math.min(max, n));
export function targets(position: string) {
  return position === 'GB' ? groups.Gardien : position === 'DC' ? groups.Défense.slice(0, 6) : position === 'MC' ? ['Passes', 'Vision', 'Contrôle', 'Endurance', 'Passes courtes'] : ['Vitesse', 'Finition', 'Dribble', 'Accélération', 'Placement', 'Contrôle'];
}
export function rating(game: Career) { const values = targets(game.player.position).map(k => game.player.attributes[k] ?? 0); return Math.round(values.reduce((a, b) => a + b, 0) / values.length); }
export function calendar(club: string): Fixture[] { return Array.from({ length: 48 }, (_, i) => ({ id: i + 1, day: 38 + i * 7, opponent: clubs.filter(c => c !== club)[i % 7] ?? 'FC Nantes', home: i % 2 === 0, competition: i < 34 ? 'Ligue 1' : i < 42 ? 'Coupe de la Ligue' : 'Coupe de France' })); }
export function createCareer(input?: Partial<Career['player']>): Career {
  const player = { name: 'Noah Diallo', age: 17, height: 181, weight: 72, position: 'BU', club: clubs[0] ?? 'Olympique Lyonnais', attributes: {}, potential: 89, fatigue: 18, ...input };
  const attributes = Object.fromEntries(Object.values(groups).flat().map((key, i) => [key, 8 + (i * 7 % 17)]));
  for (const key of targets(player.position)) attributes[key] = clamp((attributes[key] ?? 0) + 15);
  attributes['Détente'] = clamp((attributes['Détente'] ?? 0) + (player.height - 160) * .6);
  attributes['Vitesse'] = clamp((attributes['Vitesse'] ?? 0) + (95 - player.weight) * .4);
  player.attributes = attributes; player.potential = Math.min(95, rating({ player } as Career) + (player.age <= 15 ? 50 : player.age <= 17 ? 30 : 20));
  return { player, season: 1, day: 35, fixtures: calendar(player.club), balance: 2400, salary: 1500, matches: 0, goals: 0, assists: 0, ratings: [], history: ['Bienvenue à l’académie. Votre carrière commence.'], offers: [] };
}
export function dateLabel(day: number, season = 1) { return new Date(Date.UTC(2026 + season - 1, 7, day)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' }); }
export function advance(game: Career): Career {
  const next = { ...game, day: game.day + 1 };
  if (next.day % 30 === 0) next.balance += next.salary - 75;
  if (next.matches >= 10 && next.ratings.reduce((a, b) => a + b, 0) / next.ratings.length > 7 && !next.offers.length) next.offers = [{ club: next.player.club === 'RC Lens' ? 'Stade Rennais' : 'RC Lens', salary: 2500, bonus: 3000 }];
  if (next.day > 380) { next.day = 1; next.season++; next.player = { ...next.player, age: next.player.age + 1 }; next.fixtures = calendar(next.player.club); next.history = [`Saison ${next.season} : une nouvelle aventure.`, ...next.history]; }
  return next;
}
export function train(game: Career, session: Session): Career {
  if (game.player.fatigue >= 85 || game.fixtures.some(f => !f.score && f.day <= game.day)) return game;
  const keys = session === 'Équilibré' ? Object.values(groups).flat() : session === 'Vitesse' ? ['Vitesse', 'Accélération', 'Sprint'] : session === 'Technique' ? ['Dribble', 'Passes', 'Contrôle'] : session === 'Défense' ? ['Marquage', 'Tacles', 'Placement défensif'] : ['Finition', 'Puissance tir', 'Effet'];
  const attributes = { ...game.player.attributes };
  const gain = Math.max(.1, (session === 'Équilibré' ? 1.5 : 3.5) * (1 - game.player.fatigue / 100) * Math.max(.1, (game.player.potential - rating(game)) / 40) * (game.player.age <= 15 ? 1.2 : .8));
  keys.forEach(key => attributes[key] = Math.min(game.player.potential, clamp((attributes[key] ?? 0) + gain)));
  return advance({ ...game, player: { ...game.player, attributes, fatigue: clamp(game.player.fatigue + (session === 'Équilibré' ? 15 : session === 'Technique' || session === 'Défense' ? 18 : 20), 100) }, history: [`Entraînement ${session.toLowerCase()} terminé · +${gain.toFixed(1)} sur les attributs ciblés.`, ...game.history].slice(0, 20) });
}
export function rest(game: Career): Career { if (game.fixtures.some(f => !f.score && f.day <= game.day)) return game; return advance({ ...game, player: { ...game.player, fatigue: clamp(game.player.fatigue - 50) }, history: ['Repos complet · récupération de 50 points.', ...game.history].slice(0, 20) }); }
export type MatchEvent = { minute: number; text: string; home: number; away: number };
export function simulate(game: Career, fixture: Fixture, random = Math.random): MatchEvent[] {
  const events: MatchEvent[] = [{ minute: 0, text: 'Coup d’envoi. À vous de jouer.', home: 0, away: 0 }]; let home = 0; let away = 0;
  for (let minute = 10; minute <= 90; minute += 10) { const chance = random(); if (chance > .75) { if (random() > .5 - rating(game) / 500 + game.player.fatigue / 600) home++; else away++; } events.push({ minute, text: chance > .75 ? 'But ! Le score évolue.' : minute === 90 ? 'Coup de sifflet final.' : ['Une passe précise entre les lignes.', 'Le pressing fait reculer l’adversaire.', 'Une occasion dans la surface.'][minute / 10 % 3] ?? 'Le jeu se poursuit.', home, away }); }
  return events;
}
export function finishMatch(game: Career, fixture: Fixture, events: MatchEvent[]): Career {
  if (fixture.score) return game;
  const result = events.at(-1); if (!result) return game;
  const note = Math.min(9.8, Math.max(4, 6 + rating(game) / 50 + (result.home - result.away) * .3 - game.player.fatigue / 100));
  const goals = game.player.position === 'BU' ? Math.min(1, result.home) : 0;
  const attributes = { ...game.player.attributes }; targets(game.player.position).forEach(k => attributes[k] = Math.min(game.player.potential, (attributes[k] ?? 0) + (note > 7 ? .7 : .2)));
  return advance({ ...game, fixtures: game.fixtures.map(f => f.id === fixture.id ? { ...f, score: [result.home, result.away], rating: note } : f), player: { ...game.player, attributes, fatigue: clamp(game.player.fatigue + 25, 100) }, balance: game.balance + 180 + goals * 270, matches: game.matches + 1, goals: game.goals + goals, ratings: [...game.ratings, note], history: [`${game.player.club} ${result.home}–${result.away} ${fixture.opponent} · note ${note.toFixed(1)}`, ...game.history].slice(0, 20) });
}
export function acceptOffer(game: Career, index: number): Career { const offer = game.offers[index]; if (!offer || game.fixtures.some(f => !f.score && f.day <= game.day)) return game; return advance({ ...game, player: { ...game.player, club: offer.club, fatigue: clamp(game.player.fatigue + 20, 100) }, salary: offer.salary, balance: game.balance + offer.bonus, offers: [], fixtures: game.fixtures.map(f => !f.score && f.opponent === offer.club ? { ...f, opponent: game.player.club } : f), history: [`Nouveau contrat signé au ${offer.club}.`, ...game.history] }); }
export function checksum(data: string) { let h = 0; for (let i = 0; i < data.length; i++) h = (h * 31 + data.charCodeAt(i)) | 0; return String(h); }
export const saveKey = 'fc_career_save_v2';
export function encode(game: Career) { const data = JSON.stringify(game); return JSON.stringify({ version: 2, lastSaveTime: Date.now(), checksum: checksum(data), data: game }); }
export function decode(raw: string): Career { const save = JSON.parse(raw); if (save.version !== 2 || checksum(JSON.stringify(save.data)) !== save.checksum || !save.data?.player?.attributes || !Array.isArray(save.data.fixtures) || save.data.day < 1 || save.data.day > 380 || Object.values(groups).flat().some(k => !Number.isFinite(save.data.player.attributes[k]))) throw new Error('Sauvegarde incompatible ou endommagée.'); return save.data; }