/**
 * FC CAREER 27 — Carrière Joueur : la vie en dehors du terrain.
 *
 * Chaque semaine : salaire et primes (bruts), impôts, commission de l'agent,
 * train de vie, entretien des biens, loyers perçus, revenus des affaires et
 * des sponsors, rendement de l'épargne et des placements (marché commun au
 * monde, donc identique pour tous ceux qui y investissent). Le patrimoine
 * agit sur le joueur : moral, récupération, supporters, réputation.
 * Pur et déterministe (graine du monde + semaine).
 */

import type { PlayerCareerState } from "./types";
import { createRng, seedFromString } from "../utils/random";
import { pmsg, pushPlayerInbox } from "./engine";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const r100 = (v: number) => Math.round(v / 100) * 100;

// ─── Catalogue ───────────────────────────────────────────────────────────────

export type AssetKind = "home" | "car" | "rental" | "luxury" | "island" | "business";
export interface CatalogItem {
  id: string; kind: AssetKind; name: string; desc: string; price: number;
  /** Entretien hebdomadaire */
  upkeep: number;
  /** Revenu hebdomadaire moyen (loyer, affaire) */
  income?: number;
  /** Variation annuelle de la valeur */
  growth: number;
  /** Effets : moral par semaine, récupération (fatigue en moins par semaine), à l'achat : supporters, réputation */
  morale?: number; recovery?: number; fans?: number; rep?: number;
  /** Réputation minimale (on ne vend pas une île à un inconnu) */
  minRep?: number;
}

export const CATALOG: CatalogItem[] = [
  { id: "studio", kind: "home", name: "Studio en ville", desc: "Un premier chez-soi près du centre d'entraînement.", price: 120_000, upkeep: 150, growth: 0.03, morale: 0.3 },
  { id: "apart", kind: "home", name: "Appartement avec vue", desc: "Trois pièces lumineuses, gardien, parking.", price: 450_000, upkeep: 450, growth: 0.03, morale: 0.6, recovery: 1 },
  { id: "villa", kind: "home", name: "Villa avec piscine", desc: "Jardin, piscine, salle de sport privée.", price: 1_800_000, upkeep: 1_600, growth: 0.035, morale: 1, recovery: 2, minRep: 25 },
  { id: "manor", kind: "home", name: "Manoir", desc: "Domaine clos, terrain de foot, cinéma.", price: 6_000_000, upkeep: 5_000, growth: 0.03, morale: 1.4, recovery: 3, fans: 1, minRep: 45 },
  { id: "penthouse", kind: "home", name: "Penthouse en front de mer", desc: "Le dernier étage d'une tour iconique.", price: 15_000_000, upkeep: 11_000, growth: 0.04, morale: 1.8, recovery: 3, rep: 1, minRep: 65 },
  { id: "city", kind: "car", name: "Citadine", desc: "Pratique pour se garer au centre d'entraînement.", price: 18_000, upkeep: 60, growth: -0.15, morale: 0.1 },
  { id: "sedan", kind: "car", name: "Berline allemande", desc: "Confort et discrétion.", price: 55_000, upkeep: 120, growth: -0.15, morale: 0.2 },
  { id: "suv", kind: "car", name: "SUV de luxe", desc: "Le parking des joueurs en est plein.", price: 120_000, upkeep: 250, growth: -0.14, morale: 0.3 },
  { id: "super", kind: "car", name: "Supercar italienne", desc: "Rouge, bruyante, inoubliable.", price: 320_000, upkeep: 700, growth: -0.12, morale: 0.5, fans: -1, rep: 0.5, minRep: 30 },
  { id: "hyper", kind: "car", name: "Hypercar", desc: "Série limitée à 99 exemplaires.", price: 2_500_000, upkeep: 3_000, growth: 0.02, morale: 0.7, rep: 1, fans: -2, minRep: 60 },
  { id: "rent-studio", kind: "rental", name: "Studio en location", desc: "Petit investissement locatif, loyer régulier.", price: 150_000, upkeep: 40, income: 160, growth: 0.03 },
  { id: "rent-building", kind: "rental", name: "Immeuble de rapport", desc: "Huit appartements loués en centre-ville.", price: 2_500_000, upkeep: 700, income: 2_900, growth: 0.03, minRep: 20 },
  { id: "rent-resort", kind: "rental", name: "Résidence hôtelière", desc: "Cent chambres face à la mer, gérées pour vous.", price: 12_000_000, upkeep: 4_000, income: 14_500, growth: 0.035, minRep: 40 },
  { id: "watch", kind: "luxury", name: "Montre de collection", desc: "Mouvement suisse, prend de la valeur.", price: 25_000, upkeep: 0, growth: 0.06, morale: 0.1 },
  { id: "yacht", kind: "luxury", name: "Yacht de 40 mètres", desc: "Équipage compris, vacances en Méditerranée.", price: 8_000_000, upkeep: 9_000, growth: -0.08, morale: 1, recovery: 2, rep: 1, fans: -1, minRep: 55 },
  { id: "jet", kind: "luxury", name: "Jet privé", desc: "Plus jamais d'aéroport bondé.", price: 30_000_000, upkeep: 30_000, growth: -0.1, morale: 1, recovery: 3, rep: 2, fans: -2, minRep: 70 },
  { id: "island", kind: "island", name: "Île privée", desc: "Un atoll dans les Caraïbes : vacances gratuites et repos total.", price: 25_000_000, upkeep: 18_000, growth: 0.02, morale: 2, recovery: 4, rep: 2, minRep: 60 },
  { id: "restaurant", kind: "business", name: "Restaurant", desc: "Une adresse à votre nom. Revenus variables.", price: 400_000, upkeep: 300, income: 900, growth: 0, fans: 2 },
  { id: "brand", kind: "business", name: "Marque de vêtements", desc: "Vos initiales sur des sweats. Plus vous êtes connu, plus ça rapporte.", price: 1_200_000, upkeep: 800, income: 2_400, growth: 0, rep: 1, minRep: 30 },
  { id: "academy", kind: "business", name: "Académie de football", desc: "Pour les enfants de votre ville natale. Ne rapporte rien, sauf l'affection.", price: 2_000_000, upkeep: 2_500, growth: 0, fans: 8, rep: 2, morale: 0.5 },
];
export const ITEM = new Map(CATALOG.map(c => [c.id, c]));

