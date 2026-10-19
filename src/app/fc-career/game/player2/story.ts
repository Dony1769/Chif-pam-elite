/**
 * FC CAREER 27 — Carrière Joueur : l'histoire.
 *
 * Des personnages qui se souviennent de toi : le coach (celui du club), le
 * capitaine (le meneur du vestiaire), ton agent, un proche, et un rival de ta
 * génération suivi saison après saison. Des dilemmes de vie avec de vraies
 * conséquences (confiance, vestiaire, supporters, moral, argent, fatigue), des
 * réactions des personnages à tes matchs, un journal, et un récit de fin de
 * saison qui raconte l'année. Pur et déterministe.
 */

import type { PlayerCareerState } from "./types";
import { careerTotals, focusSubs, me, myClub, pmsg, pushPlayerInbox, quiet } from "./engine";
import { createRng, seedFromString } from "../utils/random";
import { seasonLabel } from "../domain/calendar";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const AGENTS = ["Marco Delvecchio", "Sarah Kone", "Jonas Ritter", "Inès Morel", "Rafael Duarte", "Kwame Asante", "Lucie Bernard", "Diego Saavedra"];
const RELATIVES = ["ta mère", "ton père", "ta grand-mère", "ton grand frère", "ta sœur"];

export interface Effects { trust?: number; captain?: number; fans?: number; rep?: number; morale?: number; bank?: number; fatigue?: number; xp?: number; agent?: number }
export interface Choice { id: string; label: string; effects: Effects; outcome: string; /** Marque un souvenir qui débloque une suite plus tard */ flag?: string }
export interface Dilemma { id: string; from: string; role: string; title: string; text: string; choices: Choice[]; expiresAt: number }
export interface JournalEntry { season: number; week: number; text: string; tone: "good" | "bad" | "neutral" }
export interface SeasonRecap {
  season: number;
  title: string;
  lines: string[];
  numbers: { apps: number; goals: number; assists: number; rating: number };
  best?: { rating: number; goals: number; vs: string };
  rival?: { name: string; club: string; goals: number; assists: number; mineGoals: number; mineAssists: number; verdict: string };
  relations: { coach: number; captain: number; fans: number; agent: number };
}
export interface StoryState {
  agent: string;
  agentRel: number;
  captainId?: string;
  captainRel: number;
  relative: string;
  rivalId?: string;
  pending: Dilemma | null;
  journal: JournalEntry[];
  /** Meilleur match de la saison en cours */
  best?: { season: number; rating: number; goals: number; vs: string };
  /** Dilemmes déjà proposés (identifiants de modèle + saison) */
  seen: string[];
  recap: SeasonRecap | null;
  lastTalk?: number;
  /** Souvenirs des choix passés (semaine absolue) : ouvrent des suites */
  flags?: Record<string, number>;
}

const idx = (s: PlayerCareerState) => s.shadow.world.season * 100 + s.shadow.world.currentWeek;
const coachName = (s: PlayerCareerState) => {
  const c = s.shadow.world.coaches.find(x => x.clubId === myClub(s).id && x.teamLevel === "first_team" && x.status === "active");
  return c ? `${c.firstName} ${c.lastName}` : "Le coach";
};
const nameOf = (s: PlayerCareerState, id?: string) => {
  const p = s.shadow.world.players.find(x => x.id === id);
  return p ? `${p.firstName} ${p.lastName}`.trim() : "";
};

/** Capitaine : le meneur (ou le plus expérimenté) de l'effectif. */
export function pickCaptain(s: PlayerCareerState): string | undefined {
  const mates = s.shadow.world.players.filter(p => p.clubId === myClub(s).id && p.id !== s.profile.id);
  return [...mates].sort((a, b) => (b.personality === "leader" ? 20 : 0) + b.age / 2 + b.overall / 3 - ((a.personality === "leader" ? 20 : 0) + a.age / 2 + a.overall / 3))[0]?.id;
}

/** Rival : même poste, même génération, le plus gros potentiel du monde, dans un autre club. */
export function pickRival(s: PlayerCareerState): string | undefined {
  const mine = me(s);
  return s.shadow.world.players
    .filter(p => p.id !== s.profile.id && p.clubId !== mine.clubId && p.clubId !== "retired" && Math.abs(p.age - mine.age) <= 1 && p.position === s.profile.position)
    .sort((a, b) => b.potential - a.potential || b.overall - a.overall)[0]?.id;
}

export function ensureStory(s: PlayerCareerState): PlayerCareerState {
  if (!s.career) return s;
  if (s.career.story) {
    // Changement de club : un nouveau capitaine
    const cap = s.shadow.world.players.find(p => p.id === s.career!.story!.captainId);
    if (cap && cap.clubId === myClub(s).id) return s;
    return { ...s, career: { ...s.career, story: { ...s.career.story, captainId: pickCaptain(s), captainRel: 45 } } };
  }
  const rng = createRng(seedFromString(`${s.shadow.world.seed}-story-${s.profile.id}`));
  const story: StoryState = {
    agent: AGENTS[rng.int(0, AGENTS.length - 1)], agentRel: 60, captainId: pickCaptain(s), captainRel: 50,
    relative: RELATIVES[rng.int(0, RELATIVES.length - 1)], rivalId: pickRival(s), pending: null, journal: [], seen: [], recap: null,
  };
  return { ...s, career: { ...s.career, story } };
}

const ST = (s: PlayerCareerState) => s.career!.story!;
const withStory = (s: PlayerCareerState, patch: Partial<StoryState>): PlayerCareerState => ({ ...s, career: { ...s.career!, story: { ...ST(s), ...patch } } });
function journal(s: PlayerCareerState, text: string, tone: JournalEntry["tone"] = "neutral"): PlayerCareerState {
  return withStory(s, { journal: [...ST(s).journal, { season: s.shadow.world.season, week: s.shadow.world.currentWeek, text, tone }].slice(-120) });
}

