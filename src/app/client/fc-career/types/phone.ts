/**
 * FC CAREER — Étape 14 : Téléphone & Relations Humaines
 */

/* ------------------------------------------------------------------ */
/* 14.1 — Contacts & Messages                                         */
/* ------------------------------------------------------------------ */

export type ContactType =
  | "agent"
  | "coach"
  | "teammate"
  | "rival"
  | "family"
  | "selector"
  | "journalist"
  | "fans";

export interface Contact {
  id: string;
  type: ContactType;
  name: string;
  emoji: string;
  unread: number;
}

export interface MessageChoice {
  id: string;
  label: string;
  moraleDelta: number;
  imageDelta: number;
  pressureDelta: number;
  relationDelta: number;
}

export interface PhoneMessage {
  id: string;
  contactId: string;
  contactType: ContactType;
  text: string;
  choices: MessageChoice[];
  chosenId: string | null;
  dayNumber: number;
  read: boolean;
}

/* ------------------------------------------------------------------ */
/* 14.2 — Relations                                                    */
/* ------------------------------------------------------------------ */

export type RelationType = "mentor" | "rival" | "friend";

export interface Relationship {
  id: string;
  type: RelationType;
  personName: string;
  personClubId: string;
  personRating: number;
  personAge: number;
  level: number; // 0-100 (0 = hostile, 50 = neutral, 100 = best friend / respect)
  active: boolean;
}

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

export interface PhoneState {
  contacts: Contact[];
  messages: PhoneMessage[];
  relationships: Relationship[];
  /** Total unread count */
  unreadCount: number;
}

/* ------------------------------------------------------------------ */
/* Message templates                                                   */
/* ------------------------------------------------------------------ */

export interface MessageTemplate {
  contactType: ContactType;
  condition?: string;
  text: string;
  choices: Omit<MessageChoice, "id">[];
}

