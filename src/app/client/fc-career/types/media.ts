/**
 * FC CAREER — Médias & Conférences de presse
 * (Split from wellness.ts — Étape 11.1)
 */

export type MediaReaction = "catastrophic" | "discreet" | "good" | "magistral";

export function getMediaReaction(rating: number): { reaction: MediaReaction; label: string } {
  if (rating < 5) return { reaction: "catastrophic", label: "Prestation catastrophique" };
  if (rating < 7) return { reaction: "discreet", label: "Match discret" };
  if (rating < 9) return { reaction: "good", label: "Très bon match !" };
  return { reaction: "magistral", label: "MAGISTRAL !" };
}

export interface PressQuestionChoice {
  id: string;
  label: string;
  tone: "diplomat" | "arrogant" | "neutral" | "humble" | "collective";
  imageDelta: number;
  coachTrustDelta: number;
  moraleDelta: number;
  pressureDelta: number;
}

export interface PressQuestion {
  id: string;
  question: string;
  choices: PressQuestionChoice[];
}

export const PRESS_QUESTIONS: PressQuestion[] = [
  {
    id: "rival-question",
    question: "Que pensez-vous de votre concurrent au poste ?",
    choices: [
      { id: "diplomat", label: "Il est bon, ça me motive", tone: "diplomat", imageDelta: 5, coachTrustDelta: 3, moraleDelta: 0, pressureDelta: 0 },
      { id: "arrogant", label: "Je suis meilleur", tone: "arrogant", imageDelta: -5, coachTrustDelta: -3, moraleDelta: 5, pressureDelta: 5 },
      { id: "neutral", label: "Pas de commentaire", tone: "neutral", imageDelta: 0, coachTrustDelta: 0, moraleDelta: 0, pressureDelta: 0 },
    ],
  },
  {
    id: "golden-globe",
    question: "Vous êtes en forme, vous visez le Globe d'Or ?",
    choices: [
      { id: "humble", label: "Ce serait un rêve", tone: "humble", imageDelta: 5, coachTrustDelta: 0, moraleDelta: 5, pressureDelta: 5 },
      { id: "arrogant", label: "Je le mérite", tone: "arrogant", imageDelta: -5, coachTrustDelta: -2, moraleDelta: 10, pressureDelta: 10 },
      { id: "collective", label: "Je pense d'abord au collectif", tone: "collective", imageDelta: 3, coachTrustDelta: 5, moraleDelta: 0, pressureDelta: 0 },
    ],
  },
  {
    id: "transfer-rumor",
    question: "Les rumeurs de transfert, ça vous affecte ?",
    choices: [
      { id: "focused", label: "Je suis concentré sur mon club", tone: "diplomat", imageDelta: 5, coachTrustDelta: 5, moraleDelta: 0, pressureDelta: -5 },
      { id: "open", label: "On verra ce qui se passe", tone: "neutral", imageDelta: 0, coachTrustDelta: -5, moraleDelta: 0, pressureDelta: 5 },
      { id: "deny", label: "Pas de commentaire", tone: "neutral", imageDelta: 0, coachTrustDelta: 0, moraleDelta: 0, pressureDelta: 0 },
    ],
  },
  {
    id: "bad-result",
    question: "L'équipe traverse une mauvaise passe, comment réagir ?",
    choices: [
      { id: "leader", label: "On va se relever, j'en suis sûr", tone: "diplomat", imageDelta: 5, coachTrustDelta: 5, moraleDelta: 5, pressureDelta: -3 },
      { id: "blame", label: "Il y a des problèmes en interne", tone: "arrogant", imageDelta: -10, coachTrustDelta: -10, moraleDelta: -5, pressureDelta: 10 },
      { id: "deflect", label: "Le football c'est comme ça", tone: "neutral", imageDelta: 0, coachTrustDelta: 0, moraleDelta: 0, pressureDelta: 0 },
    ],
  },
  {
    id: "young-talent",
    question: "Vous êtes un exemple pour les jeunes, un conseil ?",
    choices: [
      { id: "mentor", label: "Travaillez dur et restez humbles", tone: "humble", imageDelta: 10, coachTrustDelta: 3, moraleDelta: 5, pressureDelta: 0 },
      { id: "star", label: "Regardez-moi et apprenez", tone: "arrogant", imageDelta: -8, coachTrustDelta: -2, moraleDelta: 3, pressureDelta: 5 },
    ],
  },
];

export interface PressConference {
  id: string;
  dayNumber: number;
  questions: PressQuestion[];
  answers: { questionId: string; choiceId: string }[];
}
