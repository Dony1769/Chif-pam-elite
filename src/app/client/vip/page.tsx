"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Crown, CheckCircle2, Zap, Star, ShieldCheck, 
  ChevronLeft, AlertTriangle, Loader2, Sparkles 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const VIP_PLANS = [
  {
    id: 'weekly',
    name: 'Elite Hebdo',
    price: 250,
    duration: '7 JOURS',
    color: 'from-emerald-500/20 to-emerald-900/40',
    border: 'border-emerald-500/30',
    icon: <Zap className="text-emerald-400" size={24} />,
    benefits: ['-10% sur frais d\'entrée', 'Badges exclusifs', 'Support prioritaire']
  },
  {
    id: 'monthly',
    name: 'Elite Mensuel',
    price: 850,
    duration: '30 JOURS',
    color: 'from-amber-500/20 to-amber-900/40',
    border: 'border-amber-500/30',
    icon: <Crown className="text-amber-400" size={28} />,
    benefits: ['-25% sur frais d\'entrée', 'Accès tournois VIP', 'Retraits ultra-rapides', 'Cadeau mensuel']
  }
];

export default function VipPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/connexion');
    
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(data);
    setLoading(false);
  };

  const handleSubscribe = async (plan: any) => {
    if (profile.balance < plan.price) {
      setError("Solde insuffisant pour ce plan.");
      return;
    }

    if (profile.vip_status !== 'free') {
      setError("Vous avez déjà un plan actif.");
      return;
    }

    setActionLoading(true);
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + (plan.id === 'weekly' ? 7 : 30));

    try {
      // Transaction : Débit + Update Profil
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          balance: profile.balance - plan.price,
          vip_status: plan.id,
          vip_expiry: expiryDate.toISOString()
        })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      // Log de transaction
      await supabase.from('transactions').insert({
        user_id: profile.id,
        amount: -plan.price,
        type: 'subscription',
        description: `Activation plan VIP ${plan.name}`
      });

      await fetchProfile();
      alert("Félicitations ! Vous êtes désormais un membre ELITE.");
    } catch (err) {
      setError("Erreur lors de la transaction.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    const confirm = window.confirm("Attention : Aucun remboursement ne sera effectué. Désactiver maintenant ?");
    if (!confirm) return;

    setActionLoading(true);
    await supabase.from('profiles').update({ vip_status: 'free', vip_expiry: null }).eq('id', profile.id);
    await fetchProfile();
    setActionLoading(false);
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-20 overflow-x-hidden font-black italic uppercase">
      
      {/* HEADER */}
      <div className="p-6 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/10">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-xl tracking-tighter">Elite <span className="text-amber-500">Membership</span></h1>
      </div>

      <div className="p-6 space-y-8">
        
        {/* STATUS ACTUEL */}
        <div className="relative p-8 rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 overflow-hidden">
          <div className="relative z-10">
            <p className="text-[10px] text-slate-500 tracking-[0.4em] mb-2">Votre Statut</p>
            <h2 className="text-3xl tracking-tighter flex items-center gap-3">
              {profile.vip_status === 'free' ? 'Membre Standard' : `Elite ${profile.vip_status}`}
              {profile.vip_status !== 'free' && <Sparkles className="text-amber-500" />}
            </h2>
            {profile.vip_status !== 'free' && (
              <p className="text-[9px] text-emerald-500 mt-4 tracking-widest">
                Expire le : {new Date(profile.vip_expiry).toLocaleDateString()}
              </p>
            )}
          </div>
          <Crown size={120} className="absolute -right-8 -bottom-8 opacity-5 text-amber-500 rotate-12" />
        </div>

        {/* ALERTES ERREUR */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-500 text-[10px]">
              <AlertTriangle size={16} /> {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* PLANS */}
        {profile.vip_status === 'free' ? (
          <div className="grid grid-cols-1 gap-6">
            {VIP_PLANS.map((plan) => (
              <motion.div 
                key={plan.id}
                whileTap={{ scale: 0.98 }}
                className={`relative p-6 rounded-[2rem] bg-gradient-to-br ${plan.color} border ${plan.border} overflow-hidden`}
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl tracking-tighter">{plan.name}</h3>
                    <p className="text-2xl font-black text-white mt-1">{plan.price} HTG <span className="text-[10px] text-slate-400">/ {plan.duration}</span></p>
                  </div>
                  <div className="p-3 bg-white/10 rounded-2xl">{plan.icon}</div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.benefits.map((b, i) => (
                    <li key={i} className="flex items-center gap-2 text-[10px] tracking-wide">
                      <CheckCircle2 size={14} className="text-emerald-500" /> {b}
                    </li>
                  ))}
                </ul>

                <button 
                  disabled={actionLoading}
                  onClick={() => handleSubscribe(plan)}
                  className="w-full py-4 bg-white text-black rounded-2xl font-black text-xs hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2"
                >
                  {actionLoading ? <Loader2 className="animate-spin" size={16} /> : 'ACTIVER LE PLAN'}
                </button>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="p-8 border border-white/5 rounded-[2rem] bg-slate-900/50 text-center space-y-6">
             <ShieldCheck size={48} className="text-emerald-500 mx-auto" />
             <p className="text-xs text-slate-400 normal-case italic">
               Votre abonnement est actif. Pour changer de plan, attendez l'expiration de la période en cours.
             </p>
             <button 
               onClick={handleCancel}
               className="text-rose-500 text-[10px] tracking-widest border-b border-rose-500/30 pb-1"
             >
               DÉSACTIVER L'ABONNEMENT
             </button>
          </div>
        )}

      </div>
    </div>
  );
}