export type Lifestyle = "modest" | "comfort" | "star" | "excess";
export const LIFESTYLE: Record<Lifestyle, { label: string; desc: string; fixed: number; pct: number; morale: number; fatigue: number }> = {
  modest: { label: "Modeste", desc: "Vous dépensez peu, vous épargnez beaucoup.", fixed: 300, pct: 0.08, morale: -0.3, fatigue: 0 },
  comfort: { label: "Confortable", desc: "Une belle vie sans excès.", fixed: 1_000, pct: 0.18, morale: 0.3, fatigue: 0 },
  star: { label: "Star", desc: "Restaurants, tenues, sorties : la vie d'une vedette.", fixed: 4_000, pct: 0.32, morale: 0.8, fatigue: 0.5 },
  excess: { label: "Excès", desc: "Fêtes et folies. Le moral grimpe, le corps et le coach trinquent.", fixed: 12_000, pct: 0.5, morale: 1.4, fatigue: 2.5 },
};

export type Product = "savings" | "index" | "crypto";
export const PRODUCTS: Record<Product, { label: string; desc: string; mean: number; vol: number }> = {
  savings: { label: "Livret d'épargne", desc: "2,5 % par an, sans risque.", mean: 0.025, vol: 0 },
  index: { label: "Fonds indiciel", desc: "Les grandes entreprises mondiales : environ 7 % par an, avec des hauts et des bas.", mean: 0.07, vol: 0.16 },
  crypto: { label: "Cryptomonnaies", desc: "Très volatil : on peut doubler ou tout perdre en un an.", mean: 0.08, vol: 0.85 },
};

export const VACATIONS = [
  { id: "beach", name: "Plage en Espagne", cost: 8_000, morale: 6 },
  { id: "dubai", name: "Dubaï", cost: 35_000, morale: 9 },
  { id: "maldives", name: "Maldives", cost: 70_000, morale: 12 },
  { id: "island", name: "Votre île privée", cost: 0, morale: 14, needs: "island" },
] as const;

// ─── État ────────────────────────────────────────────────────────────────────

export interface OwnedAsset { uid: string; itemId: string; boughtAt: number; paid: number; value: number }
export interface LedgerLine { week: number; label: string; amount: number }
export interface Relationship { status: "single" | "dating" | "couple" | "married"; partner?: string; since?: number; children: number }
export interface LifeState {
  lifestyle: Lifestyle;
  assets: OwnedAsset[];
  inv: Record<Product, number>;
  /** Cours du marché (base 100) : fonds indiciel et cryptos */
  market: { index: number; crypto: number; week: number };
  relation: Relationship;
  ledger: LedgerLine[];
  /** Dernière semaine : détail des flux */
  last?: { income: number; expenses: number; net: number; lines: LedgerLine[] };
  /** Patrimoine net, un point toutes les 4 semaines */
  history: { week: number; worth: number }[];
  lastVacation?: number;
  seq: number;
}

