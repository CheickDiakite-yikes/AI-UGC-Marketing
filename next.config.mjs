/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['*.replit.dev', '*.repl.co'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

export default nextConfig
