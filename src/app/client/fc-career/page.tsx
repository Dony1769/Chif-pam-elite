"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { checkAccessCode, markSessionUnlocked } from './utils/session';
import { loadGame } from './utils/storage';

export default function FcCareerAuthPage() {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<boolean>(false);
  const [shaking, setShaking] = useState(false);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (checkAccessCode(pin)) {
      markSessionUnlocked();
      const save = loadGame();
      const next = save?.player ? '/client/fc-career/dashboard' : '/client/fc-career/create-player';
      window.location.assign(next);
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
      background: '#05081a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Barlow', 'Barlow Condensed', system-ui, sans-serif",
    }}>
      {/* Fond vivant — radiales bleu nuit avec halo or */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 60% 50% at 20% 20%, rgba(20,35,80,.5), transparent),
          radial-gradient(ellipse 50% 60% at 80% 80%, rgba(10,15,50,.6), transparent),
          radial-gradient(ellipse 30% 25% at 50% 45%, rgba(201,162,39,.05), transparent)
        `,
      }} />

      {/* Lignes décoratives stade */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: `repeating-linear-gradient(
          0deg,
          transparent,
          transparent 60px,
          rgba(100,130,200,.025) 60px,
          rgba(100,130,200,.025) 61px
        )`,
      }} />

      {/* Ticker FP — bandeau défilant */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10,
        borderBottom: '1px solid rgba(100,130,200,.10)',
        background: 'rgba(2,5,16,.95)',
        padding: '7px 0', overflow: 'hidden',
        display: 'flex', gap: 0,
      }}>
        <div style={{
          display: 'flex', gap: '28px', whiteSpace: 'nowrap',
          animation: 'fp-ticker-anim 25s linear infinite',
          fontSize: '9px', fontWeight: 700, letterSpacing: '.06em',
          color: 'rgba(142,157,192,.6)',
        }}>
          {['⚽ Académie', '✦ Ligue 1', '⚖ Contrat', '◎ Coach', '▲ Transfert', '⇄ Mercato', '✶ Formation', '🏆 Trophée'].map((t, i) => (
            <span key={i}><span style={{color:'#c9a227'}}>{t.split(' ')[0]}</span> {t.split(' ').slice(1).join(' ')}</span>
          ))}
          {/* duplicate for infinite loop */}
          {['⚽ Académie', '✦ Ligue 1', '⚖ Contrat', '◎ Coach', '▲ Transfert', '⇄ Mercato', '✶ Formation', '🏆 Trophée'].map((t, i) => (
            <span key={`b${i}`}><span style={{color:'#c9a227'}}>{t.split(' ')[0]}</span> {t.split(' ').slice(1).join(' ')}</span>
          ))}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@400;500;600;700&display=swap');
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
          background: 'rgba(13,17,40,.92)',
          border: '1px solid rgba(201,162,39,.22)',
          borderRadius: '12px',
          boxShadow: '0 0 60px rgba(0,0,0,.7), 0 0 40px rgba(201,162,39,.06)',
          overflow: 'hidden',
        }}
        style-extra={{ animation: shaking ? 'fp-shake .5s ease' : undefined } as React.CSSProperties}
      >
        {/* Liseré or en haut */}
        <div style={{
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #c9a227 30%, #e8c84a 50%, #c9a227 70%, transparent)',
        }} />

        <div style={{ padding: '40px 32px 36px' }}>
          {/* Logo / emblème */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '72px', height: '72px',
              background: 'linear-gradient(135deg, rgba(201,162,39,.15) 0%, rgba(201,162,39,.05) 100%)',
              border: '1px solid rgba(201,162,39,.35)',
              borderRadius: '12px',
              fontSize: '36px', marginBottom: '16px',
              boxShadow: '0 0 24px rgba(201,162,39,.12)',
            }}>
              🏆
            </div>
            <h1 style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: '32px', fontWeight: 900,
              color: '#E8ECF0', letterSpacing: '-0.01em',
              textTransform: 'uppercase', lineHeight: 1, margin: 0,
            }}>
              FC Career
            </h1>
            <p style={{
              fontSize: '11px', fontWeight: 600,
              color: '#c9a227', letterSpacing: '.08em',
              marginTop: '6px', textTransform: 'uppercase',
            }}>
              Zone Privée ✦ Accès Restreint
            </p>
          </div>

          {/* Séparateur losanges */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            marginBottom: '24px',
            fontSize: '9px', color: 'rgba(100,130,200,.3)',
            letterSpacing: '.06em',
          }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(100,130,200,.12)' }} />
            <span style={{ color: 'rgba(201,162,39,.4)', fontWeight: 700 }}>◆ ◆ ◆</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(100,130,200,.12)' }} />
          </div>

          {/* Formulaire */}
          <form onSubmit={handleVerify}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{
                display: 'block', fontSize: '9px', fontWeight: 700,
                letterSpacing: '.06em', color: 'rgba(142,157,192,.7)',
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
                  background: 'rgba(2,5,16,.8)',
                  border: `1px solid ${error ? 'rgba(241,107,115,.5)' : 'rgba(100,130,200,.18)'}`,
                  borderRadius: '8px',
                  color: '#c9a227', fontSize: '24px',
                  fontWeight: 800, letterSpacing: '8px', textAlign: 'center',
                  outline: 'none', transition: 'border-color .2s',
                  fontFamily: "'Barlow Condensed', sans-serif",
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(201,162,39,.4)'}
                onBlur={(e) => e.currentTarget.style.borderColor = error ? 'rgba(241,107,115,.5)' : 'rgba(100,130,200,.18)'}
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  fontSize: '11px', fontWeight: 700, textAlign: 'center',
                  color: '#F16B73', marginBottom: '12px',
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
                background: 'linear-gradient(135deg, #c9a227 0%, #e8c84a 100%)',
                color: '#05081a', border: 'none', borderRadius: '8px',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: '15px', fontWeight: 900,
                letterSpacing: '.05em', textTransform: 'uppercase',
                cursor: 'pointer', transition: 'all .2s',
                boxShadow: '0 4px 20px rgba(201,162,39,.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 6px 28px rgba(201,162,39,.38)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(201,162,39,.25)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Accéder à ma carrière →
            </button>
          </form>

          {/* Chiffres clés style FP */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1px', background: 'rgba(100,130,200,.08)',
            borderRadius: '8px', overflow: 'hidden',
            marginTop: '24px',
          }}>
            {[
              { val: '5', label: 'Ligues' },
              { val: '24', label: 'Modules' },
              { val: '0€', label: 'Gratuit' },
            ].map(({ val, label }) => (
              <div key={label} style={{
                background: 'rgba(2,5,16,.6)', textAlign: 'center',
                padding: '12px 8px',
              }}>
                <strong style={{
                  display: 'block',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: '22px', fontWeight: 800, color: '#c9a227', lineHeight: 1,
                }}>{val}</strong>
                <span style={{ fontSize: '8px', color: 'rgba(142,157,192,.6)', fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pied de carte */}
        <div style={{
          padding: '12px 32px', borderTop: '1px solid rgba(100,130,200,.08)',
          background: 'rgba(2,5,16,.4)', textAlign: 'center',
          fontSize: '8px', color: 'rgba(100,130,200,.35)', letterSpacing: '.04em',
          fontWeight: 600,
        }}>
          ✦ CHIFPAM ELITE · FC CAREER 27 ✦
        </div>
      </motion.div>
    </div>
  );
}