export const weekIdx = (s: PlayerCareerState) => s.shadow.world.season * 100 + s.shadow.world.currentWeek;
const weeksBetween = (a: number, b: number) => (Math.floor(b / 100) - Math.floor(a / 100)) * 52 + (b % 100) - (a % 100);

export function lifeOf(s: PlayerCareerState): LifeState {
  return s.career?.life ?? {
    lifestyle: "comfort", assets: [], inv: { savings: 0, index: 0, crypto: 0 }, market: { index: 100, crypto: 100, week: weekIdx(s) },
    relation: { status: "single", children: 0 }, ledger: [], history: [], seq: 0,
  };
}
const withLife = (s: PlayerCareerState, life: LifeState, bank?: number): PlayerCareerState =>
  ({ ...s, career: { ...s.career!, life, ...(bank !== undefined ? { bank } : {}) } });

export function netWorth(s: PlayerCareerState): number {
  const l = lifeOf(s);
  return Math.round((s.career?.bank ?? 0) + l.inv.savings + l.inv.index + l.inv.crypto + l.assets.reduce((t, a) => t + a.value, 0));
}

/** Sponsors personnels : selon la réputation et la cote auprès des supporters. */
export function sponsorIncome(s: PlayerCareerState): number {
  const rep = s.profile.reputation, fans = s.career?.fans ?? 50;
  return rep < 20 ? 0 : r100(Math.pow(rep, 2.2) * 2.2 + fans * 25);
}

const PARTNERS = ["Camille", "Inès", "Léa", "Sofia", "Maya", "Jade", "Alicia", "Nora", "Elena", "Yasmine", "Lucas", "Noah", "Adam", "Hugo"];

// ─── Semaine ─────────────────────────────────────────────────────────────────

/**
 * Applique les finances et la vie privée de la semaine. `gross` = salaire et
 * primes déjà versés sur le compte cette semaine (on prélève impôts et commission).
 */
