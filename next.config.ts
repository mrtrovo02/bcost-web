import type { NextConfig } from 'next';
import { execSync } from 'child_process';

function resolveBuildId(): string {
  const envBuildVersion = process.env.BUILD_VERSION || process.env.NEXT_PUBLIC_BUILD_VERSION;
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
    // Fallback gracioso
  }

  return 'bcost-release-main';
}

const buildId = resolveBuildId();
const isDevelopment = process.env.NODE_ENV !== 'production';
const connectSources = [
  "'self'",
  'https://api.bcost.com.br',
  ...(isDevelopment ? ['http://localhost:5000', 'http://127.0.0.1:5000'] : []),
].join(' ');

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
  productionBrowserSourceMaps: false,

  typescript: {
    ignoreBuildErrors: true,
  },

  generateBuildId: async () => buildId,

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.bcost.com.br',
      },
    ],
  },

  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: 'http://127.0.0.1:5000/:path*',
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
            value: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src ${connectSources}; frame-ancestors 'self'; base-uri 'self'; form-action 'self'`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
