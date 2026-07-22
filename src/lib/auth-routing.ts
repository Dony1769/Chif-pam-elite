export const APP_ROUTES = {
  login: '/connexion',
  clientHome: '/client/home',
  clientDashboard: '/client/home',
  clientChallenges: '/client/challenges',
  adminDashboard: '/admin-chif-pam/dashboard',
} as const;

export function isAdminRole(role?: string | null): boolean {
  return role === 'admin';
}

export function getHomeRouteForRole(role?: string | null): string {
  return isAdminRole(role) ? APP_ROUTES.adminDashboard : APP_ROUTES.clientHome;
}