export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  // Agent
  { contactType: "agent", text: "J'ai reçu une offre intéressante pour toi. On en parle ?", choices: [
    { label: "Dis-moi tout !", moraleDelta: 0, imageDelta: 0, pressureDelta: 5, relationDelta: 5 },
    { label: "Pas maintenant, je suis concentré", moraleDelta: 0, imageDelta: 0, pressureDelta: -3, relationDelta: -5 },
    { label: "Je fais confiance à ton jugement", moraleDelta: 5, imageDelta: 0, pressureDelta: 0, relationDelta: 10 },
  ]},
  { contactType: "agent", text: "Ton contrat arrive à terme bientôt. Il faut qu'on discute prolongation.", choices: [
    { label: "Je veux rester ici", moraleDelta: 5, imageDelta: 5, pressureDelta: 0, relationDelta: 5 },
    { label: "Voyons ce que le marché propose", moraleDelta: 0, imageDelta: -3, pressureDelta: 5, relationDelta: 0 },
  ]},
  // Coach
  { contactType: "coach", text: "Beau match hier. Continue comme ça et tu seras titulaire indiscutable.", choices: [
    { label: "Merci coach, je donne tout", moraleDelta: 10, imageDelta: 0, pressureDelta: -5, relationDelta: 10 },
    { label: "Je mérite plus de temps de jeu", moraleDelta: -5, imageDelta: 0, pressureDelta: 5, relationDelta: -5 },
  ]},
  { contactType: "coach", text: "Ta performance m'a déçu. Il faut que tu te remettes en question.", choices: [
    { label: "Vous avez raison, je vais travailler", moraleDelta: -5, imageDelta: 5, pressureDelta: 5, relationDelta: 10 },
    { label: "J'ai fait de mon mieux", moraleDelta: 0, imageDelta: 0, pressureDelta: 0, relationDelta: -3 },
    { label: "Peut-être que le problème vient du système", moraleDelta: 0, imageDelta: -5, pressureDelta: 10, relationDelta: -15 },
  ]},
  // Teammate
  { contactType: "teammate", text: "Ça te dit de sortir ce soir avec l'équipe ?", choices: [
    { label: "Bien sûr, j'arrive !", moraleDelta: 10, imageDelta: -3, pressureDelta: -5, relationDelta: 10 },
    { label: "Non merci, je me repose", moraleDelta: -3, imageDelta: 3, pressureDelta: -3, relationDelta: -5 },
  ]},
  { contactType: "teammate", text: "Bel assist hier ! On forme un bon duo.", choices: [
    { label: "On est les meilleurs !", moraleDelta: 5, imageDelta: 0, pressureDelta: 0, relationDelta: 10 },
    { label: "Merci, continue à te placer comme ça", moraleDelta: 3, imageDelta: 0, pressureDelta: 0, relationDelta: 5 },
  ]},
  // Rival
  { contactType: "rival", text: "Profite bien du banc, c'est MA place de titulaire.", choices: [
    { label: "On verra sur le terrain", moraleDelta: 5, imageDelta: 5, pressureDelta: 5, relationDelta: -5 },
    { label: "Tu as raison de t'inquiéter", moraleDelta: 10, imageDelta: -3, pressureDelta: 3, relationDelta: -10 },
    { label: "Que le meilleur gagne", moraleDelta: 3, imageDelta: 5, pressureDelta: 0, relationDelta: 5 },
  ]},
  // Family
  { contactType: "family", text: "On est fiers de toi ! Continue comme ça.", choices: [
    { label: "Merci, ça me touche", moraleDelta: 15, imageDelta: 0, pressureDelta: -10, relationDelta: 5 },
    { label: "J'ai encore du chemin", moraleDelta: 5, imageDelta: 0, pressureDelta: 0, relationDelta: 3 },
  ]},
  { contactType: "family", text: "Tu nous manques à la maison... Tout va bien ?", choices: [
    { label: "Vous me manquez aussi", moraleDelta: 5, imageDelta: 0, pressureDelta: -5, relationDelta: 10 },
    { label: "Tout va bien, ne vous inquiétez pas", moraleDelta: 0, imageDelta: 0, pressureDelta: 0, relationDelta: 3 },
  ]},
  // Selector
  { contactType: "selector", text: "Je te surveille de près. Continue à performer.", choices: [
    { label: "Je serai prêt pour la sélection", moraleDelta: 10, imageDelta: 5, pressureDelta: 5, relationDelta: 10 },
    { label: "Merci sélectionneur", moraleDelta: 5, imageDelta: 0, pressureDelta: 0, relationDelta: 5 },
  ]},
  // Journalist
  { contactType: "journalist", text: "Bonjour, j'aimerais une interview exclusive. Ça vous intéresse ?", choices: [
    { label: "Avec plaisir !", moraleDelta: 0, imageDelta: 10, pressureDelta: 5, relationDelta: 5 },
    { label: "Pas pour le moment", moraleDelta: 0, imageDelta: -3, pressureDelta: -3, relationDelta: -5 },
  ]},
  // Fans
  { contactType: "fans", text: "🔥🔥🔥 GOAT ! Meilleur joueur du monde !", choices: [
    { label: "Merci les fans ! 🙏", moraleDelta: 10, imageDelta: 5, pressureDelta: 0, relationDelta: 5 },
    { label: "Ce n'est que le début", moraleDelta: 5, imageDelta: 3, pressureDelta: 0, relationDelta: 3 },
  ]},
  { contactType: "fans", text: "Tu joues mal en ce moment... On veut des résultats !", choices: [
    { label: "Je vais me rattraper", moraleDelta: -5, imageDelta: 3, pressureDelta: 5, relationDelta: 3 },
    { label: "Les vrais fans soutiennent dans les moments durs", moraleDelta: 0, imageDelta: -5, pressureDelta: 3, relationDelta: -5 },
  ]},
];
