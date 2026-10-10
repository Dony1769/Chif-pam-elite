import type {
  Fixture,
  KeyMoment,
  MomentEffect,
  MomentOption,
  MatchState,
  MatchResult,
  MatchEventType,
  Participation,
  PlayerAttributes,
} from './types';

// ---------------------------------------------------------------
// CONTEXTE DU JOUEUR (fourni par engine.buildMatchContext)
// ---------------------------------------------------------------
export interface MatchContext {
  position: string;
  attrs: PlayerAttributes;
  ovr: number; // note globale effective (fatigue + forme incluses)
  teamStrength: number;
}

// ---------------------------------------------------------------
// RÉGLAGES DU MATCH
// ---------------------------------------------------------------
const CHANCE_RATE = 0.08; // probabilité de base d'occasion par minute
const MAX_MOMENTS = 5; // décisions interactives max par match
const MIN_GAP = 8; // minutes minimum entre deux décisions

// Probabilité d'être impliqué dans une occasion selon le poste
const INVOLVE: Record<string, { attack: number; defense: number }> = {
  BU: { attack: 0.3, defense: 0.02 },
  MOC: { attack: 0.28, defense: 0.12 },
  DC: { attack: 0.06, defense: 0.35 },
};

export const OPPONENTS = [
  'FC Rivière', 'Olympique du Nord', 'US Marais', 'AS Vallée', 'Racing Plaine',
  'Sporting Côte', 'Union Haute-Ville', 'FC Collines', 'Athletic Port', 'Stade Lagune',
  'Real Faubourg', 'Dynamo Rail', 'Inter Cité', 'Étoile Rouge', 'Avenir Sud',
  'Gladiators FC', 'Phénix Club', 'Titans Est', "Aigles d'Or",
] as const;


const TEAMMATES = [
  'Lopes', 'Diallo', 'Kessler', 'Moreau', 'Benali', 'Tanaka', 'Silva', 'Novak', 'Mbaye', 'Rossi',
] as const;

// ---------------------------------------------------------------
// OUTILS
// ---------------------------------------------------------------
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const chance = (p: number) => Math.random() < p;
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const val = (a: PlayerAttributes, id: string) => a[id] || 40;
const wavg = (a: PlayerAttributes, pairs: [string, number][]) =>
  pairs.reduce((sum, [id, w]) => sum + val(a, id) * w, 0);

// ---------------------------------------------------------------
// CALENDRIER : 19 adversaires, matchs aller + retour = 38 semaines
// ---------------------------------------------------------------
export function getFixture(season: number, week: number, teamStrength: number): Fixture {
  const idx = (week - 1) % OPPONENTS.length;
  const name = OPPONENTS[idx];
  const home = week <= OPPONENTS.length ? idx % 2 === 0 : idx % 2 === 1;
  const offset = (hashString(`${name}-${season}`) % 21) - 10;
  return {
    week,
    opponentName: name,
    opponentStrength: clamp(teamStrength + offset, 30, 90),
    home,
  };
}

// ---------------------------------------------------------------
// MOMENTS CLÉS (décisions du joueur)
// ---------------------------------------------------------------
function strikerMoment(a: PlayerAttributes, minute: number): KeyMoment {
  const shootSkill = wavg(a, [['finition', 0.5], ['puissance_tir', 0.2], ['calme', 0.3]]);
  const shoot = 0.04 + (shootSkill / 100) * 0.34;
  const pass = 0.04 + (wavg(a, [['passes_courtes', 0.4], ['vista', 0.3], ['finesse_passe', 0.3]]) / 100) * 0.38;
  const dribbleStage = (wavg(a, [['dribble', 0.5], ['agilite', 0.3], ['acceleration', 0.2]]) / 100) * 0.9;
  const dribble = dribbleStage * (0.04 + (shootSkill / 100) * 0.34 * 1.3);

  return {
    minute,
    title: 'Occasion en or',
    prompt: 'Tu te retrouves face au but, le défenseur revient. Que fais-tu ?',
    options: [
      {
        id: 'tir', label: 'Frapper immédiatement', p: shoot,
        success: { text: 'Ta frappe termine au fond des filets !', rating: 1.2, ourGoal: true, playerGoal: true },
        fail: { text: 'Ta frappe est repoussée par le gardien.', rating: -0.1 },
      },
      {
        id: 'passe', label: 'Servir un partenaire démarqué', p: pass,
        success: { text: 'Ta passe trouve un coéquipier qui marque !', rating: 0.9, ourGoal: true, playerAssist: true },
        fail: { text: 'Ta passe est coupée par la défense.', rating: -0.2 },
      },
      {
        id: 'dribble', label: 'Éliminer le défenseur', p: dribble,
        success: { text: 'Tu dribbles ton vis-à-vis et tu marques !', rating: 1.4, ourGoal: true, playerGoal: true },
        fail: { text: 'Le défenseur te dépossède.', rating: -0.4 },
      },
    ],
  };
}

