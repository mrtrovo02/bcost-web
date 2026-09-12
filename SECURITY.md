# Security Policy

## Supported Scope

The `main` branch is the only supported branch for security fixes in the bCost Web application.

## Reporting a Vulnerability

Do not open public issues with secrets, tokens, customer data, fiscal documents, XML files, screenshots with production data, or payment information.

Report suspected vulnerabilities privately to the repository owner and include:

- affected route, component, or API client;
- reproduction steps without real customer data;
- expected impact;
- browser and environment;
- relevant `x-bcost-trace-id`, if available;
- whether the issue affects authentication, tenant isolation, billing, demo separation, or fiscal workflows.

## Production Security Rules

- Demo data must never be shown inside real authenticated sessions.
- Demo fallback must be explicit and disabled on the official production app unless a controlled sandbox is intentionally enabled.
- Readable browser storage must not be treated as the source of truth for production authentication.
- Frontend requests must use the centralized API client and must not send bypass headers.
- Security fixes must pass session tests, release checks, typecheck, build, and the versioned secret scan before deployment.

## Incident Response

For production incidents, follow [docs/runbooks/incident-response.md](docs/runbooks/incident-response.md).

Treat login loops, demo/real session mixing, missing active companies, broken protected routes, billing failures, and API client regressions as high-priority incidents until proven otherwise.
