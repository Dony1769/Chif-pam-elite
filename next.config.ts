/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.153.112'],
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;