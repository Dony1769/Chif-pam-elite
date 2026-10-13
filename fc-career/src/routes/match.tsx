import { createFileRoute } from '@tanstack/react-router';
import { MatchCenter } from '@/features/career/components';
import { careerHead } from '@/features/career/meta';
export const Route = createFileRoute('/match')({ head: () => careerHead('Centre de match', 'Préparez et disputez vos rencontres avec une simulation et une chronologie en direct.'), component: MatchCenter });