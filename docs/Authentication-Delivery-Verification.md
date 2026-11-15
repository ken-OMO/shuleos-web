# Authentication delivery verification

Backend contract: ken-OMO/shuleos-api e5199c420a32d5e371789bc5678fa7f03649a6c4.
Frontend starting point: feature/frontend-dashboard-workspace-phase-1 d6f59f733ed95a615e9ba3c52d7929c1812b6d80.

## Implemented

- Explicit school (`username`) and platform (`identifier`) sign-in endpoints.
- Authoritative string role claims, scope, nullable platform school, and school identity consistency checks.
- HTTP 202 challenge state, OTP verification, first-login activation for both scopes; no authenticated state or /me request until a token is issued.
- Challenge expiry and cancellation; challenge secrets and access tokens remain in memory. Reload requires a fresh login.
- Cache cancellation and clearing on login/logout/expiry; dashboard query keys include scope, tenant and user.
- Session generations reject previous-session API results and prevent old login/refresh completions from restoring authorization.
- Logout clears local authorization even if the server is unavailable.

## Local evidence (15 November 2026)

22 unit/contract tests passed, including the real Zustand store, Axios interceptors and dashboard service with controlled responses for Alpha and Beta schools. Tests cover login, role landing, separate bearer tokens, logout, direct account switch, cache removal, late-response rejection, platform OTP and activation, invalid OTP, expired/cancelled/malformed challenges, and failed network logout.

TypeScript, ESLint and production build passed. Browser suite is supplied but could not launch Chromium here: required socket creation returned EPERM. No PHP or PostgreSQL runtime is installed, so no Laravel/database integration or production authorization verification was performed. Controlled fixtures cannot prove server tenant isolation.

## Reproduce

```sh
npm ci
npm test
npx tsc --noEmit
npm run lint
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

For an existing Chromium executable, set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH. The browser suite uses intercepted, contract-shaped API responses; it does not contact a real school API. GitHub Actions runs the same checks and browser suite.

## Required next gate before business workflows

Run the browser suite in a browser-capable environment, then repeat against an isolated Laravel/PostgreSQL test deployment with two seeded schools and test-only credentials. Verify the school and platform login paths, both activation paths, each role dashboard, logout and account switching. Attempt foreign-school IDs and unlinked-child IDs directly against the API and verify denial; exercise subscription read-only/locked states. Do not use production learner records or real-school Elections.

Nothing deployed. Student Elections remains blocked for real-school use. No business workflows were added.
