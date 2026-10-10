import type { GameEvent, EventChoice, MessageSender, PlayerCareerState } from './types';

const clamp = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));

interface Tweak {
  niveau?: number;
  image?: number;
  moral?: number;
  followers?: number;
  fatigue?: number;
  relation?: number;
  points?: number;
}

function tweak(p: PlayerCareerState, o: Tweak): PlayerCareerState {
  return {
    ...p,
    skillPointsAvailable: p.skillPointsAvailable + (o.points ?? 0),
    fatigue: clamp(p.fatigue + (o.fatigue ?? 0)),
    coach: { ...p.coach, relation: clamp(p.coach.relation + (o.relation ?? 0)) },
    reputation: {
      niveau: clamp(p.reputation.niveau + (o.niveau ?? 0)),
      image: clamp(p.reputation.image + (o.image ?? 0)),
      moral: clamp(p.reputation.moral + (o.moral ?? 0)),
      followers: Math.max(0, p.reputation.followers + (o.followers ?? 0)),
    },
  };
}

interface EventDef {
  id: string;
  from: MessageSender;
  title: string;
  body: string;
  choices: EventChoice[];
  weight: number;
  eligible: (p: PlayerCareerState) => boolean;
  resolve: (p: PlayerCareerState, choiceId: string) => { player: PlayerCareerState; text: string };
}


const EVENT_DEFS: EventDef[] = [
  {
    id: 'video_virale',
    from: 'presse',
    title: 'Ta vidéo fait le buzz',
    body: "Un de tes gestes techniques circule sur les réseaux sociaux. Les commentaires s'enflamment.",
    choices: [
      { id: 'partager', label: 'La partager et remercier' },
      { id: 'ignorer', label: 'Ne rien faire' },
    ],
    weight: 3,
    eligible: (p) => p.reputation.niveau >= 15,
    resolve: (p, c) =>
      c === 'partager'
        ? {
            player: tweak(p, { followers: 800 + Math.round(p.reputation.niveau * 40), image: 1, moral: 3 }),
            text: 'Ta vidéo dépasse les attentes : de nouveaux abonnés te suivent.',
          }
        : { player: tweak(p, { moral: 1 }), text: 'Tu restes concentré sur le terrain. La vidéo retombe vite.' },
  },
  {
    id: 'interview',
    from: 'presse',
    title: 'Interview après le match',
    body: "Un journaliste local te tend le micro et te demande ce que tu penses de ton équipe.",
    choices: [
      { id: 'humble', label: 'Rester humble' },
      { id: 'provoc', label: 'Lancer une petite provocation' },
    ],
    weight: 2,
    eligible: (p) => p.reputation.niveau >= 25,
    resolve: (p, c) =>
      c === 'humble'
        ? { player: tweak(p, { image: 4, relation: 1 }), text: 'Ta réponse sobre est saluée. Ton image progresse.' }
        : {
            player: tweak(p, { followers: 1500, image: -6, relation: -3 }),
            text: 'Ta phrase fait le tour des réseaux, mais ton coach n\'apprécie pas.',
          },
  },
  {
    id: 'parents',
    from: 'famille',
    title: 'Tes parents s\'inquiètent',
    body: 'Tes parents trouvent que tu t\'entraînes trop. Ils te demandent de lever le pied.',
    choices: [
      { id: 'ecouter', label: 'Prendre du repos' },
      { id: 'continuer', label: 'Continuer à fond' },
    ],
    weight: 2,
    eligible: () => true,
    resolve: (p, c) =>
      c === 'ecouter'
        ? { player: tweak(p, { fatigue: -20, moral: 3 }), text: 'Un week-end en famille te fait le plus grand bien.' }
        : { player: tweak(p, { points: 2, fatigue: 15, moral: -1 }), text: 'Tu progresses vite, mais tu es plus fatigué.' },
  },
  {
    id: 'soiree',
    from: 'famille',
    title: 'Soirée la veille du match',
    body: 'Des amis t\'invitent à une soirée. Le match est demain.',
    choices: [
      { id: 'sortir', label: 'Y aller' },
      { id: 'rester', label: 'Rester te reposer' },
    ],
    weight: 2,
    eligible: (p) => p.age >= 14,
    resolve: (p, c) =>
      c === 'sortir'
        ? { player: tweak(p, { moral: 6, fatigue: 10, image: -2, relation: -2 }), text: 'Super ambiance, mais tu es moins frais le lendemain.' }
        : { player: tweak(p, { relation: 2, moral: -1 }), text: 'Ton coach apprécie ton sérieux.' },
  },
  {
    id: 'entretien_coach',
    from: 'coach',
    title: 'Le coach te convoque',
    body: 'Après l\'entraînement, ton coach veut te parler de ton rôle dans l\'équipe.',
    choices: [
      { id: 'ecouter', label: 'Écouter ses conseils' },
      { id: 'discuter', label: 'Défendre ton point de vue' },
    ],
    weight: 2,
    eligible: () => true,
    resolve: (p, c) =>
      c === 'ecouter'
        ? { player: tweak(p, { relation: 5 }), text: 'Ton coach apprécie ton écoute. Votre relation s\'améliore.' }
        : p.coach.relation >= 50
          ? { player: tweak(p, { relation: 3, moral: 2 }), text: 'Il respecte ton franc-parler.' }
          : { player: tweak(p, { relation: -3, moral: 2 }), text: 'Il le prend mal : la discussion tourne court.' },
  },
  {
    id: 'sponsor_local',
    from: 'sponsor',
    title: 'Un magasin de sport te contacte',
    body: 'Un commerçant local te propose de porter ses couleurs en échange de matériel.',
    choices: [
      { id: 'accepter', label: 'Accepter' },
      { id: 'refuser', label: 'Refuser poliment' },
    ],
    weight: 2,
    eligible: (p) => p.age >= 16 && p.reputation.niveau >= 40,
    resolve: (p, c) =>
      c === 'accepter'
        ? { player: tweak(p, { points: 3, image: 2, followers: 500 }), text: 'Tu reçois du matériel neuf et un peu de visibilité.' }
        : { player: tweak(p, { image: 1, moral: -1 }), text: 'Tu préfères garder ta liberté pour de plus gros contrats.' },
  },
  {
    id: 'agent_parents',
    from: 'agent',
    title: 'Un agent contacte tes parents',
    body: 'Un agent a remarqué tes performances et propose un rendez-vous avec ta famille.',
    choices: [
      { id: 'ecouter', label: 'Accepter le rendez-vous' },
      { id: 'refuser', label: 'Refuser pour l\'instant' },
    ],
    weight: 2,
    eligible: (p) => p.age >= 16 && p.age <= 17 && p.reputation.niveau >= 35,
    resolve: (p, c) =>
      c === 'ecouter'
        ? { player: tweak(p, { moral: 2 }), text: 'Il te laisse sa carte et promet de suivre ta progression.' }
        : { player: tweak(p, { image: 1 }), text: 'Tu préfères te concentrer sur le terrain.' },
  },
  {
    id: 'detection',
    from: 'club',
    title: 'Tournoi de détection',
    body: 'Un tournoi de détection est organisé dans ta région. Des recruteurs seront présents.',
    choices: [
      { id: 'participer', label: 'Y participer' },
      { id: 'passer', label: 'Passer ton tour' },
    ],
    weight: 2,
    eligible: (p) => p.age >= 12 && p.age <= 15 && p.reputation.niveau >= 15,
    resolve: (p, c) => {
      if (c === 'passer') return { player: tweak(p, { moral: -1 }), text: 'Tu laisses passer l\'occasion.' };
      return Math.random() < 0.6
        ? { player: tweak(p, { niveau: 4, fatigue: 20, moral: 3 }), text: 'Tu te montres : plusieurs recruteurs notent ton nom.' }
        : { player: tweak(p, { niveau: 0.5, fatigue: 20, moral: -2 }), text: 'Journée compliquée, personne ne te remarque vraiment.' };
    },
  },
];

