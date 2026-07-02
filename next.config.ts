import type { NextConfig } from 'next';
import { execSync } from 'child_process';

const buildVersion = process.env.BUILD_VERSION || process.env.NEXT_PUBLIC_BUILD_VERSION;
let buildId = buildVersion ? `bcost-release-${buildVersion}` : 'bcost-release-local';

try {
  if (!buildVersion) {
    buildId = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  }
} catch {
  buildId = 'bcost-release-main';
}

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        // Intercepta qualquer chamada que comece com /api/
        source: '/api/:path*',
        // Faz o proxy transparente para a sua API na AWS
        destination: 'https://api.bcost.com.br/api/:path*',
      },
    ];
  },
  poweredByHeader: false,
  reactStrictMode: true,

  // 🔐 Segurança e consistência
  productionBrowserSourceMaps: false,

  typescript: {
    ignoreBuildErrors: false,
  },

  // ⚡ Performance
  compress: true,

  // 🧠 Cache busting determinístico (Evita quebra de Server Actions pós-build)
  generateBuildId: async () => {
    return buildId;
  },

  // 🖼 Imagens externas seguras
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.bcost.com.br',
      },
    ],
  },

  // 🔐 Headers de segurança (nível enterprise)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.bcost.com.br; frame-ancestors 'self'; base-uri 'self'; form-action 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
