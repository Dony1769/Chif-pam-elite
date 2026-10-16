/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.153.112'],
  // FC Career 27 vit hors de l'espace client : les anciens liens restent valides
  async redirects() {
    return [{ source: '/client/fc-career/:path*', destination: '/fc-career/:path*', permanent: true }];
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;