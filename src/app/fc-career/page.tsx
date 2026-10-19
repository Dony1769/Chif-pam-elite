"use client";

import Link from "next/link";
import React, { useState } from 'react';
import { FcEmblem } from "@/components/portal/FcEmblem";
import { motion } from 'framer-motion';
import { checkAccessCode, markSessionUnlocked } from './utils/session';

export default function FcCareerAuthPage() {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<boolean>(false);
  const [shaking, setShaking] = useState(false);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (checkAccessCode(pin)) {
      markSessionUnlocked();
      // Choix du mode : Carrière Joueur (principale) ou Carrière Manager
      window.location.assign('/fc-career/modes');
    } else {
      setShaking(true);
      setError(true);
      setPin('');
      setTimeout(() => setShaking(false), 500);
    }
  };

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#0A0C0F',
      display: 'flex',
      flexDirection: 'column',
      gap: '28px',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 16px',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "Inter, system-ui, sans-serif",
    }}>
      {/* Fond vivant — radiales bleu nuit avec halo or */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 60% 50% at 20% 20%, rgba(66,200,255,.10), transparent),
          radial-gradient(ellipse 50% 60% at 80% 80%, rgba(10,12,15,.6), transparent),
          radial-gradient(ellipse 30% 25% at 50% 45%, rgba(185,255,57,.05), transparent)
        `,
      }} />

      {/* Lignes décoratives stade */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: `repeating-linear-gradient(
          0deg,
          transparent,
          transparent 60px,
          rgba(255,255,255,.025) 60px,
          rgba(255,255,255,.025) 61px
        )`,
      }} />

      {/* Ticker FP — bandeau défilant */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10,
        borderBottom: '1px solid rgba(255,255,255,.10)',
        background: 'rgba(10,12,15,.95)',
        padding: '7px 0', overflow: 'hidden',
        display: 'flex', gap: 0,
      }}>
        <div style={{
          display: 'flex', gap: '28px', whiteSpace: 'nowrap',
          animation: 'fp-ticker-anim 25s linear infinite',
          fontSize: '9px', fontWeight: 700, letterSpacing: '.06em',
          color: 'rgba(141,152,166,.6)',
        }}>
          {['⚽ Académie', '✦ Ligue 1', '⚖ Contrat', '◎ Coach', '▲ Transfert', '⇄ Mercato', '✶ Formation', '🏆 Trophée'].map((t, i) => (
            <span key={i}><span style={{color:'#B9FF39'}}>{t.split(' ')[0]}</span> {t.split(' ').slice(1).join(' ')}</span>
          ))}
          {/* duplicate for infinite loop */}
          {['⚽ Académie', '✦ Ligue 1', '⚖ Contrat', '◎ Coach', '▲ Transfert', '⇄ Mercato', '✶ Formation', '🏆 Trophée'].map((t, i) => (
            <span key={`b${i}`}><span style={{color:'#B9FF39'}}>{t.split(' ')[0]}</span> {t.split(' ').slice(1).join(' ')}</span>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes fp-ticker-anim { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes fp-shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-6px)} 80%{transform:translateX(6px)} }
        @keyframes fp-glow-pulse { 0%,100%{opacity:.4} 50%{opacity:.7} }
      `}</style>

      {/* Carte principale */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22,1,0.36,1] }}
        style={{
          position: 'relative', zIndex: 20,
          width: '100%', maxWidth: '420px',
          background: 'rgba(21,26,32,.92)',
          border: '1px solid rgba(185,255,57,.22)',
          borderRadius: '12px',
          boxShadow: '0 0 60px rgba(0,0,0,.7), 0 0 40px rgba(185,255,57,.06)',
          overflow: 'hidden',
          animation: shaking ? 'fp-shake .5s ease' : undefined,
        }}
      >
        {/* Liseré or en haut */}
        <div style={{
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #B9FF39 30%, #D6FF85 50%, #B9FF39 70%, transparent)',
        }} />

        <div style={{ padding: '40px 32px 36px' }}>
          {/* Logo / emblème */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '84px', height: '96px',
              background: 'linear-gradient(135deg, rgba(185,255,57,.15) 0%, rgba(185,255,57,.05) 100%)',
              border: '1px solid rgba(185,255,57,.35)',
              borderRadius: '12px',
              fontSize: '36px', marginBottom: '16px',
              boxShadow: '0 0 24px rgba(185,255,57,.12)',
            }}>
              <FcEmblem size={56} />
            </div>
            <h1 style={{
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: '32px', fontWeight: 900,
              color: '#DCE3EA', letterSpacing: '-0.01em',
              textTransform: 'uppercase', lineHeight: 1, margin: 0,
            }}>
              FC Career
            </h1>
            <p style={{
              fontSize: '11px', fontWeight: 600,
              color: '#B9FF39', letterSpacing: '.08em',
              marginTop: '6px', textTransform: 'uppercase',
            }}>
              Zone Privée ✦ Accès Restreint
            </p>
          </div>

          {/* Séparateur losanges */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            marginBottom: '24px',
            fontSize: '9px', color: 'rgba(255,255,255,.3)',
            letterSpacing: '.06em',
          }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,.12)' }} />
            <span style={{ color: 'rgba(185,255,57,.4)', fontWeight: 700 }}>◆ ◆ ◆</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,.12)' }} />
          </div>

          {/* Formulaire */}
          <form onSubmit={handleVerify}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{
                display: 'block', fontSize: '9px', fontWeight: 700,
                letterSpacing: '.06em', color: 'rgba(141,152,166,.7)',
                textTransform: 'uppercase', marginBottom: '8px',
              }}>
                🔐 Code PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={4}
                value={pin}
                onChange={(e) => { setError(false); setPin(e.target.value.replace(/\D/g, '')); }}
                placeholder="• • • •"
                style={{
                  width: '100%', height: '52px',
                  background: 'rgba(10,12,15,.8)',
                  border: `1px solid ${error ? 'rgba(241,107,115,.5)' : 'rgba(255,255,255,.18)'}`,
                  borderRadius: '8px',
                  color: '#B9FF39', fontSize: '24px',
                  fontWeight: 800, letterSpacing: '8px', textAlign: 'center',
                  outline: 'none', transition: 'border-color .2s',
                  fontFamily: "Inter, system-ui, sans-serif",
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(185,255,57,.4)'}
                onBlur={(e) => e.currentTarget.style.borderColor = error ? 'rgba(241,107,115,.5)' : 'rgba(255,255,255,.18)'}
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  fontSize: '11px', fontWeight: 700, textAlign: 'center',
                  color: '#FF6B72', marginBottom: '12px',
                  letterSpacing: '.02em',
                }}
              >
                ✗ Code incorrect — réessayez
              </motion.p>
            )}

            <button
              type="submit"
              style={{
                width: '100%', height: '48px',
                background: 'linear-gradient(135deg, #B9FF39 0%, #D6FF85 100%)',
                color: '#0A0C0F', border: 'none', borderRadius: '8px',
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: '15px', fontWeight: 900,
                letterSpacing: '.05em', textTransform: 'uppercase',
                cursor: 'pointer', transition: 'all .2s',
                boxShadow: '0 4px 20px rgba(185,255,57,.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 6px 28px rgba(185,255,57,.38)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(185,255,57,.25)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Accéder à ma carrière →
            </button>
          </form>

          {/* Chiffres clés style FP */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1px', background: 'rgba(255,255,255,.08)',
            borderRadius: '8px', overflow: 'hidden',
            marginTop: '24px',
          }}>
            {[
              { val: '5', label: 'Ligues' },
              { val: '24', label: 'Modules' },
              { val: '0€', label: 'Gratuit' },
            ].map(({ val, label }) => (
              <div key={label} style={{
                background: 'rgba(10,12,15,.6)', textAlign: 'center',
                padding: '12px 8px',
              }}>
                <strong style={{
                  display: 'block',
                  fontFamily: "Inter, system-ui, sans-serif",
                  fontSize: '22px', fontWeight: 800, color: '#B9FF39', lineHeight: 1,
                }}>{val}</strong>
                <span style={{ fontSize: '8px', color: 'rgba(141,152,166,.6)', fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pied de carte */}
        <div style={{
          padding: '12px 32px', borderTop: '1px solid rgba(255,255,255,.08)',
          background: 'rgba(10,12,15,.4)', textAlign: 'center',
          fontSize: '8px', color: 'rgba(255,255,255,.35)', letterSpacing: '.04em',
          fontWeight: 600,
        }}>
          ✦ CHIFPAM ELITE · FC CAREER 27 ✦
        </div>
      </motion.div>

      {/* Présentation publique du jeu (lisible par les moteurs de recherche) */}
      <section style={{ position: 'relative', zIndex: 1, width: 'min(560px, 100%)', color: 'rgba(220,227,234,.82)', fontSize: 14, lineHeight: 1.6 }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 18, color: '#EEF2F8', fontWeight: 800 }}>FC Career 27, le mode carrière de football dans ton navigateur</h2>
        <p style={{ margin: '0 0 10px' }}>
          Crée ton joueur à 17 ans et gagne ta place, ou prends les rênes d&apos;un club. Matchs en direct avec des moments clés à jouer,
          négociation de contrats, mercato, prêts, sélection nationale, Euro et Coupe du monde. Gratuit, sans installation.
        </p>
        <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
          <li>Carrière Joueur : progression, PlayStyles, objectifs, rival de ta génération</li>
          <li>Carrière Manager : tactique, transferts, finances et conseil d&apos;administration</li>
          <li>Dix championnats, coupes nationales et européennes</li>
        </ul>
        <p style={{ margin: '12px 0 0' }}><Link href="/" style={{ color: '#9DBBFF' }}>Retour à l&apos;accueil ChifPam</Link></p>
      </section>
    </div>
  );
}