// ---------------------------------------------------------------
// API
// ---------------------------------------------------------------
const EVENT_PROBABILITY = 0.28;

export function rollEvent(p: PlayerCareerState): GameEvent | null {
  if (p.pendingEvent || Math.random() > EVENT_PROBABILITY) return null;
  const pool = EVENT_DEFS.filter((e) => e.eligible(p));
  if (pool.length === 0) return null;

  const total = pool.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * total;
  for (const e of pool) {
    roll -= e.weight;
    if (roll <= 0) {
      return { id: e.id, from: e.from, title: e.title, body: e.body, choices: e.choices };
    }
  }
  const e = pool[0];
  return { id: e.id, from: e.from, title: e.title, body: e.body, choices: e.choices };
}

export function resolveEvent(p: PlayerCareerState, choiceId: string): PlayerCareerState {
  const ev = p.pendingEvent;
  if (!ev) return p;
  const def = EVENT_DEFS.find((d) => d.id === ev.id);
  if (!def) return { ...p, pendingEvent: null };

  const { player, text } = def.resolve(p, choiceId);
  return {
    ...player,
    pendingEvent: null,
    inbox: [
      {
        id: `ev-${p.season}-${p.week}`,
        from: def.from,
        season: p.season,
        week: p.week,
        title: def.title,
        body: text,
        read: false,
      },
      ...player.inbox,
    ],
  };
}
