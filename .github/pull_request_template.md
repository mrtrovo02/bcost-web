## Summary

Describe the change and the user-facing or production risk it reduces.

## Type

- [ ] fix
- [ ] feat
- [ ] security
- [ ] chore
- [ ] docs

## Safety Checklist

- [ ] No secrets, `.env`, tokens, customer data, fiscal XMLs, or screenshots with production data were committed.
- [ ] Demo data cannot appear inside real authenticated sessions.
- [ ] API calls use the centralized client or typed API module.
- [ ] Loading, empty, error, and success states are preserved for data-driven UI.
- [ ] Tax, billing, company selection, login/logout, or tenant changes include focused tests.

## Validation

- [ ] `npm run security:scan`
- [ ] `npm run typecheck`
- [ ] focused tests for changed module
- [ ] `npm run build`
- [ ] `npm run release:check` when production/env behavior changed

## Deployment Notes

List EC2 commands, env changes, PM2 reload order, and browser smoke checks.
