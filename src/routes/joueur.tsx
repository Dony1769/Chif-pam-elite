import { createFileRoute } from '@tanstack/react-router';
import { Profile } from '@/features/career/components';
import { careerHead } from '@/features/career/meta';
export const Route = createFileRoute('/joueur')({ head: () => careerHead('Mon joueur', 'Consultez les 51 attributs, le potentiel et les événements de votre carrière.'), component: Profile });