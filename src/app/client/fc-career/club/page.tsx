"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Flag, Shield, Sparkles, Wallet } from "lucide-react";
import { Shell, Crest, PageTitle, StatCard } from "../lib/components";
import { Button } from "../lib/ui";
import { loadGame, saveGame } from "../utils/storage";
import { toCareerState, toFullSave, type CareerRuntimeState } from "../types/career";
import { getClub } from "../constants/clubs";
import { DIVISION_INFO } from "../types/club";
import { formatMoneyCompact } from "../utils/formatters";
import { generateOffers, acceptOffer as doAcceptOffer } from "../engine/transfer-system";
import { emptyWallet } from "../engine/economic-engine";

export default function ClubPage() {
  const router = useRouter();
  const [career, setCareer] = useState<CareerRuntimeState | null>(null);

  useEffect(() => {
    const save = loadGame();
    if (!save?.player) { router.replace("/client/fc-career/create-player"); return; }
    setCareer(toCareerState(save));
  }, [router]);

  const persist = useCallback((next: CareerRuntimeState) => {
    setCareer(next);
    saveGame(toFullSave(next));
  }, []);

  if (!career?.player) {
    return <Shell><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 200px)', opacity: .6, gap: 8 }}><Sparkles className="animate-pulse" size={16} /><span style={{ fontSize: 12 }}>Chargement...</span></div></Shell>;
  }

  const player = career.player;
  const club = getClub(player.contract.clubId);
  const divisionName = club ? (DIVISION_INFO[club.division]?.name ?? club.division) : '';
  const wallet = career.wallet ?? emptyWallet();

  return (
    <Shell>
      <PageTitle
        eyebrow="VOTRE CLUB, VOTRE AVENIR"
        title={club?.name ?? 'Club'}
        subtitle={`Contrat de formation · Saison ${career.meta.season?.seasonYear ?? ''} · ${divisionName}`}
      />
      <div className="finance-grid">
        <StatCard icon={<Wallet />} value={formatMoneyCompact(wallet.balance)} label="Solde disponible" />
        <StatCard icon={<Shield />} value={formatMoneyCompact(player.contract.salaryPerWeek * 4)} label="Salaire mensuel" tone="yellow" />
        <StatCard icon={<Flag />} value={formatMoneyCompact(player.contract.bonusPerMatch)} label="Prime par match" tone="coral" />
      </div>
      <div className="club-layout">
        <section>
          <h2>Votre contrat</h2>
          <div className="contract-details">
            {club && <Crest name={club.shortName} clubId={club.id} />}
            <div>
              <strong>{player.firstName} {player.lastName}</strong>
              <p>{player.contract.isProfessional ? 'Professionnel' : 'Formation'} · {player.position}</p>
              <span>Duree restante : {player.contract.yearsRemaining} an(s)</span>
            </div>
          </div>
          <div className="contract-line"><span>Salaire verse chaque semaine</span><Check /></div>
          <div className="contract-line"><span>Prime de but : {formatMoneyCompact(player.contract.bonusPerGoal)}</span><Check /></div>
          {player.contract.releaseClause > 0 && (
            <div className="contract-line"><span>Clause liberatoire : {formatMoneyCompact(player.contract.releaseClause)}</span><Check /></div>
          )}
        </section>
        <section>
          <h2>Offres de transfert</h2>
          <div className="empty-state">
            <Shield />
            <h3>Votre talent fait son chemin.</h3>
            <p>Les clubs suivent vos performances. Disputez des matchs avec de bonnes notes pour attirer leur attention.</p>
          </div>
        </section>
      </div>
    </Shell>
  );
}
