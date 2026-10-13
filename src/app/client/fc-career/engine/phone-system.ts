/**
 * FC CAREER — Étape 14 : Engine Téléphone & Relations
 */

import type {
  PhoneState,
  Contact,
  ContactType,
  PhoneMessage,
  MessageChoice,
  Relationship,
  RelationType,
} from "../types/phone";
import { MESSAGE_TEMPLATES } from "../types/phone";

/* ------------------------------------------------------------------ */
/* Contacts                                                            */
/* ------------------------------------------------------------------ */

const DEFAULT_CONTACTS: Contact[] = [
  { id: "agent", type: "agent", name: "Mon Agent", emoji: "📞", unread: 0 },
  { id: "coach", type: "coach", name: "Le Coach", emoji: "📋", unread: 0 },
  { id: "teammate-1", type: "teammate", name: "Coéquipier", emoji: "⚽", unread: 0 },
  { id: "rival", type: "rival", name: "Rival au poste", emoji: "🔥", unread: 0 },
  { id: "family", type: "family", name: "Famille", emoji: "❤️", unread: 0 },
  { id: "selector", type: "selector", name: "Sélectionneur", emoji: "🏳️", unread: 0 },
  { id: "journalist", type: "journalist", name: "Journaliste", emoji: "🎤", unread: 0 },
  { id: "fans", type: "fans", name: "Fans", emoji: "📱", unread: 0 },
];

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

export function createPhoneState(): PhoneState {
  return {
    contacts: [...DEFAULT_CONTACTS],
    messages: [],
    relationships: [],
    unreadCount: 0,
  };
}

/* ------------------------------------------------------------------ */
/* Message generation                                                  */
/* ------------------------------------------------------------------ */

let msgCounter = 0;

/** Generate a random message from a contact type. */
export function generateMessage(contactType: ContactType, dayNumber: number): PhoneMessage | null {
  const templates = MESSAGE_TEMPLATES.filter(t => t.contactType === contactType);
  if (templates.length === 0) return null;

  const template = templates[Math.floor(Math.random() * templates.length)];
  const contactId = contactType === "teammate" ? "teammate-1" : contactType;
  msgCounter++;

  return {
    id: `msg-${dayNumber}-${msgCounter}`,
    contactId,
    contactType,
    text: template.text,
    choices: template.choices.map((c, i) => ({ ...c, id: `choice-${i}` })),
    chosenId: null,
    dayNumber,
    read: false,
  };
}

/** Generate 1-3 random messages for a day. */
export function generateDailyMessages(dayNumber: number): PhoneMessage[] {
  const types: ContactType[] = ["agent", "coach", "teammate", "rival", "family", "selector", "journalist", "fans"];
  const count = 1 + Math.floor(Math.random() * 3);
  const shuffled = types.sort(() => Math.random() - 0.5);
  const messages: PhoneMessage[] = [];

  for (let i = 0; i < count && i < shuffled.length; i++) {
    const msg = generateMessage(shuffled[i], dayNumber);
    if (msg) messages.push(msg);
  }

  return messages;
}

/* ------------------------------------------------------------------ */
/* Message response                                                    */
/* ------------------------------------------------------------------ */

export function respondToMessage(
  state: PhoneState,
  messageId: string,
  choiceId: string,
): { state: PhoneState; choice: MessageChoice } {
  const msgIndex = state.messages.findIndex(m => m.id === messageId);
  if (msgIndex === -1) return { state, choice: { id: "", label: "", moraleDelta: 0, imageDelta: 0, pressureDelta: 0, relationDelta: 0 } };

  const msg = state.messages[msgIndex];
  const choice = msg.choices.find(c => c.id === choiceId)!;

  const updatedMessages = [...state.messages];
  updatedMessages[msgIndex] = { ...msg, chosenId: choiceId, read: true };

  // Update contact unread
  const updatedContacts = state.contacts.map(c =>
    c.id === msg.contactId ? { ...c, unread: Math.max(0, c.unread - 1) } : c
  );

  const unreadCount = updatedMessages.filter(m => !m.read).length;

  return {
    state: { ...state, messages: updatedMessages, contacts: updatedContacts, unreadCount },
    choice,
  };
}

/** Mark a message as read. */
export function markRead(state: PhoneState, messageId: string): PhoneState {
  const updatedMessages = state.messages.map(m =>
    m.id === messageId ? { ...m, read: true } : m
  );
  const unreadCount = updatedMessages.filter(m => !m.read).length;
  const updatedContacts = state.contacts.map(c => {
    const contactUnread = updatedMessages.filter(m => m.contactId === c.id && !m.read && m.chosenId === null).length;
    return { ...c, unread: contactUnread };
  });
  return { ...state, messages: updatedMessages, contacts: updatedContacts, unreadCount };
}

/** Add new messages to state and update unread counts. */
export function addMessages(state: PhoneState, messages: PhoneMessage[]): PhoneState {
  const allMessages = [...state.messages, ...messages];
  const updatedContacts = state.contacts.map(c => {
    const contactUnread = allMessages.filter(m => m.contactId === c.id && !m.read && m.chosenId === null).length;
    return { ...c, unread: contactUnread };
  });
  const unreadCount = allMessages.filter(m => !m.read && m.chosenId === null).length;
  return { ...state, messages: allMessages, contacts: updatedContacts, unreadCount };
}

/* ------------------------------------------------------------------ */
/* Relationships                                                       */
/* ------------------------------------------------------------------ */

export function createRelationship(
  type: RelationType,
  name: string,
  clubId: string,
  rating: number,
  age: number,
): Relationship {
  return {
    id: `${type}-${name.toLowerCase().replace(/\s/g, "-")}`,
    type,
    personName: name,
    personClubId: clubId,
    personRating: rating,
    personAge: age,
    level: type === "rival" ? 30 : type === "mentor" ? 70 : 50,
    active: true,
  };
}

export function updateRelationshipLevel(rel: Relationship, delta: number): Relationship {
  return { ...rel, level: Math.max(0, Math.min(100, rel.level + delta)) };
}

/** Generate initial relationships for a player. */
export function generateInitialRelationships(playerClubId: string, playerAge: number): Relationship[] {
  const rels: Relationship[] = [];

  // Mentor (if young)
  if (playerAge <= 22) {
    rels.push(createRelationship("mentor", "Carlos Mendes", playerClubId, 82, 32));
  }

  // Rival
  rels.push(createRelationship("rival", "Théo Dupont", playerClubId, 76 + Math.floor(Math.random() * 8), 22 + Math.floor(Math.random() * 6)));

  // Friend
  rels.push(createRelationship("friend", "Amadou Diallo", playerClubId, 72 + Math.floor(Math.random() * 6), 20 + Math.floor(Math.random() * 5)));

  return rels;
}

/** Check if mentor bonus applies. */
export function hasMentorBonus(relationships: Relationship[]): boolean {
  return relationships.some(r => r.type === "mentor" && r.active && r.level >= 60);
}

/** Check rival comparison — returns pressure delta. */
export function rivalComparison(
  relationships: Relationship[],
  playerRating: number,
): { rivalName: string; playerBetter: boolean; delta: number } | null {
  const rival = relationships.find(r => r.type === "rival" && r.active);
  if (!rival) return null;
  const playerBetter = playerRating > rival.personRating;
  return {
    rivalName: rival.personName,
    playerBetter,
    delta: playerBetter ? -5 : 10, // pressure delta
  };
}
