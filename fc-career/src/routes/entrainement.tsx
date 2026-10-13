import { createFileRoute } from '@tanstack/react-router';
import { Training } from '@/features/career/components';
import { careerHead } from '@/features/career/meta';
export const Route = createFileRoute('/entrainement')({ head: () => careerHead('Entraînement', 'Choisissez votre session et améliorez vos attributs en gérant votre fatigue.'), component: Training });