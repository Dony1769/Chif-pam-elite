export const APP_ROUTES = {
  login: '/connexion',
  clientHome: '/client/home',
  clientDashboard: '/client/home',
  clientChallenges: '/client/challenges',
  adminDashboard: '/admin-chif-pam/dashboard',
  agentDashboard: '/agent/dashboard',
} as const;

export function isAdminRole(role?: string | null): boolean {
  return role === 'admin';
}

export function isAgentRole(role?: string | null): boolean {
  return role === 'agent';
}

export function getHomeRouteForRole(role?: string | null): string {
  if (isAdminRole(role)) return APP_ROUTES.adminDashboard;
  if (isAgentRole(role)) return APP_ROUTES.agentDashboard;
  return APP_ROUTES.clientHome;
}