// ─── Dilemmes ────────────────────────────────────────────────────────────────

interface Template { key: string; when: (s: PlayerCareerState) => boolean; make: (s: PlayerCareerState) => Omit<Dilemma, "id" | "expiresAt">; /** Une seule fois dans la carrière (les suites) */ once?: boolean }

/** Nombre de semaines depuis un souvenir (Infinity s'il n'existe pas). */
const since = (s: PlayerCareerState, flag: string) => { const f = ST(s).flags?.[flag]; return f === undefined ? -1 : weeksBetweenIdx(f, idx(s)); };
function weeksBetweenIdx(a: number, b: number) { return (Math.floor(b / 100) - Math.floor(a / 100)) * 52 + (b % 100) - (a % 100); }
const mateName = (s: PlayerCareerState, k = 0) => {
  const mates = s.shadow.world.players.filter(p => p.clubId === myClub(s).id && p.id !== s.profile.id && p.id !== ST(s).captainId).sort((a, b) => b.overall - a.overall);
  const m = mates[k % Math.max(1, mates.length)];
  return m ? `${m.firstName} ${m.lastName}`.trim() : "Un coéquipier";
};

const TEMPLATES: Template[] = [
  {
    key: "dinner", when: s => !!ST(s).captainId,
    make: s => ({ from: nameOf(s, ST(s).captainId), role: "capitaine", title: "Dîner d'équipe", text: `${nameOf(s, ST(s).captainId)} organise un dîner avec tout le groupe, la veille du match. « Ça soude un vestiaire. Tu viens ? »`, choices: [
      { id: "go", label: "J'y vais", effects: { captain: 10, morale: 4, fatigue: 6 }, outcome: "Soirée mémorable : le vestiaire t'adopte, mais tu te couches tard.", flag: "squad" },
      { id: "rest", label: "Je me repose", effects: { captain: -6, fatigue: -6 }, outcome: "Tu es frais, mais certains te trouvent distant." },
    ] }),
  },
  {
    key: "ad", when: () => true,
    make: s => ({ from: ST(s).agent, role: "agent", title: "Tournage publicitaire", text: `« Une marque d'équipement veut tourner une pub avec toi. ${money(adFee(s))}, une journée de tournage. Je dis oui ? »`, choices: [
      { id: "yes", label: "Accepter", effects: { bank: adFee(s), fans: 2, fatigue: 5, agent: 6 }, outcome: "La pub tourne en boucle. Ton agent est ravi.", flag: "brand" },
      { id: "no", label: "Rester concentré", effects: { trust: 2, agent: -5 }, outcome: "Le coach apprécie ta concentration. Ton agent, beaucoup moins." },
    ] }),
  },
  {
    key: "critic", when: s => s.coachTrust < 60,
    make: s => {
      const mate = s.shadow.world.players.filter(p => p.clubId === myClub(s).id && p.id !== s.profile.id && p.id !== ST(s).captainId).sort((a, b) => b.overall - a.overall)[0];
      const n = mate ? `${mate.firstName} ${mate.lastName}`.trim() : "Un coéquipier";
      return { from: n, role: "coéquipier", title: "Tension au vestiaire", text: `${n} lâche devant tout le monde : « Certains devraient courir un peu plus. » Tout le monde se tourne vers toi.`, choices: [
        { id: "public", label: "Répondre sèchement", effects: { captain: -6, morale: 4, rep: 1 }, outcome: "Le ton monte. Tu as du caractère, mais le capitaine doit calmer le jeu." },
        { id: "private", label: "En parler en tête-à-tête", effects: { captain: 5, trust: 2 }, outcome: "Discussion franche après l'entraînement. L'incident est clos." },
        { id: "pitch", label: "Répondre sur le terrain", effects: { morale: 6, xp: 1 }, outcome: "Tu ne dis rien et tu redoubles d'efforts à l'entraînement." },
      ] };
    },
  },
  {
    key: "extra", when: () => true,
    make: s => ({ from: coachName(s), role: "coach", title: "Séance supplémentaire", text: `« Reste après l'entraînement. On va bosser ton ${s.profile.position === "GK" ? "jeu au pied" : "dernier geste"}, toi et moi. »`, choices: [
      { id: "stay", label: "Rester", effects: { trust: 5, xp: 2, fatigue: 8 }, outcome: "Une heure de plus, seul avec le coach. Il voit que tu en veux." },
      { id: "leave", label: "Décliner poliment", effects: { trust: -3, fatigue: -4 }, outcome: "Tu rentres te reposer. Le coach note." },
    ] }),
  },
  {
    key: "young", when: s => me(s).age >= 24,
    make: s => ({ from: "Centre de formation", role: "jeune", title: "Un gamin du centre", text: "Un jeune de 16 ans du centre de formation te demande des conseils. Il dit que tu es son modèle.", choices: [
      { id: "mentor", label: "Le prendre sous ton aile", effects: { fans: 3, captain: 3, fatigue: 3 }, outcome: "Tu passes du temps avec lui. Le club en parle sur ses réseaux.", flag: "mentor" },
      { id: "later", label: "Pas maintenant", effects: {}, outcome: "Tu lui conseilles de travailler dur. Il repart un peu déçu." },
    ] }),
  },
  {
    key: "social", when: s => !!s.lastMatch && s.lastMatch.played && (s.lastMatch.rating ?? 7) < 6.2,
    make: s => ({ from: ST(s).agent, role: "agent", title: "Polémique sur les réseaux", text: "Après ton match raté, les critiques pleuvent sur les réseaux. « Il faut réagir… ou pas. Tu veux faire quoi ? »", choices: [
      { id: "sorry", label: "S'excuser auprès des supporters", effects: { fans: 4, morale: -2 }, outcome: "Message sincère. Les supporters saluent ton honnêteté." },
      { id: "clap", label: "Répondre aux critiques", effects: { fans: -5, rep: 2, morale: 3 }, outcome: "Ta réponse fait le buzz. Une partie des supporters ne l'a pas aimée.", flag: "buzz" },
      { id: "silent", label: "Couper son téléphone", effects: { morale: 2 }, outcome: "Tu coupes tout pour la semaine. Le calme revient." },
    ] }),
  },
  {
    key: "family", when: () => true,
    make: s => ({ from: ST(s).relative, role: "famille", title: "Au stade ce week-end", text: `${cap(ST(s).relative)} veut venir te voir jouer ce week-end. « Je serai en tribune, fais-moi honneur. »`, choices: [
      { id: "invite", label: "Réserver la meilleure place", effects: { morale: 8, bank: -2000 }, outcome: `Tu sais que ${ST(s).relative} sera là. Ça change tout.` },
      { id: "nextime", label: "Plutôt le prochain match", effects: { morale: -2 }, outcome: "Tu préfères rester concentré. La famille comprend… à peu près." },
    ] }),
  },
  {
    key: "rival", when: s => !!ST(s).rivalId,
    make: s => {
      const r = nameOf(s, ST(s).rivalId);
      return { from: "Presse", role: "journaliste", title: "Ton rival te cherche", text: `${r} déclare en interview : « Lui ? On n'est pas dans la même catégorie. » Les journalistes attendent ta réponse.`, choices: [
        { id: "reply", label: "« Rendez-vous sur le terrain »", effects: { rep: 2, morale: 5, trust: -1 }, outcome: `Ta réponse fait la une. La rivalité avec ${r} est lancée.`, flag: "rivalry" },
        { id: "ignore", label: "Ne pas répondre", effects: { trust: 2, fans: 1 }, outcome: "Tu laisses parler. Le coach apprécie ton calme." },
      ] };
    },
  },
  {
    key: "charity", when: s => (s.career?.bank ?? 0) > 50_000,
    make: s => ({ from: ST(s).agent, role: "agent", title: "Une fondation", text: `Une association d'enfants de ta ville natale te sollicite. Un don de ${money(Math.round((s.career!.bank * 0.05) / 100) * 100)} changerait beaucoup pour eux.`, choices: [
      { id: "give", label: "Faire le don", effects: { bank: -Math.round((s.career!.bank * 0.05) / 100) * 100, fans: 6, rep: 1 }, outcome: "Le don est rendu public par l'association. Les supporters adorent.", flag: "foundation" },
      { id: "no", label: "Pas cette fois", effects: {}, outcome: "Tu déclines poliment." },
    ] }),
  },
  {
    key: "bench", when: s => s.selection === "bench" || s.selection === "out",
    make: s => ({ from: coachName(s), role: "coach", title: "Explication avec le coach", text: "Encore sur le banc. Tu croises le coach dans le couloir : c'est le moment de dire ce que tu penses… ou pas.", choices: [
      { id: "complain", label: "Exiger plus de temps de jeu", effects: { trust: -8, rep: 1, morale: 3 }, outcome: "Le coach n'aime pas qu'on lui force la main.", flag: "rebel" },
      { id: "work", label: "Demander ce qu'il attend de toi", effects: { trust: 5, xp: 1 }, outcome: "« Plus d'intensité sans ballon. » Tu sais quoi travailler." },
    ] }),
  },
  // ─── Suites : tes choix d'hier reviennent ───────────────────────────────────
  {
    key: "mentor2", once: true, when: s => since(s, "mentor") >= 40,
    make: () => ({ from: "Centre de formation", role: "jeune", title: "Le gamin a signé pro", text: "Le jeune que tu avais conseillé vient de signer son premier contrat professionnel. Il demande à porter un numéro proche du tien, « pour ne jamais oublier ».", choices: [
      { id: "yes", label: "Lui offrir ton ancien maillot", effects: { fans: 5, captain: 4, morale: 5 }, outcome: "Photo des deux maillots côte à côte : le club en fait sa une." },
      { id: "advice", label: "Lui dire de se faire son propre nom", effects: { rep: 1, morale: 2 }, outcome: "« Écris ta propre histoire. » Il hoche la tête, ému." },
    ] }),
  },
  {
    key: "brand2", once: true, when: s => since(s, "brand") >= 30 && s.profile.reputation >= 35,
    make: s => ({ from: ST(s).agent, role: "agent", title: "Égérie de la marque", text: `« La marque de la pub veut faire de toi son visage pour trois ans. ${money(adFee(s) * 6)}, mais quatre tournages par saison. »`, choices: [
      { id: "sign", label: "Signer", effects: { bank: adFee(s) * 6, fatigue: 8, agent: 8, rep: 2, trust: -2 }, outcome: "Ton visage s'affiche dans toutes les gares. Le coach trouve que ça fait beaucoup." },
      { id: "decline", label: "Rester discret", effects: { trust: 3, agent: -8 }, outcome: "Tu préfères le terrain aux plateaux. Ton agent boude une semaine." },
    ] }),
  },
  {
    key: "rivalry2", once: true, when: s => since(s, "rivalry") >= 26 && !!ST(s).rivalId,
    make: s => ({ from: "Presse", role: "journaliste", title: "Face-à-face télévisé", text: `Une chaîne veut vous réunir, ${nameOf(s, ST(s).rivalId)} et toi, sur le même plateau. Tout le pays attend ce duel.`, choices: [
      { id: "go", label: "Accepter le duel", effects: { rep: 3, fans: 3, fatigue: 3 }, outcome: "Échanges piquants mais respectueux. L'audience est record." },
      { id: "hands", label: "Proposer une poignée de main", effects: { fans: 4, trust: 2 }, outcome: "Vous enterrez la hache de guerre en direct. Le public applaudit." },
      { id: "no", label: "Refuser", effects: { rep: -1, morale: 2 }, outcome: "La chaîne invite ton rival seul. Il parle de toi pendant dix minutes." },
    ] }),
  },
  {
    key: "foundation2", once: true, when: s => since(s, "foundation") >= 30,
    make: () => ({ from: "L'association", role: "fondation", title: "Le terrain porte ton nom", text: "Grâce à ton don, l'association inaugure un terrain synthétique dans ta ville natale. Ils aimeraient que tu coupes le ruban.", choices: [
      { id: "go", label: "Y aller", effects: { fans: 6, morale: 8, fatigue: 4, rep: 1 }, outcome: "Deux cents enfants en maillot à ton nom. Tu ne t'en remets pas." },
      { id: "video", label: "Envoyer une vidéo", effects: { fans: 2 }, outcome: "Ta vidéo est projetée pendant la cérémonie." },
    ] }),
  },
  {
    key: "rebel2", once: true, when: s => since(s, "rebel") >= 6 && since(s, "rebel") <= 40,
    make: s => ({ from: coachName(s), role: "coach", title: "Le coach n'a pas oublié", text: "« La dernière fois, tu m'as manqué de respect devant le staff. Je veux savoir où on en est. »", choices: [
      { id: "sorry", label: "Présenter des excuses", effects: { trust: 10, morale: -2 }, outcome: "Le coach accepte. « On repart de zéro. »" },
      { id: "firm", label: "Assumer tes mots", effects: { trust: -6, rep: 1, captain: -3 }, outcome: "Le bras de fer continue. Le vestiaire retient son souffle." },
    ] }),
  },
  {
    key: "buzz2", once: true, when: s => since(s, "buzz") >= 20,
    make: s => ({ from: ST(s).agent, role: "agent", title: "Un documentaire sur toi", text: "Ta réponse aux critiques a fait le tour du web. Une plateforme veut te suivre caméra au poing pendant six mois.", choices: [
      { id: "yes", label: "Ouvrir les portes", effects: { fans: 5, rep: 3, fatigue: 6, captain: -4, bank: adFee(s) * 3 }, outcome: "Le documentaire cartonne. Certains coéquipiers n'aiment pas les caméras." },
      { id: "no", label: "Garder ta vie privée", effects: { captain: 3, morale: 2 }, outcome: "Tu refuses. Le vestiaire apprécie ta discrétion." },
    ] }),
  },
  {
    key: "squad2", once: true, when: s => since(s, "squad") >= 30 && ST(s).captainRel >= 60,
    make: s => ({ from: nameOf(s, ST(s).captainId), role: "capitaine", title: "Vice-capitaine ?", text: `${nameOf(s, ST(s).captainId)} : « Le groupe t'écoute. J'aimerais que tu sois mon vice-capitaine. »`, choices: [
      { id: "yes", label: "Accepter le brassard", effects: { captain: 8, trust: 4, rep: 2, fatigue: 2 }, outcome: "Tu portes le brassard quand le capitaine sort. Une nouvelle responsabilité." },
      { id: "no", label: "Te concentrer sur ton jeu", effects: { morale: 2 }, outcome: "Tu déclines avec respect. Il comprend." },
    ] }),
  },
  // ─── Vie de vestiaire et vie privée ──────────────────────────────────────────
  {
    key: "tvinterview", when: s => !!s.lastMatch?.played && (s.lastMatch.rating ?? 0) >= 7.5,
    make: () => ({ from: "Diffuseur", role: "journaliste", title: "Au micro après le match", text: "Tu sors du terrain en héros. Le journaliste bord terrain te tend le micro : « Un mot pour vos supporters ? »", choices: [
      { id: "team", label: "Mettre l'équipe en avant", effects: { captain: 6, trust: 2 }, outcome: "« C'est la victoire du groupe. » Le vestiaire apprécie." },
      { id: "me", label: "Savourer ta performance", effects: { rep: 2, fans: 2, captain: -3 }, outcome: "« J'avais promis de répondre présent. » Ça plaît aux supporters, moins au vestiaire." },
      { id: "fans", label: "Dédier le match aux supporters", effects: { fans: 6 }, outcome: "La tribune chante ton nom pendant cinq minutes." },
    ] }),
  },
  {
    key: "hospital", when: () => true,
    make: s => ({ from: nameOf(s, ST(s).captainId) || "Le vestiaire", role: "capitaine", title: "Un coéquipier opéré", text: `${mateName(s, 2)} s'est fait opérer du genou. Plusieurs joueurs passent le voir ce soir à la clinique.`, choices: [
      { id: "visit", label: "Lui rendre visite", effects: { captain: 6, morale: 3, fatigue: 2 }, outcome: "Il est touché. « Je reviens vite, garde-moi ma place chaude. »" },
      { id: "msg", label: "Lui envoyer un message", effects: { captain: 1 }, outcome: "Un petit mot sympa. Il répond par un pouce." },
    ] }),
  },
  {
    key: "birthday", when: () => true,
    make: s => ({ from: mateName(s, 1), role: "coéquipier", title: "Anniversaire en pleine semaine", text: `${mateName(s, 1)} fête ses 30 ans mardi soir, avec DJ et invités. Match samedi.`, choices: [
      { id: "party", label: "Faire la fête", effects: { captain: 6, morale: 6, fatigue: 10, trust: -2 }, outcome: "Soirée légendaire. Le préparateur physique, lui, n'a pas ri." },
      { id: "early", label: "Passer une heure et rentrer", effects: { captain: 3, fatigue: 3 }, outcome: "Tu fais acte de présence et tu rentres sagement." },
      { id: "skip", label: "Rester chez toi", effects: { captain: -3, fatigue: -3 }, outcome: "Tu regardes des matchs en replay. Tu es frais." },
    ] }),
  },
  {
    key: "videogame", when: s => s.profile.reputation >= 40,
    make: s => ({ from: ST(s).agent, role: "agent", title: "Ta carte dans un jeu vidéo", text: "Un éditeur de jeu de foot veut scanner ton visage et tes gestes pour sa prochaine édition. Petite rémunération, gros coup de projecteur.", choices: [
      { id: "scan", label: "Passer au scan", effects: { rep: 2, fans: 3, bank: Math.round(adFee(s) / 2), agent: 3 }, outcome: "Te voilà jouable. Les enfants du quartier se battent pour te prendre." },
      { id: "no", label: "Pas intéressé", effects: { agent: -3 }, outcome: "Ta carte sortira avec un visage générique. Tant pis." },
    ] }),
  },
  {
    key: "nutrition", when: s => (s.career?.bank ?? 0) > 20_000,
    make: s => ({ from: ST(s).agent, role: "agent", title: "Un nutritionniste privé", text: "Un nutritionniste qui suit plusieurs internationaux peut te prendre en charge toute la saison. C'est un investissement.", choices: [
      { id: "hire", label: "L'engager", effects: { bank: -Math.max(8_000, Math.round(s.contract.wage * 2 / 1000) * 1000), fatigue: -10, xp: 2, morale: 2 }, outcome: "Nouvelle hygiène de vie. Tu récupères plus vite." },
      { id: "no", label: "Faire confiance au staff du club", effects: { trust: 2 }, outcome: "Le staff du club apprécie ta confiance." },
    ] }),
  },
  {
    key: "mental", when: s => !!s.lastMatch?.played && (s.lastMatch.rating ?? 7) < 6.4,
    make: () => ({ from: "Staff", role: "préparateur mental", title: "Un coach mental", text: "Le préparateur mental du club te propose quelques séances pour retrouver confiance devant le but.", choices: [
      { id: "yes", label: "Essayer", effects: { morale: 8, xp: 1, fatigue: 1 }, outcome: "Visualisation, respiration. Tu repars plus serein." },
      { id: "no", label: "Ça va passer tout seul", effects: { morale: -1 }, outcome: "Tu préfères travailler sur le terrain." },
    ] }),
  },
  {
    key: "autographs", when: () => true,
    make: () => ({ from: "Club", role: "communication", title: "Séance de dédicaces", text: "Trois cents supporters attendent à la sortie de l'entraînement, sous la pluie. Le bus part dans dix minutes.", choices: [
      { id: "sign", label: "Signer jusqu'au dernier", effects: { fans: 6, fatigue: 3, trust: -1 }, outcome: "Tu rates le bus et rentres en taxi, trempé mais heureux." },
      { id: "quick", label: "Quelques photos et le bus", effects: { fans: 2 }, outcome: "Tu signes ce que tu peux avant de partir." },
    ] }),
  },
  {
    key: "secretclub", when: s => s.profile.reputation >= 30 && !s.career?.loan,
    make: s => ({ from: ST(s).agent, role: "agent", title: "Un appel discret", text: "« Un grand club étranger m'a appelé. Rien d'officiel. Je fais fuiter dans la presse pour faire monter les enchères ? »", choices: [
      { id: "leak", label: "Faire fuiter", effects: { rep: 2, agent: 6, fans: -5, trust: -4 }, outcome: "La rumeur fait la une. Les supporters doutent de ta fidélité." },
      { id: "loyal", label: "Affirmer ta fidélité", effects: { fans: 6, trust: 4, agent: -6 }, outcome: "« Je suis bien ici. » Les supporters déploient une banderole." },
      { id: "wait", label: "Attendre une vraie offre", effects: { agent: 2 }, outcome: "Ton agent garde le contact, discrètement." },
    ] }),
  },
  {
    key: "armband", when: s => ST(s).captainRel >= 60 && me(s).age >= 21,
    make: s => ({ from: coachName(s), role: "coach", title: "Le brassard ce week-end", text: `${nameOf(s, ST(s).captainId)} est suspendu. « Tu portes le brassard samedi. Ça te va ? »`, choices: [
      { id: "yes", label: "Avec fierté", effects: { trust: 5, rep: 2, morale: 6 }, outcome: "Tu mènes l'échauffement, tu parles dans le rond central. Un cap de franchi." },
      { id: "no", label: "Proposer un plus ancien", effects: { captain: 4 }, outcome: "Tu laisses le brassard à un vétéran. Le geste est apprécié." },
    ] }),
  },
  {
    key: "bet", when: s => ["ST", "LW", "RW", "AM"].includes(s.profile.position),
    make: s => ({ from: mateName(s, 0), role: "coéquipier", title: "Le pari du vestiaire", text: `${mateName(s, 0)} : « Si tu marques samedi, je paie le resto à tout le monde. Sinon, c'est toi. »`, choices: [
      { id: "deal", label: "Pari tenu", effects: { captain: 4, morale: 4 }, outcome: "Le vestiaire est hilare. La pression monte, mais une bonne pression." },
      { id: "no", label: "Pas de pari avant un match", effects: { trust: 2 }, outcome: "Tu restes sérieux. Le coach, qui écoutait, sourit." },
    ] }),
  },
  {
    key: "privacy", when: s => s.profile.reputation >= 45,
    make: s => ({ from: ST(s).agent, role: "agent", title: "Des photographes devant chez toi", text: "Un magazine people te suit depuis trois jours. Il prépare un article sur ta vie privée.", choices: [
      { id: "lawyer", label: "Envoyer un avocat", effects: { bank: -5_000, morale: 3 }, outcome: "L'article ne sort pas. Ça a un coût." },
      { id: "interview", label: "Accorder une interview cadrée", effects: { fans: 3, rep: 1, morale: -1 }, outcome: "Tu racontes ce que tu veux bien raconter. Plutôt réussi." },
      { id: "ignore", label: "Laisser faire", effects: { morale: -4 }, outcome: "L'article sort. Rien de grave, mais tu es agacé." },
    ] }),
  },
  {
    key: "physio", when: s => (me(s).fatigue ?? 0) >= 55,
    make: () => ({ from: "Staff médical", role: "kiné", title: "Le kiné s'inquiète", text: "« Tes muscles sont tendus. Je recommande de faire l'impasse sur la séance intense de jeudi. »", choices: [
      { id: "rest", label: "Écouter le kiné", effects: { fatigue: -12, trust: -1 }, outcome: "Une séance allégée. Tes jambes te remercient." },
      { id: "train", label: "S'entraîner quand même", effects: { fatigue: 6, trust: 3, xp: 1 }, outcome: "Tu serres les dents. Le coach aime ça, ton corps moins." },
    ] }),
  },
  {
    key: "oldclub", once: true, when: s => !!s.career?.lastMove,
    make: s => ({ from: "Ton ancien club", role: "club formateur", title: "Hommage à ton ancien club", text: "Ton ancien club t'invite à donner le coup d'envoi fictif de son match de gala, en souvenir de tes années là-bas.", choices: [
      { id: "go", label: "Y aller", effects: { fans: 3, morale: 6, fatigue: 3 }, outcome: "Ovation debout. Certains anciens coéquipiers ont les yeux humides." },
      { id: "no", label: "Décliner", effects: { morale: -1 }, outcome: "Tu envoies un message d'excuse. On te comprend." },
    ] }),
  },
  {
    key: "penaltytaker", when: s => s.profile.position !== "GK" && (s.profile.sub.penalties ?? 0) >= 65,
    make: s => ({ from: coachName(s), role: "coach", title: "Qui tire les penaltys ?", text: `Le coach hésite entre ${mateName(s, 0)} et toi pour tirer les penaltys. « Tu te sens prêt ? »`, choices: [
      { id: "me", label: "« Je les veux »", effects: { trust: 2, rep: 1, captain: -3 }, outcome: "Tu deviens tireur désigné. Une responsabilité, un risque." },
      { id: "him", label: "Laisser le titulaire actuel", effects: { captain: 5 }, outcome: "Tu soutiens ton coéquipier. Le groupe apprécie." },
    ] }),
  },
  {
    key: "house", when: s => (s.career?.bank ?? 0) > 150_000,
    make: s => ({ from: ST(s).relative, role: "famille", title: "Une maison pour la famille", text: `${cap(ST(s).relative)} rêve d'une maison avec un jardin. Tu pourrais l'offrir : ${money(Math.round(s.career!.bank * 0.3 / 1000) * 1000)}.`, choices: [
      { id: "buy", label: "Offrir la maison", effects: { bank: -Math.round(s.career!.bank * 0.3 / 1000) * 1000, morale: 12 }, outcome: "Larmes à la remise des clés. Tu joues avec le cœur léger." },
      { id: "later", label: "Plus tard, quand tu seras installé", effects: { morale: -2 }, outcome: "La famille comprend. Le rêve attendra." },
    ] }),
  },
  {
    key: "commission", when: s => s.profile.reputation >= 25,
    make: s => ({ from: ST(s).agent, role: "agent", title: "L'agent veut plus", text: "« Je te trouve des contrats et des pubs. Je veux passer de 5 à 8 % de commission. »", choices: [
      { id: "accept", label: "Accepter", effects: { agent: 12, bank: -Math.round(s.contract.wage * 1.5 / 100) * 100 }, outcome: "Ton agent redouble d'efforts pour toi." },
      { id: "refuse", label: "Refuser", effects: { agent: -12 }, outcome: "Ton agent fait la tête. Il faudra regagner sa confiance." },
      { id: "deal", label: "6 %, pas plus", effects: { agent: 2, bank: -Math.round(s.contract.wage * 0.5 / 100) * 100 }, outcome: "Compromis trouvé. Tout le monde est à peu près content." },
    ] }),
  },
  {
    key: "sickfan", when: () => true,
    make: () => ({ from: "Club", role: "fondation du club", title: "Un jeune supporter à l'hôpital", text: "Un garçon de 9 ans, hospitalisé depuis des mois, a une seule demande : te rencontrer.", choices: [
      { id: "visit", label: "Aller le voir avec un maillot", effects: { fans: 5, morale: 6 }, outcome: "Il n'a pas lâché le maillot de la journée. Toi non plus, tu n'oublieras pas." },
      { id: "video", label: "Lui envoyer une vidéo", effects: { fans: 1 }, outcome: "Il la regarde en boucle, paraît-il." },
    ] }),
  },
  {
    key: "summercamp", when: s => s.shadow.world.currentWeek <= 3 || s.shadow.world.currentWeek >= 50,
    make: s => ({ from: ST(s).agent, role: "agent", title: "Stage d'été", text: "Un ancien Ballon d'Or organise un stage privé d'une semaine pendant les vacances. Peu de places.", choices: [
      { id: "go", label: "S'inscrire", effects: { xp: 3, bank: -10_000, fatigue: 5 }, outcome: "Une semaine à travailler avec une légende. Tu reviens transformé." },
      { id: "rest", label: "Profiter des vacances", effects: { fatigue: -10, morale: 4 }, outcome: "Soleil et famille : tu recharges les batteries." },
    ] }),
  },
  {
    key: "derbyweek", when: () => true,
    make: s => ({ from: "Supporters", role: "groupe de supporters", title: "Semaine de derby", text: `Les ultras demandent aux joueurs de venir les saluer avant le derby, ${coachName(s)} préférerait un huis clos.`, choices: [
      { id: "ultras", label: "Aller saluer le virage", effects: { fans: 7, trust: -3 }, outcome: "Fumigènes et chants : l'ambiance est électrique." },
      { id: "coach", label: "Respecter le huis clos", effects: { trust: 4, fans: -2 }, outcome: "Concentration maximale. Les ultras râlent un peu." },
    ] }),
  },

];