function midfieldMoment(a: PlayerAttributes, minute: number): KeyMoment {
  const through = 0.04 + (wavg(a, [['finesse_passe', 0.4], ['vista', 0.3], ['passes_courtes', 0.3]]) / 100) * 0.38;
  const long = 0.02 + (wavg(a, [['tirs_lointains', 0.5], ['puissance_tir', 0.25], ['effets', 0.25]]) / 100) * 0.25;
  const keep = 0.55 + (wavg(a, [['controle', 0.5], ['passes_courtes', 0.5]]) / 100) * 0.4;

  return {
    minute,
    title: 'Ballon dans l\'axe',
    prompt: 'Tu reçois le ballon entre les lignes. Une ouverture s\'offre à toi.',
    options: [
      {
        id: 'profondeur', label: 'Passe en profondeur', p: through,
        success: { text: 'Ta passe lumineuse met ton attaquant seul : but !', rating: 1.0, ourGoal: true, playerAssist: true },
        fail: { text: 'Ton ballon est trop long, la défense dégage.', rating: -0.2 },
      },
      {
        id: 'tir_lointain', label: 'Tenter ta chance de loin', p: long,
        success: { text: 'Quelle frappe de loin ! Le ballon finit dans la lucarne.', rating: 1.3, ourGoal: true, playerGoal: true },
        fail: { text: 'Ta frappe passe au-dessus.', rating: -0.1 },
      },
      {
        id: 'conserver', label: 'Conserver et temporiser', p: keep,
        success: { text: 'Tu gardes le ballon et fais respirer l\'équipe.', rating: 0.2 },
        fail: { text: 'Tu perds le ballon sous la pression.', rating: -0.3 },
      },
    ],
  };
}

function cornerMoment(a: PlayerAttributes, minute: number): KeyMoment {
  const head = 0.02 + (wavg(a, [['tete_offensive', 0.5], ['detente', 0.25], ['force', 0.25]]) / 100) * 0.28;
  return {
    minute,
    title: 'Corner pour ton équipe',
    prompt: 'Le coach te demande de monter. Le ballon arrive au second poteau.',
    options: [
      {
        id: 'tete', label: 'Monter à la reprise de la tête', p: head,
        success: { text: 'Tu t\'élèves plus haut que tout le monde : but de la tête !', rating: 1.5, ourGoal: true, playerGoal: true },
        fail: { text: 'Ta tête passe à côté.', rating: -0.1 },
      },
      {
        id: 'rester', label: 'Rester en couverture', p: 0.9,
        success: { text: 'Tu restes bien placé derrière.', rating: 0.15 },
        fail: { text: 'Tu hésites trop longtemps.', rating: -0.1 },
      },
    ],
  };
}

function defenseMoment(a: PlayerAttributes, minute: number): KeyMoment {
  const tackle = 0.25 + (wavg(a, [['tackle_debout', 0.5], ['marquage', 0.3], ['agressivite', 0.2]]) / 100) * 0.55;
  const inter = 0.2 + (wavg(a, [['interceptions', 0.5], ['lecture_jeu', 0.3], ['placement_defensif', 0.2]]) / 100) * 0.5;
  const slide = 0.15 + (wavg(a, [['tackle_glisse', 0.6], ['agilite', 0.2], ['equilibre', 0.2]]) / 100) * 0.6;

  return {
    minute,
    title: 'Danger dans ta zone',
    prompt: 'Un attaquant file vers ton but. Il faut réagir !',
    options: [
      {
        id: 'tacle', label: 'Tacle debout', p: tackle,
        success: { text: 'Tacle propre, tu récupères le ballon !', rating: 0.7 },
        fail: {
          text: 'Tu es battu... l\'attaquant frappe et marque.',
          altText: 'Tu es battu mais sa frappe passe à côté.',
          rating: -0.5, theirGoal: true, chanceGoal: 0.55,
        },
      },
      {
        id: 'interception', label: 'Couper la ligne de passe', p: inter,
        success: { text: 'Tu coupes la passe au bon moment.', rating: 0.5 },
        fail: {
          text: 'Trop tard, l\'adversaire marque.',
          altText: 'Tu es en retard mais ton gardien sauve l\'équipe.',
          rating: -0.25, theirGoal: true, chanceGoal: 0.35,
        },
      },
      {
        id: 'tacle_glisse', label: 'Tacle glissé de la dernière chance', p: slide,
        success: { text: 'Tacle glissé salvateur ! Le stade se lève.', rating: 1.0 },
        fail: {
          text: 'Tacle manqué, faute dans la surface : pénalty transformé.',
          altText: 'Tacle manqué, faute ! Le pénalty est arrêté.',
          rating: -0.9, theirGoal: true, chanceGoal: 0.75, card: true,
        },
      },
    ],
  };
}

