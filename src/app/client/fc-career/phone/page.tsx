"use client";

/**
 * FC CAREER — Étape 14 : Téléphone & Relations Humaines
 * Route: /client/fc-career/phone
 */

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  MessageCircle,
  Phone,
  Send,
  Swords,
  Users,
} from "lucide-react";
import { Shell, PageTitle, StatCard } from "../lib/components";
import { Button, Dialog, DialogContent, DialogTitle, DialogDescription } from "../lib/ui";
import { loadGame, saveGame } from "../utils/storage";
import type { FullSave } from "../utils/storage";
import type { PhoneState, Contact, PhoneMessage, Relationship } from "../types/phone";
import {
  createPhoneState,
  generateDailyMessages,
  respondToMessage,
  addMessages,
  generateInitialRelationships,
  hasMentorBonus,
  rivalComparison,
} from "../engine/phone-system";

type Tab = "messages" | "contacts" | "relations";

const TABS: { id: Tab; label: string; icon: typeof Phone }[] = [
  { id: "messages", label: "Messages", icon: MessageCircle },
  { id: "contacts", label: "Contacts", icon: Phone },
  { id: "relations", label: "Relations", icon: Users },
];

const ease4 = [0.22, 1, 0.36, 1] as [number, number, number, number];

const CONTACT_TYPE_LABEL: Record<string, string> = {
  agent: "Agent", coach: "Coach", teammate: "Coéquipier", rival: "Rival",
  family: "Famille", selector: "Sélectionneur", journalist: "Journaliste", fans: "Fans",
};

const REL_TYPE_LABEL: Record<string, string> = { mentor: "Mentor", rival: "Rivalité", friend: "Amitié" };
const REL_TYPE_ICON: Record<string, typeof Heart> = { mentor: Users, rival: Swords, friend: Heart };