/** Les suites (sans saison) restent mémorisées pour toujours ; le reste est borné. */
function keepSeen(seen: string[]): string[] {
  const once = seen.filter(k => !/-\d+$/.test(k));
  return [...once, ...seen.filter(k => /-\d+$/.test(k)).slice(-120)];
}

function money(v: number) { return v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1).replace(".", ",")} M€` : `${Math.round(v / 1000)} k€`; }
function cap(t: string) { return t.charAt(0).toUpperCase() + t.slice(1); }
function adFee(s: PlayerCareerState) { return Math.max(5_000, Math.round((s.contract.wage * 1.5 * (1 + s.profile.reputation / 50)) / 1000) * 1000); }

/** Applique des effets (bornés) au joueur et aux relations. */
export function applyEffects(s: PlayerCareerState, e: Effects): PlayerCareerState {
  const st = ST(s);
  const players = s.shadow.world.players.map(p => (p.id === s.profile.id ? {
    ...p, morale: clamp(p.morale + (e.morale ?? 0), 5, 100), fatigue: clamp(p.fatigue + (e.fatigue ?? 0), 0, 100),
  } : p));
  // Bonus d'entraînement : quelques points d'expérience sur l'objectif en cours
  let profile = { ...s.profile, reputation: clamp(Math.round((s.profile.reputation + (e.rep ?? 0)) * 10) / 10, 1, 100) };
  if (e.xp) {
    const subXp = { ...profile.subXp };
    for (const k of focusSubs(profile.trainingFocus, profile.position)) subXp[k] = (subXp[k] ?? 0) + 40 * e.xp;
    profile = { ...profile, subXp };
  }
  return {
    ...s, coachTrust: clamp(s.coachTrust + (e.trust ?? 0), 0, 100), profile,
    shadow: { ...s.shadow, world: { ...s.shadow.world, players } },
    career: {
      ...s.career!, bank: Math.max(0, s.career!.bank + (e.bank ?? 0)), fans: clamp((s.career!.fans ?? 50) + (e.fans ?? 0), 0, 100),
      story: { ...st, captainRel: clamp(st.captainRel + (e.captain ?? 0), 0, 100), agentRel: clamp(st.agentRel + (e.agent ?? 0), 0, 100) },
    },
  };
}

/** Réponse du joueur à un dilemme. */
export function chooseStory(s0: PlayerCareerState, choiceId: string): { ok: boolean; state: PlayerCareerState; message: string } {
  const s = ensureStory(s0);
  const d = ST(s).pending;
  const c = d?.choices.find(x => x.id === choiceId);
  if (!d || !c) return { ok: false, state: s, message: "Ce choix n'est plus d'actualité." };
  let next = withStory(applyEffects(s, c.effects), { pending: null, ...(c.flag ? { flags: { ...(ST(s).flags ?? {}), [c.flag]: idx(s) } } : {}) });
  const good = (c.effects.trust ?? 0) + (c.effects.captain ?? 0) + (c.effects.fans ?? 0) >= 0;
  next = journal(next, `${d.title} : ${c.outcome}`, good ? "good" : "bad");
  return { ok: true, state: pushPlayerInbox(next, quiet(pmsg(next, "board", d.title, c.outcome))), message: c.outcome };
}

// ─── Semaine ─────────────────────────────────────────────────────────────────

/** Après la semaine : dilemme, réactions des personnages, rival, meilleur match, récit de fin de saison. */
export function storyWeek(prev: PlayerCareerState, s0: PlayerCareerState): PlayerCareerState {
  if (!s0.career || s0.retired) return s0;
  let s = ensureStory(s0);
  const now = idx(s);
  const rng = createRng(seedFromString(`${s.shadow.world.seed}-storyw-${now}-${s.profile.id}`));
  const st = ST(s);

  // Dilemme sans réponse : il se règle sans toi
  if (st.pending && st.pending.expiresAt < now) {
    s = journal(withStory(s, { pending: null }), `${st.pending.title} : tu n'as pas donné suite.`, "neutral");
  }

  // Meilleur match de la saison et réactions
  const sum = s.lastMatch !== prev.lastMatch ? s.lastMatch : null;
  if (sum?.played && sum.rating !== null) {
    const vsId = sum.report.managedSide === "home" ? sum.report.awayClubId : sum.report.homeClubId;
    const vs = s.shadow.world.clubs.find(c => c.id === vsId)?.name ?? "l'adversaire";
    const best = ST(s).best;
    if (!best || best.season !== s.shadow.world.season || sum.rating > best.rating) s = withStory(s, { best: { season: s.shadow.world.season, rating: sum.rating, goals: sum.goals, vs } });
    if (sum.rating >= 8 || sum.goals >= 2) s = journal(s, `Récital contre ${vs} : ${sum.goals} but(s), note ${sum.rating.toFixed(1)}.`, "good");
    else if (sum.rating < 5.8) s = journal(s, `Soirée à oublier contre ${vs} (${sum.rating.toFixed(1)}).`, "bad");
    // Les personnages réagissent (pas toutes les semaines)
    if ((ST(s).lastTalk ?? 0) < now - 2 && rng.chance(0.35)) {
      const cap = nameOf(s, ST(s).captainId);
      const coach = coachName(s);
      let msg: [string, string] | null = null;
      if (sum.rating >= 8) msg = rng.chance(0.5) ? [`${coach} (coach)`, "« Voilà ce que j'attends de toi. Continue comme ça, et tu ne quitteras plus le onze. »"] : [`${cap} (capitaine)`, "« Quel match ! Ce soir c'est toi qui paies le restaurant. »"];
      else if (sum.rating < 6) msg = ST(s).captainRel >= 55 ? [`${cap} (capitaine)`, "« Ça arrive à tout le monde. Tête haute, on a besoin de toi samedi. »"] : [`${coach} (coach)`, "« Ce n'était pas suffisant. Je veux voir une réaction à l'entraînement. »"];
      if (msg) { s = withStory(s, { lastTalk: now }); s = pushPlayerInbox(s, pmsg(s, "board", msg[0], msg[1])); }
    }
  }

  // Le rival : nouvelles marquantes
  const rival = s.shadow.world.players.find(p => p.id === ST(s).rivalId);
  if (!rival || rival.clubId === "retired") s = withStory(s, { rivalId: pickRival(s) });
  else {
    const moved = prev.shadow.world.players.find(p => p.id === rival.id)?.clubId !== rival.clubId;
    if (moved) {
      const club = s.shadow.world.clubs.find(c => c.id === rival.clubId)?.name ?? "un nouveau club";
      s = journal(s, `Ton rival ${rival.firstName} ${rival.lastName} signe à ${club}.`, "neutral");
      s = pushPlayerInbox(s, pmsg(s, "news", `Ton rival signe à ${club}`, `${rival.firstName} ${rival.lastName} change de club. ${ST(s).agent} : « Lui avance. À toi de jouer. »`));
    }
    const fresh = (s.shadow.world.awards ?? []).filter(a => a.playerId === rival.id && !(prev.shadow.world.awards ?? []).includes(a));
    for (const a of fresh) s = pushPlayerInbox(journal(s, `${rival.lastName} remporte : ${a.label}.`, "bad"), quiet(pmsg(s, "news", `Ton rival récompensé`, `${rival.firstName} ${rival.lastName} : ${a.label}.`)));
  }

  // Un nouveau dilemme (au plus un en attente, un modèle par saison)
  if (!ST(s).pending && rng.chance(0.3)) {
    const season = s.shadow.world.season;
    const seen = ST(s).seen;
    const pool = TEMPLATES.filter(t => (t.once ? !seen.includes(t.key) : !seen.includes(`${t.key}-${season}`)) && t.when(s));
    // Les suites passent en priorité : ton passé te rattrape
    const follow = pool.filter(t => t.once);
    if (pool.length) {
      const from = follow.length && rng.chance(0.6) ? follow : pool;
      const t = from[rng.int(0, from.length - 1)];
      const d: Dilemma = { ...t.make(s), id: `${t.key}-${now}`, expiresAt: now + 2 };
      s = withStory(s, { pending: d, seen: keepSeen([...ST(s).seen, t.once ? t.key : `${t.key}-${season}`]) });
    }
  }

  // Fin de saison : le récit de l'année
  if (prev.shadow.world.season !== s.shadow.world.season) s = withStory(s, { recap: seasonRecap(prev, s), best: undefined });
  return s;
}

