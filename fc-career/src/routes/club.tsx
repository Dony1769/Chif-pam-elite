import { createFileRoute } from '@tanstack/react-router';
import { Club } from '@/features/career/components';
import { careerHead } from '@/features/career/meta';
export const Route = createFileRoute('/club')({ head: () => careerHead('Club et contrats', 'Gérez votre salaire, votre solde et les offres de transfert.'), component: Club });