export default function PhonePage() {
  const [save, setSave] = useState<FullSave | null>(null);
  const [tab, setTab] = useState<Tab>("messages");
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [chatModal, setChatModal] = useState(false);

  useEffect(() => { setSave(loadGame()); }, []);

  const phone: PhoneState = save?.meta?.phoneState ?? createPhoneState();
  const player = save?.player;

  const persist = useCallback((updated: PhoneState) => {
    setSave(prev => {
      if (!prev) return prev;
      const next: FullSave = { ...prev, meta: { ...prev.meta, phoneState: updated } };
      saveGame(next);
      return next;
    });
  }, []);

  // Initialize relationships if empty
  useEffect(() => {
    if (player && phone.relationships.length === 0) {
      const rels = generateInitialRelationships(player.contract?.clubId ?? "", player.age);
      persist({ ...phone, relationships: rels });
    }
  }, [player, phone, persist]);

  const receiveMessages = useCallback(() => {
    const day = save?.meta?.season?.currentDay ?? 1;
    const msgs = generateDailyMessages(day);
    const updated = addMessages(phone, msgs);
    persist(updated);
  }, [save, phone, persist]);

  const handleRespond = useCallback((messageId: string, choiceId: string) => {
    const { state: updated } = respondToMessage(phone, messageId, choiceId);
    persist(updated);
  }, [phone, persist]);

  const openChat = useCallback((contactId: string) => {
    setSelectedContact(contactId);
    setChatModal(true);
  }, []);

  if (!save) {
    return (
      <Shell>
        <PageTitle eyebrow="ÉTAPE 14" title="Téléphone" subtitle="Chargement..." />
      </Shell>
    );
  }

  const contactMessages = selectedContact ? phone.messages.filter(m => m.contactId === selectedContact).slice(-10) : [];
  const mentorActive = hasMentorBonus(phone.relationships);
  const rival = player ? rivalComparison(phone.relationships, player.overall) : null;

  return (
    <Shell>
      <PageTitle
        eyebrow="ÉTAPE 14"
        title="Téléphone"
        subtitle="Messages, contacts et relations"
        action={
          <Button variant="action" onClick={receiveMessages}>
            <MessageCircle /> Recevoir messages
          </Button>
        }
      />

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <StatCard icon={<MessageCircle />} value={phone.unreadCount} label="Non lus" tone={phone.unreadCount > 0 ? "red" : "green"} />
        <StatCard icon={<Phone />} value={phone.contacts.length} label="Contacts" tone="blue" />
        <StatCard icon={<Users />} value={phone.relationships.filter(r => r.active).length} label="Relations" tone="amber" />
        <StatCard icon={<Heart />} value={mentorActive ? "Actif" : "—"} label="Bonus mentor" tone={mentorActive ? "green" : "blue"} />
      </div>

      {/* Rival comparison */}
      {rival && (
        <div style={{ padding: "0.75rem 1rem", background: rival.playerBetter ? "var(--primary)" : "var(--destructive)", color: "white", borderRadius: "0.5rem", marginBottom: "1.5rem", fontSize: "0.875rem" }}>
          <Swords style={{ display: "inline", marginRight: "0.5rem", width: 16, height: 16 }} />
          {rival.playerBetter
            ? `Vous surpassez ${rival.rivalName} ! Image +10`
            : `${rival.rivalName} vous devance... Pression +10`
          }
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {TABS.map(t => (
          <Button key={t.id} variant={tab === t.id ? "career" : "ghost"} onClick={() => setTab(t.id)}>
            <t.icon /> {t.label}
          </Button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25, ease: ease4 }}>

          {/* ---- MESSAGES ---- */}
          {tab === "messages" && (
            <div style={{ display: "grid", gap: "0.5rem" }}>
              {phone.messages.length === 0 ? (
                <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
                  <MessageCircle style={{ width: 48, height: 48, margin: "0 auto 1rem", opacity: 0.3 }} />
                  <p>Aucun message. Appuyez sur &ldquo;Recevoir messages&rdquo;.</p>
                </div>
              ) : (
                phone.messages.slice(-15).reverse().map(msg => {
                  const contact = phone.contacts.find(c => c.id === msg.contactId);
                  return (
                    <div key={msg.id} className="card" style={{ padding: "1rem", opacity: msg.chosenId ? 0.6 : 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <span style={{ fontWeight: 600 }}>
                          {contact?.emoji} {contact?.name ?? CONTACT_TYPE_LABEL[msg.contactType]}
                        </span>
                        {!msg.read && !msg.chosenId && (
                          <span style={{ background: "var(--destructive)", color: "white", fontSize: "0.7rem", padding: "0.15rem 0.5rem", borderRadius: "1rem" }}>Nouveau</span>
                        )}
                      </div>
                      <p style={{ marginBottom: "0.75rem", fontSize: "0.9rem" }}>{msg.text}</p>
                      {msg.chosenId ? (
                        <p style={{ fontSize: "0.8rem", opacity: 0.6 }}>
                          Répondu : {msg.choices.find(c => c.id === msg.chosenId)?.label}
                        </p>
                      ) : (
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                          {msg.choices.map(c => (
                            <Button key={c.id} variant="outline" onClick={() => handleRespond(msg.id, c.id)} style={{ fontSize: "0.8rem" }}>
                              {c.label}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ---- CONTACTS ---- */}
          {tab === "contacts" && (
            <div style={{ display: "grid", gap: "0.5rem" }}>
              {phone.contacts.map(contact => (
                <div
                  key={contact.id}
                  className="card"
                  style={{ padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                  onClick={() => openChat(contact.id)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span style={{ fontSize: "1.5rem" }}>{contact.emoji}</span>
                    <div>
                      <strong>{contact.name}</strong>
                      <p style={{ fontSize: "0.8rem", opacity: 0.6 }}>{CONTACT_TYPE_LABEL[contact.type]}</p>
                    </div>
                  </div>
                  {contact.unread > 0 && (
                    <span style={{ background: "var(--destructive)", color: "white", width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700 }}>
                      {contact.unread}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ---- RELATIONS ---- */}
          {tab === "relations" && (
            <div style={{ display: "grid", gap: "1rem" }}>
              {phone.relationships.filter(r => r.active).length === 0 ? (
                <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
                  <Users style={{ width: 48, height: 48, margin: "0 auto 1rem", opacity: 0.3 }} />
                  <p>Aucune relation active.</p>
                </div>
              ) : (
                phone.relationships.filter(r => r.active).map(rel => {
                  const Icon = REL_TYPE_ICON[rel.type] ?? Users;
                  return (
                    <div key={rel.id} className="card" style={{ padding: "1.25rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <Icon />
                          <div>
                            <strong>{rel.personName}</strong>
                            <p style={{ fontSize: "0.8rem", opacity: 0.6 }}>{REL_TYPE_LABEL[rel.type]} · Rating {rel.personRating}</p>
                          </div>
                        </div>
                        <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>{rel.level}/100</span>
                      </div>
                      <div style={{ background: "var(--muted)", borderRadius: "0.5rem", height: "0.5rem", overflow: "hidden" }}>
                        <div style={{
                          height: "100%", borderRadius: "0.5rem",
                          width: `${rel.level}%`,
                          background: rel.level >= 70 ? "var(--primary)" : rel.level >= 40 ? "var(--warning, orange)" : "var(--destructive)",
                        }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Chat modal */}
      <Dialog open={chatModal} onOpenChange={setChatModal}>
        <DialogContent>
          <DialogTitle>{phone.contacts.find(c => c.id === selectedContact)?.emoji} {phone.contacts.find(c => c.id === selectedContact)?.name}</DialogTitle>
          <DialogDescription>Historique des messages</DialogDescription>
          <div style={{ display: "grid", gap: "0.75rem", marginTop: "1rem", maxHeight: "400px", overflowY: "auto" }}>
            {contactMessages.length === 0 ? (
              <p style={{ opacity: 0.5 }}>Aucun message avec ce contact.</p>
            ) : (
              contactMessages.map(msg => (
                <div key={msg.id} style={{ padding: "0.75rem", background: "var(--muted)", borderRadius: "0.5rem" }}>
                  <p style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>{msg.text}</p>
                  {msg.chosenId ? (
                    <p style={{ fontSize: "0.8rem", opacity: 0.7, fontStyle: "italic" }}>
                      → {msg.choices.find(c => c.id === msg.chosenId)?.label}
                    </p>
                  ) : (
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      {msg.choices.map(c => (
                        <Button key={c.id} variant="outline" onClick={() => { handleRespond(msg.id, c.id); }} style={{ fontSize: "0.8rem" }}>
                          {c.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
