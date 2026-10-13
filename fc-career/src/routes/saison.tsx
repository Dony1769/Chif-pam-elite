import { createFileRoute } from '@tanstack/react-router';
import { Season } from '@/features/career/components';
import { careerHead } from '@/features/career/meta';
export const Route = createFileRoute('/saison')({ head: () => careerHead('Ma saison', 'Suivez le calendrier de vos 48 matchs et vos résultats de saison.'), component: Season });