function buildMoment(position: string, kind: 'attaque' | 'defense', a: PlayerAttributes, minute: number): KeyMoment {
  if (kind === 'defense') return defenseMoment(a, minute);
  if (position === 'MOC') return midfieldMoment(a, minute);
  if (position === 'DC') return cornerMoment(a, minute);
  return strikerMoment(a, minute);
}

function bestOption(moment: KeyMoment): MomentOption {
  return moment.options.reduce((best, o) => (o.p > best.p ? o : best));
}

// ---------------------------------------------------------------
// ÉTAT DU MATCH
// ---------------------------------------------------------------
function pushEvent(s: MatchState, minute: number, type: MatchEventType, text: string): MatchState {
  return { ...s, events: [...s.events, { minute, type, text }] };
}

export function startMatch(ctx: MatchContext, fixture: Fixture, participation: Participation): MatchState {
  const enterMinute =
    participation === 'titulaire' ? 0 : participation === 'remplacant' ? 55 + Math.floor(Math.random() * 16) : 999;

  return {
    fixture,
    participation,
    position: ctx.position,
    minute: 0,
    enterMinute,
    sentOffMinute: null,
    goalsFor: 0,
    goalsAgainst: 0,
    playerGoals: 0,
    playerAssists: 0,
    yellowCards: 0,
    rating: 6.0,
    momentsCount: 0,
    lastMomentMinute: -99,
    pendingMoment: null,
    finished: false,
    events: [
      {
        minute: 0,
        type: 'coup_envoi',
        text: `Coup d'envoi ${fixture.home ? 'à domicile' : 'à l\'extérieur'} contre ${fixture.opponentName}.`,
      },
    ],
  };
}

function applyEffect(s: MatchState, eff: MomentEffect, minute: number): MatchState {
  let ourGoal = eff.ourGoal ?? false;
  let theirGoal = eff.theirGoal ?? false;
  let playerGoal = eff.playerGoal ?? false;
  let playerAssist = eff.playerAssist ?? false;
  let text = eff.text;

  if (eff.chanceGoal !== undefined && !chance(eff.chanceGoal)) {
    ourGoal = false;
    theirGoal = false;
    playerGoal = false;
    playerAssist = false;
    text = eff.altText ?? eff.text;
  }

  const next: MatchState = { ...s, rating: s.rating + eff.rating };
  const events = [...s.events];

  if (ourGoal) {
    next.goalsFor += 1;
    events.push({ minute, type: 'but', text });
  } else if (theirGoal) {
    next.goalsAgainst += 1;
    events.push({ minute, type: 'but_encaisse', text });
  } else {
    events.push({ minute, type: 'moment', text });
  }
  if (playerGoal) next.playerGoals += 1;
  if (playerAssist) next.playerAssists += 1;

  if (eff.card) {
    next.yellowCards += 1;
    if (next.yellowCards >= 2) {
      next.sentOffMinute = minute;
      next.rating -= 1.0;
      events.push({ minute, type: 'carton', text: 'Second jaune : tu es expulsé !' });
    } else {
      events.push({ minute, type: 'carton', text: 'Carton jaune pour toi.' });
    }
  }

  next.events = events;
  return next;
}

function resolveOption(s: MatchState, moment: KeyMoment, option: MomentOption): MatchState {
  const ok = chance(option.p);
  return applyEffect({ ...s, pendingMoment: null }, ok ? option.success : option.fail, moment.minute);
}

// Le joueur choisit une option pendant un moment clé
export function resolveMoment(state: MatchState, optionId: string): MatchState {
  const moment = state.pendingMoment;
  if (!moment) return state;
  const option = moment.options.find((o) => o.id === optionId) ?? bestOption(moment);
  return resolveOption(state, moment, option);
}

// Occasion d'équipe (sans implication du joueur)
function resolveTeamChance(s: MatchState, minute: number, ours: boolean, conv: number): MatchState {
  if (chance(conv)) {
    if (ours) {
      return {
        ...pushEvent(s, minute, 'but', `But de ${pick(TEAMMATES)} !`),
        goalsFor: s.goalsFor + 1,
      };
    }
    return {
      ...pushEvent(s, minute, 'but_encaisse', `${s.fixture.opponentName} marque.`),
      goalsAgainst: s.goalsAgainst + 1,
    };
  }
  if (chance(0.4)) {
    return pushEvent(
      s,
      minute,
      'occasion',
      `Belle occasion pour ${ours ? 'ton équipe' : s.fixture.opponentName}, mais elle est manquée.`
    );
  }
  return s;
}

