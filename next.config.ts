/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.153.112'],
  // FC Career 27 vit hors de l'espace client : les anciens liens restent valides
  async redirects() {
    return [{ source: '/client/fc-career/:path*', destination: '/fc-career/:path*', permanent: true }];
  },
  // Espaces membres et routes techniques : jamais indexés, même via un lien externe
  async headers() {
    const noindex = [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }];
    const security = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ];
    return [
      { source: '/:path*', headers: security },
      ...['/client/:path*', '/admin-chif-pam/:path*', '/agent/:path*', '/api/:path*', '/auth/:path*', '/live',
        '/fc-career/joueur/:path*', '/fc-career/manager/:path*', '/fc-career/modes', '/fc-career/reglages', '/fc-career/world/:path*']
        .map(source => ({ source, headers: noindex })),
    ];
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;