export function lifeWeek(s: PlayerCareerState, gross: number): PlayerCareerState {
  if (!s.career || s.retired) return s;
  const now = weekIdx(s);
  const l = lifeOf(s);
  const lines: LedgerLine[] = [];
  const add = (label: string, amount: number) => { if (amount) lines.push({ week: now, label, amount: Math.round(amount) }); };
  add("Salaire et primes", gross);
  add("Impôts (25 %)", -gross * 0.25);
  add("Commission de l'agent (5 %)", -gross * 0.05);
  const ls = LIFESTYLE[l.lifestyle];
  // Part fixe plafonnée pour les petits salaires : un jeune pro peut épargner
  add(`Train de vie : ${ls.label.toLowerCase()}`, -(Math.min(ls.fixed, s.contract.wage * 0.12) + s.contract.wage * ls.pct));
  if (l.relation.children) add(`Famille (${l.relation.children} enfant${l.relation.children > 1 ? "s" : ""})`, -400 * l.relation.children);
  add("Sponsors personnels", sponsorIncome(s));

  // Marché commun : même évolution pour tous les investisseurs du monde
  const mr = createRng(seedFromString(`${s.shadow.world.seed}-market-${now}`));
  const gauss = () => { const u = Math.max(1e-9, mr.float(0, 1)), v = mr.float(0, 1); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const ri = PRODUCTS.index.mean / 52 + gauss() * PRODUCTS.index.vol / Math.sqrt(52);
  const rc = PRODUCTS.crypto.mean / 52 + gauss() * PRODUCTS.crypto.vol / Math.sqrt(52);
  const market = l.market.week === now ? l.market : { index: Math.max(5, l.market.index * (1 + ri)), crypto: Math.max(1, l.market.crypto * (1 + rc)), week: now };
  const inv = l.market.week === now ? l.inv : {
    savings: l.inv.savings * (1 + PRODUCTS.savings.mean / 52),
    index: l.inv.index * (1 + ri), crypto: l.inv.crypto * (1 + rc),
  };

  // Biens : entretien, loyers, affaires, valeur
  const rng = createRng(seedFromString(`${s.shadow.world.seed}-life-${now}-${s.profile.id}`));
  let moraleAdd = ls.morale, recovery = 0;
  const assets = l.assets.map(a => {
    const it = ITEM.get(a.itemId);
    if (!it) return a;
    add(`Entretien : ${it.name}`, -it.upkeep);
    if (it.income) {
      const swing = it.kind === "business" ? rng.float(0.4, 1.6) * (it.id === "brand" ? clamp(s.profile.reputation / 50, 0.4, 2) : 1) : rng.float(0.9, 1.05);
      add(it.kind === "rental" ? `Loyers : ${it.name}` : `Recettes : ${it.name}`, it.income * swing);
    }
    moraleAdd += it.morale ?? 0;
    recovery += it.recovery ?? 0;
    return { ...a, value: Math.max(0, a.value * (1 + it.growth / 52)) };
  });

  // Vie privée : un couple stable aide, une famille aussi
  const rel = l.relation;
  moraleAdd += rel.status === "married" ? 1 : rel.status === "couple" ? 0.6 : rel.status === "dating" ? 0.3 : 0;
  moraleAdd += Math.min(1, rel.children * 0.4);

  const flow = lines.filter(x => x.label !== "Salaire et primes").reduce((t, x) => t + x.amount, 0);
  let bank = (s.career.bank ?? 0) + flow;
  let next: LifeState = { ...l, market, inv, assets };
  const msgs: string[] = [];
  // Découvert : on vend les placements, puis on réduit le train de vie
  if (bank < 0) {
    for (const p of ["savings", "index", "crypto"] as Product[]) {
      if (bank >= 0) break;
      const take = Math.min(next.inv[p], -bank);
      if (take > 0) { next = { ...next, inv: { ...next.inv, [p]: next.inv[p] - take } }; bank += take; add(`Retrait automatique : ${PRODUCTS[p].label}`, 0); }
    }
    if (bank < 0 && next.lifestyle !== "modest") { next = { ...next, lifestyle: "modest" }; msgs.push("Compte à découvert : votre conseiller passe votre train de vie en « Modeste »."); }
    if (bank < 0 && next.assets.length) {
      // Vente forcée du bien le moins cher, à 85 % de sa valeur
      const cheap = [...next.assets].sort((a, b) => a.value - b.value)[0];
      const got = Math.round(cheap.value * 0.85);
      next = { ...next, assets: next.assets.filter(a => a.uid !== cheap.uid) };
      bank += got;
      add(`Vente forcée : ${ITEM.get(cheap.itemId)?.name ?? "bien"}`, got);
      msgs.push(`Découvert : ${ITEM.get(cheap.itemId)?.name ?? "un bien"} vendu en urgence.`);
    }
  }

  const income = lines.filter(x => x.amount > 0).reduce((t, x) => t + x.amount, 0);
  const expenses = lines.filter(x => x.amount < 0).reduce((t, x) => t + x.amount, 0);
  next = {
    ...next,
    ledger: [...next.ledger, ...lines].slice(-160),
    last: { income, expenses, net: income + expenses, lines },
  };
  let out = withLife(s, next, Math.round(bank));
  if ((s.shadow.world.currentWeek % 4) === 0) out = withLife(out, { ...next, history: [...next.history, { week: now, worth: netWorth(out) }].slice(-130) });

  // Effets sur le joueur : moral, récupération, fatigue du train de vie
  const id = s.profile.id;
  const players = out.shadow.world.players.map(p => (p.id === id ? {
    ...p,
    morale: clamp(p.morale + clamp(moraleAdd, -2, 3), 5, 100),
    fatigue: clamp(p.fatigue - Math.min(5, recovery) + ls.fatigue, 0, 100),
  } : p));
  out = { ...out, shadow: { ...out.shadow, world: { ...out.shadow.world, players } } };
  // Excès : le coach finit par l'apprendre
  if (next.lifestyle === "excess" && rng.chance(0.15)) { out = { ...out, coachTrust: clamp(out.coachTrust - 2, 0, 100) }; msgs.push("Le coach a entendu parler de vos soirées. Sa confiance baisse."); }
  return msgs.length ? pushPlayerInbox(out, ...msgs.map(m => pmsg(out, "finance", "Vos finances", m))) : out;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

type Res = { ok: boolean; state: PlayerCareerState; message: string };
const fail = (s: PlayerCareerState, message: string): Res => ({ ok: false, state: s, message });
const money = (v: number) => (Math.abs(v) >= 1_000_000 ? `${(v / 1_000_000).toFixed(1).replace(".", ",")} M€` : `${Math.round(v / 1000)} k€`);

function log(l: LifeState, s: PlayerCareerState, label: string, amount: number): LifeState {
  return { ...l, ledger: [...l.ledger, { week: weekIdx(s), label, amount: Math.round(amount) }].slice(-160) };
}

function fanRep(s: PlayerCareerState, fans = 0, rep = 0): PlayerCareerState {
  if (!fans && !rep) return s;
  return { ...s, profile: { ...s.profile, reputation: clamp(s.profile.reputation + rep, 1, 100) }, career: { ...s.career!, fans: clamp((s.career!.fans ?? 50) + fans, 0, 100) } };
}

export function buyAsset(s: PlayerCareerState, itemId: string): Res {
  const it = ITEM.get(itemId);
  if (!it || !s.career) return fail(s, "Bien introuvable.");
  if ((it.minRep ?? 0) > s.profile.reputation) return fail(s, `Réputation ${it.minRep} requise pour ce bien.`);
  if (s.career.bank < it.price) return fail(s, `Il vous manque ${money(it.price - s.career.bank)} sur votre compte.`);
  const l = lifeOf(s);
  if (it.kind === "island" && l.assets.some(a => a.itemId === "island")) return fail(s, "Vous avez déjà une île.");
  const asset: OwnedAsset = { uid: `as-${l.seq + 1}`, itemId, boughtAt: weekIdx(s), paid: it.price, value: it.price };
  let next = withLife(s, log({ ...l, assets: [...l.assets, asset], seq: l.seq + 1 }, s, `Achat : ${it.name}`, -it.price), s.career.bank - it.price);
  next = fanRep(next, it.fans, it.rep);
  return { ok: true, state: next, message: `${it.name} achetée${it.kind === "rental" ? " : les loyers tombent chaque semaine" : ""}.` };
}

export function sellAsset(s: PlayerCareerState, uid: string): Res {
  const l = lifeOf(s);
  const a = l.assets.find(x => x.uid === uid);
  if (!a || !s.career) return fail(s, "Bien introuvable.");
  const it = ITEM.get(a.itemId);
  // Frais de vente : 5 % (notaire, agence)
  const got = Math.round(a.value * 0.95);
  const next = withLife(s, log({ ...l, assets: l.assets.filter(x => x.uid !== uid) }, s, `Vente : ${it?.name ?? "bien"}`, got), s.career.bank + got);
  const pl = got - a.paid;
  return { ok: true, state: next, message: `${it?.name ?? "Bien"} vendu ${money(got)} (${pl >= 0 ? "plus-value" : "moins-value"} de ${money(Math.abs(pl))}).` };
}

export function setLifestyle(s: PlayerCareerState, lifestyle: Lifestyle): Res {
  if (!s.career) return fail(s, "Carrière introuvable.");
  return { ok: true, state: withLife(s, { ...lifeOf(s), lifestyle }), message: `Train de vie : ${LIFESTYLE[lifestyle].label}.` };
}

export function invest(s: PlayerCareerState, product: Product, amount: number): Res {
  if (!s.career) return fail(s, "Carrière introuvable.");
  const l = lifeOf(s);
  const a = Math.round(amount);
  if (!a) return fail(s, "Montant nul.");
  if (a > 0 && a > s.career.bank) return fail(s, "Solde insuffisant sur le compte courant.");
  if (a < 0 && -a > l.inv[product] + 1) return fail(s, "Vous ne détenez pas autant sur ce placement.");
  const take = a < 0 ? Math.max(a, -l.inv[product]) : a;
  const next = withLife(s, log({ ...l, inv: { ...l.inv, [product]: Math.max(0, l.inv[product] + take) } }, s, `${take > 0 ? "Placement" : "Retrait"} : ${PRODUCTS[product].label}`, -take), s.career.bank - take);
  return { ok: true, state: next, message: `${take > 0 ? "Placé" : "Retiré"} : ${money(Math.abs(take))} (${PRODUCTS[product].label}).` };
}

export type RelationAction = "date" | "commit" | "propose" | "child" | "breakup";
export function relationAction(s: PlayerCareerState, action: RelationAction): Res {
  if (!s.career) return fail(s, "Carrière introuvable.");
  const l = lifeOf(s);
  const r = l.relation, now = weekIdx(s);
  const age = s.shadow.world.players.find(p => p.id === s.profile.id)?.age ?? 18;
  const weeks = r.since ? weeksBetween(r.since, now) : 0;
  const moraleDelta = (st: PlayerCareerState, d: number): PlayerCareerState => ({ ...st, shadow: { ...st.shadow, world: { ...st.shadow.world, players: st.shadow.world.players.map(p => (p.id === st.profile.id ? { ...p, morale: clamp(p.morale + d, 5, 100) } : p)) } } });
  let rel: Relationship = r, cost = 0, msg = "", mor = 0, fans = 0;
  switch (action) {
    case "date": {
      if (r.status !== "single") return fail(s, "Vous êtes déjà en couple.");
      const partner = PARTNERS[createRng(seedFromString(`${s.profile.id}-love-${now}`)).int(0, PARTNERS.length - 1)];
      rel = { ...r, status: "dating", partner, since: now }; cost = 600; mor = 4; msg = `Premier rendez-vous avec ${partner}. Ça se passe bien.`;
      break;
    }
    case "commit":
      if (r.status !== "dating") return fail(s, "Il faut d'abord rencontrer quelqu'un.");
      if (weeks < 8) return fail(s, `Encore ${8 - weeks} semaine(s) avant d'officialiser.`);
      rel = { ...r, status: "couple", since: now }; mor = 5; msg = `Vous officialisez avec ${r.partner}.`;
      break;
    case "propose":
      if (r.status !== "couple") return fail(s, "Il faut être en couple.");
      if (weeks < 26) return fail(s, `Encore ${26 - weeks} semaine(s) avant de demander en mariage.`);
      if (age < 20) return fail(s, "Attendez au moins 20 ans.");
      cost = Math.max(30_000, Math.round((s.career.bank * 0.08) / 1000) * 1000);
      if (s.career.bank < cost) return fail(s, `Le mariage coûtera ${money(cost)}.`);
      rel = { ...r, status: "married", since: now }; mor = 15; fans = 3; msg = `${r.partner} a dit oui ! Mariage célébré (${money(cost)}).`;
      break;
    case "child":
      if (r.status !== "married" && r.status !== "couple") return fail(s, "Il faut être en couple.");
      if (weeks < 20 && r.children === 0) return fail(s, "Prenez encore un peu de temps à deux.");
      if (r.children >= 4) return fail(s, "La maison est déjà bien remplie.");
      rel = { ...r, children: r.children + 1 }; cost = 8_000; mor = 12; fans = 2; msg = `Bienvenue au bébé ! Vous êtes parent de ${r.children + 1} enfant${r.children ? "s" : ""}.`;
      break;
    case "breakup":
      if (r.status === "single") return fail(s, "Vous êtes célibataire.");
      cost = r.status === "married" ? Math.round((s.career.bank * 0.3) / 1000) * 1000 : 0;
      rel = { status: "single", children: r.children }; mor = -10; msg = r.status === "married" ? `Divorce prononcé : ${money(cost)} versés à ${r.partner}.` : `Séparation avec ${r.partner}.`;
      break;
  }
  let next = withLife(s, cost ? log({ ...l, relation: rel }, s, msg.split(".")[0], -cost) : { ...l, relation: rel }, s.career.bank - cost);
  next = moraleDelta(fanRep(next, fans), mor);
  return { ok: true, state: next, message: msg };
}

export function takeVacation(s: PlayerCareerState, id: string): Res {
  if (!s.career) return fail(s, "Carrière introuvable.");
  const v = VACATIONS.find(x => x.id === id);
  if (!v) return fail(s, "Destination inconnue.");
  const l = lifeOf(s);
  const wk = s.shadow.world.currentWeek, now = weekIdx(s);
  const offSeason = wk >= 50 || wk <= 2;
  if (!offSeason) return fail(s, "Les vacances se prennent à l'intersaison (fin de saison ou deux premières semaines).");
  if (l.lastVacation && weeksBetween(l.lastVacation, now) < 20) return fail(s, "Vous êtes déjà parti en vacances cet été.");
  if ("needs" in v && !l.assets.some(a => a.itemId === v.needs)) return fail(s, "Il faut posséder une île privée.");
  if (s.career.bank < v.cost) return fail(s, "Solde insuffisant.");
  const players = s.shadow.world.players.map(p => (p.id === s.profile.id ? { ...p, fatigue: 0, morale: clamp(p.morale + v.morale, 5, 100) } : p));
  const next = withLife({ ...s, shadow: { ...s.shadow, world: { ...s.shadow.world, players } } }, log({ ...l, lastVacation: now }, s, `Vacances : ${v.name}`, -v.cost), s.career.bank - v.cost);
  return { ok: true, state: next, message: `Vacances à ${v.name} : batteries rechargées, moral au beau fixe.` };
}
