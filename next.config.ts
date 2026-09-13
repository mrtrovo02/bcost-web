import type { NextConfig } from 'next';
import { execSync } from 'child_process';

/**
 * Resolve o Build ID único para sincronização de Server Components e Server Actions.
 * Garante consistência de hashes entre deploys e restarts do processo.
 */
function resolveBuildId(): string {
  const envBuildVersion =
    process.env.BUILD_VERSION || process.env.NEXT_PUBLIC_BUILD_VERSION;
  if (envBuildVersion) {
    return 'bcost-release-' + envBuildVersion;
  }

  try {
    const gitHash = execSync('git rev-parse --short HEAD', {
      encoding: 'utf8',
      timeout: 3000,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();

    if (gitHash) {
      return 'bcost-release-' + gitHash;
    }
  } catch {
    // Fallback gracioso caso git não esteja disponível no ambiente de build
  }

  return 'bcost-release-' + (process.env.NODE_ENV || 'production');
}

const buildId = resolveBuildId();
const isDevelopment = process.env.NODE_ENV !== 'production';

// Origens de conexão permitidas na Política de Segurança de Conteúdo (CSP)
const connectSources = [
  "'self'",
  'https://api.bcost.com.br',
  ...(isDevelopment
    ? [
        'http://localhost:5000',
        'http://127.0.0.1:5000',
        'http://localhost:5001',
        'http://127.0.0.1:5001',
        'ws:',
        'wss:',
      ]
    : []),
].join(' ');

const scriptSources = [
  "'self'",
  "'unsafe-inline'",
  ...(isDevelopment ? ["'unsafe-eval'"] : []),
].join(' ');

const styleSources = ["'self'", "'unsafe-inline'"].join(' ');

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
  productionBrowserSourceMaps: false,

  // Otimização de Keep-Alive para garantir encerramento gracioso no PM2/SIGINT
  httpAgentOptions: {
    keepAlive: true,
  },

  typescript: {
    ignoreBuildErrors: false,
  },

  // Garante que o ID da build seja determinístico
  generateBuildId: async () => buildId,

  // Configurações para Server Actions e requisições RSC
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
      allowedOrigins: ['bcost.com.br', '*.bcost.com.br', 'localhost:3000', '127.0.0.1:3000'],
    },
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.bcost.com.br',
      },
    ],
  },

  async rewrites() {
    const internalApiUrl = process.env.INTERNAL_API_URL || 'http://127.0.0.1:5000';

    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: `${internalApiUrl}/:path*`,
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },

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
            value: `default-src 'self'; script-src ${scriptSources}; style-src ${styleSources}; img-src 'self' data: https:; font-src 'self' data:; connect-src ${connectSources}; frame-ancestors 'self'; base-uri 'self'; form-action 'self'`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