// ---------------------------------------------------------------
// BOUCLE : avance jusqu'au prochain moment clé ou la fin du match
// ---------------------------------------------------------------
export function advanceMatch(state: MatchState, ctx: MatchContext, interactive: boolean): MatchState {
  if (state.finished || state.pendingMoment) return state;

  let s: MatchState = { ...state };
  const inv = INVOLVE[ctx.position] ?? INVOLVE.BU;

  for (let minute = s.minute + 1; minute <= 90; minute++) {
    s = { ...s, minute };

    if (minute === s.enterMinute) s = pushEvent(s, minute, 'entree', 'Tu entres en jeu !');
    if (minute === 45) {
      s = pushEvent(s, minute, 'mi_temps', `Mi-temps : ${s.goalsFor} - ${s.goalsAgainst}`);
    }

    const onPitch = minute >= s.enterMinute && s.sentOffMinute === null;
    const us =
      ctx.teamStrength +
      (s.fixture.home ? 3 : 0) +
      (onPitch ? (ctx.ovr - 55) * 0.15 : 0) -
      (s.sentOffMinute !== null ? 8 : 0);
    const them = s.fixture.opponentStrength;
    const ratioUs = us / (us + them);

    if (chance(0.008)) {
      s = pushEvent(s, minute, 'carton', `Carton jaune pour ${chance(0.5) ? pick(TEAMMATES) : 'l\'adversaire'}.`);
    }

    // --- Occasion pour ton équipe
    if (chance(CHANCE_RATE * ratioUs * 2)) {
      if (onPitch && chance(inv.attack)) {
        const moment = buildMoment(ctx.position, 'attaque', ctx.attrs, minute);
        if (interactive && canPrompt(s, minute)) return promptMoment(s, moment);
        s = resolveOption(s, moment, bestOption(moment));
      } else {
        s = resolveTeamChance(s, minute, true, clamp(0.2 + (us - them) / 200, 0.08, 0.4));
      }
    }

    // --- Occasion pour l'adversaire
    if (chance(CHANCE_RATE * (1 - ratioUs) * 2)) {
      if (onPitch && chance(inv.defense)) {
        const moment = buildMoment(ctx.position, 'defense', ctx.attrs, minute);
        if (interactive && canPrompt(s, minute)) return promptMoment(s, moment);
        s = resolveOption(s, moment, bestOption(moment));
      } else {
        s = resolveTeamChance(s, minute, false, clamp(0.2 + (them - us) / 200, 0.08, 0.4));
      }
    }
  }

  s = pushEvent(s, 90, 'fin', `Fin du match : ${s.goalsFor} - ${s.goalsAgainst}`);
  return { ...s, finished: true };
}

function canPrompt(s: MatchState, minute: number): boolean {
  return s.momentsCount < MAX_MOMENTS && minute - s.lastMomentMinute >= MIN_GAP && minute <= 88;
}

function promptMoment(s: MatchState, moment: KeyMoment): MatchState {
  return {
    ...pushEvent(s, moment.minute, 'occasion', moment.title),
    pendingMoment: moment,
    momentsCount: s.momentsCount + 1,
    lastMomentMinute: moment.minute,
  };
}

// ---------------------------------------------------------------
// RÉSULTAT FINAL
// ---------------------------------------------------------------
export function toMatchResult(s: MatchState): MatchResult {
  const played = s.participation !== 'tribune';
  let rating: number | null = null;
  let minutesPlayed = 0;

  if (played) {
    let r = s.rating;
    if (s.goalsFor > s.goalsAgainst) r += 0.3;
    else if (s.goalsFor < s.goalsAgainst) r -= 0.2;
    if (s.position === 'DC') {
      r += s.goalsAgainst === 0 ? 0.5 : -0.15 * Math.min(s.goalsAgainst, 4);
    }
    rating = Math.round(clamp(r, 3, 10) * 10) / 10;
    minutesPlayed = Math.max(0, (s.sentOffMinute ?? 90) - s.enterMinute);
  }

  return {
    fixture: s.fixture,
    participation: s.participation,
    position: s.position,
    goalsFor: s.goalsFor,
    goalsAgainst: s.goalsAgainst,
    playerGoals: s.playerGoals,
    playerAssists: s.playerAssists,
    rating,
    minutesPlayed,
    sentOff: s.sentOffMinute !== null,
    events: s.events,
  };
}

// Simulation rapide (sans décisions du joueur)
export function simulateFullMatch(ctx: MatchContext, fixture: Fixture, participation: Participation): MatchResult {
  const s = advanceMatch(startMatch(ctx, fixture, participation), ctx, false);
  return toMatchResult(s);
}
