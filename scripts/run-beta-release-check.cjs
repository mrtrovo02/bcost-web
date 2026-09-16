'use strict';

const betaDefaults = {
  BCOST_NODE_VERSION_OVERRIDE: '24.0.0',
  NODE_ENV: 'production',
  BUILD_VERSION: 'local-beta-release-check',
  NEXT_PUBLIC_BUILD_VERSION: 'local-beta-release-check',
  NEXT_PUBLIC_RELEASE_STAGE: 'beta',
  NEXT_PUBLIC_API_URL: 'https://api.bcost.com.br/api/v1',
  NEXT_PUBLIC_API_BASE_URL: 'https://api.bcost.com.br/api/v1',
  NEXT_PUBLIC_SOCKET_URL: 'https://api.bcost.com.br',
  INTERNAL_API_URL: 'http://127.0.0.1:5000',
  NEXT_PUBLIC_ENABLE_DEMO: 'false',
  NEXT_PUBLIC_ENABLE_DEMO_FALLBACK: 'false',
  NEXT_PUBLIC_DEMO_ACCESS_MODE: 'disabled',
  NEXT_PUBLIC_APP_URL: 'https://app.bcost.com.br',
};

for (const [key, value] of Object.entries(betaDefaults)) {
  process.env[key] = value;
}

require('./validate-production-env.cjs');