/** Récit de la saison qui vient de se terminer. */
export function seasonRecap(prev: PlayerCareerState, s: PlayerCareerState): SeasonRecap {
  const season = prev.shadow.world.season;
  const w = s.shadow.world;
  const lines = s.seasons.filter(l => l.season === season);
  const apps = lines.reduce((t, l) => t + l.apps, 0), goals = lines.reduce((t, l) => t + l.goals, 0), assists = lines.reduce((t, l) => t + l.assists, 0);
  const rs = lines.reduce((t, l) => t + l.ratingSum, 0);
  const rating = apps ? Math.round((rs / apps) * 100) / 100 : 0;
  const trophies = (s.career?.awards ?? []).filter(a => a.season === season);
  const st = ST(s);
  const title = trophies.some(t => t.id === "ballon_dor") ? "L'année du sacre"
    : trophies.length >= 2 ? "Une saison en or"
    : rating >= 7.3 ? "La saison de l'explosion"
    : rating >= 6.9 ? "La saison de la confirmation"
    : apps < 10 ? "La saison de l'attente"
    : rating < 6.3 ? "L'année noire" : "Une saison d'apprentissage";
  const out: string[] = [];
  const club = w.clubs.find(c => c.id === lines[lines.length - 1]?.clubId)?.name ?? myClub(s).name;
  out.push(apps ? `${apps} matchs sous le maillot de ${club}, ${goals} but${goals > 1 ? "s" : ""} et ${assists} passe${assists > 1 ? "s" : ""} décisive${assists > 1 ? "s" : ""}.` : `Une saison passée à attendre ta chance à ${club}.`);
  if (trophies.length) out.push(`Au palmarès : ${trophies.map(t => t.label).join(", ")}.`);
  const highs = st.journal.filter(j => j.season === season && j.tone === "good").slice(-2).map(j => j.text);
  const lows = st.journal.filter(j => j.season === season && j.tone === "bad").slice(-1).map(j => j.text);
  out.push(...highs, ...lows);
  out.push(st.captainRel >= 65 ? `Dans le vestiaire, ${nameOf(s, st.captainId) || "le capitaine"} te considère comme un pilier.` : st.captainRel <= 35 ? "Le vestiaire reste méfiant à ton égard." : "Tu as trouvé ta place dans le groupe.");
  let rival: SeasonRecap["rival"];
  const r = w.players.find(p => p.id === st.rivalId);
  if (r) {
    const rl = w.playerStats.filter(x => x.playerId === r.id && x.season === season);
    const rg = rl.reduce((t, x) => t + x.goals, 0), ra = rl.reduce((t, x) => t + x.assists, 0);
    const mine = goals + assists * 0.7, theirs = rg + ra * 0.7;
    rival = {
      name: `${r.firstName} ${r.lastName}`.trim(), club: w.clubs.find(c => c.id === r.clubId)?.name ?? "", goals: rg, assists: ra, mineGoals: goals, mineAssists: assists,
      verdict: mine > theirs * 1.15 ? "Tu prends le dessus." : theirs > mine * 1.15 ? "Il garde une longueur d'avance." : "Coude à coude.",
    };
  }
  const total = careerTotals(s);
  out.push(`En carrière : ${total.apps} matchs, ${total.goals} buts. ${w.startYear ? `La saison ${seasonLabel(w.startYear + season)} commence.` : ""}`.trim());
  return {
    season, title, lines: out, numbers: { apps, goals, assists, rating }, best: st.best && st.best.season === season ? { rating: st.best.rating, goals: st.best.goals, vs: st.best.vs } : undefined,
    rival, relations: { coach: s.coachTrust, captain: st.captainRel, fans: s.career?.fans ?? 50, agent: st.agentRel },
  };
}

export const dismissRecap = (s: PlayerCareerState): PlayerCareerState => (s.career?.story ? withStory(s, { recap: null }) : s);
