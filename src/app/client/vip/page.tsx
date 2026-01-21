"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, Crown, CheckCircle2, Zap, 
  ShieldCheck, Star, ArrowRight, Loader2 
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function VIPPage() {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    getProfile();
  }, []);

  const getProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(data);
    }
  };

  const handleSubscribe = async (type: 'weekly' | 'monthly', price: number) => {
    setLoading(true);
    try {
      if (profile.balance < price) {
        alert("Solde insuffisant ! Rechargez votre compte.");
        return;
      }

      const duration = type === 'weekly' ? 7 : 30;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + duration);

      // 1. Débiter le solde et Update profil
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          balance: profile.balance - price,
          is_vip: true,
          vip_type: type,
          vip_until: expiryDate.toISOString()
        })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      // 2. Enregistrer la transaction
      await supabase.from('transactions').insert({
        user_id: profile.id,
        amount: -price,
        type: 'subscription',
        description: `Abonnement VIP ${type}`
      });

      alert("Félicitations ! Vous êtes maintenant membre ELITE.");
      router.push('/client/home');
    } catch (error) {
      console.error(error);
      alert("Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-20 overflow-x-hidden font-black italic uppercase">
      
      {/* HEADER */}
      <div className="p-6 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/10">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-xl tracking-tighter italic">Elite <span className="text-amber-500 font-black">Membership</span></h1>
      </div>

      <main className="px-6 space-y-8">
        
        {/* HERO SECTION */}
        <div className="relative p-8 rounded-[3rem] bg-gradient-to-br from-amber-500/20 via-slate-900 to-slate-900 border border-amber-500/30 overflow-hidden shadow-2xl">
            <Crown size={120} className="absolute -right-8 -top-8 text-amber-500/10 rotate-12" />
            <div className="relative z-10">
                <span className="bg-amber-500 text-slate-950 text-[10px] px-3 py-1 rounded-full font-black mb-4 inline-block">STATUS: {profile?.is_vip ? 'ACTIF' : 'NON MEMBRE'}</span>
                <h2 className="text-4xl tracking-tighter mb-2">Passez au <br /><span className="text-amber-500">Niveau Supérieur</span></h2>
                <p className="text-[10px] text-slate-400 normal-case italic font-medium max-w-[200px]">Maximisez vos gains et réduisez vos frais avec le pass Elite.</p>
            </div>
        </div>

        {/* AVANTAGES */}
        <div className="grid grid-cols-1 gap-4">
            <BenefitCard icon={<Zap className="text-amber-500" />} title="Frais Réduits" desc="-50% sur les frais de défis" />
            <BenefitCard icon={<ShieldCheck className="text-emerald-500" />} title="Retraits Prioritaires" desc="Validation en moins d'une heure" />
            <BenefitCard icon={<Star className="text-blue-500" />} title="Défis Exclusifs" desc="Accès aux tournois High-Stakes" />
        </div>

        {/* OFFRES */}
        <div className="space-y-4">
            <h3 className="text-center text-xs tracking-[0.3em] text-slate-500">Choisissez votre plan</h3>
            
            {/* WEEKLY */}
            <PlanCard 
                title="Hebdomadaire" 
                price={250} 
                duration="7 JOURS"
                color="border-white/10"
                onSelect={() => handleSubscribe('weekly', 250)}
                loading={loading}
            />

            {/* MONTHLY (BEST VALUE) */}
            <PlanCard 
                title="Mensuel" 
                price={850} 
                duration="30 JOURS"
                color="border-amber-500/50"
                isPopular
                onSelect={() => handleSubscribe('monthly', 850)}
                loading={loading}
            />
        </div>

      </main>
    </div>
  );
}

// COMPOSANTS INTERNES
function BenefitCard({ icon, title, desc }: any) {
    return (
        <div className="flex items-center gap-4 p-5 bg-slate-900/50 border border-white/5 rounded-3xl">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center shrink-0">{icon}</div>
            <div>
                <h4 className="text-xs font-black tracking-tight">{title}</h4>
                <p className="text-[9px] text-slate-500 italic lowercase">{desc}</p>
            </div>
        </div>
    );
}

function PlanCard({ title, price, duration, color, isPopular, onSelect, loading }: any) {
    return (
        <div className={`relative p-6 rounded-[2.5rem] bg-slate-900 border-2 ${color} transition-all active:scale-95`}>
            {isPopular && <span className="absolute -top-3 right-8 bg-amber-500 text-slate-950 text-[8px] font-black px-4 py-1 rounded-full shadow-lg shadow-amber-500/20">MEILLEURE OFFRE</span>}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h4 className="text-xl font-black italic">{title}</h4>
                    <p className="text-[10px] text-slate-500 tracking-widest">{duration}</p>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-black text-white">{price} <span className="text-[10px] text-emerald-500">HTG</span></p>
                </div>
            </div>
            <button 
                onClick={onSelect}
                disabled={loading}
                className="w-full py-4 bg-white text-black rounded-2xl font-black text-xs flex items-center justify-center gap-2"
            >
                {loading ? <Loader2 className="animate-spin" /> : <>ACTIVER MAINTENANT <ArrowRight size={16} /></>}
            </button>
        </div>
    );
}

