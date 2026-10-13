import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from '@/features/career/components';
import { careerHead } from '@/features/career/meta';
export const Route = createFileRoute("/")({
  head: () => careerHead('Ma carrière', 'Construisez votre carrière de footballeur : entraînements, matchs, progression et contrats.'),
  component: Dashboard,
});
