/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  images: {
    unoptimized: true, // Obligatoire avec 'export' pour éviter les crashs d'images
  },
};

export default nextConfig;