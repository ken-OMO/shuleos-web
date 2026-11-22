# Live two-school integration verification

## Current backend baseline

Updated 15 November 2026 (Africa/Nairobi). The live workflow now pins merged backend main `785d86adffe14ad8d143ae5e2832a597a095dcd8` (PR #88), and verifies that exact checkout before installing/migrating it. The frontend starting tree is dashboard branch `a951e50d9632f88913b163c1335547e24f02cf85` (PR #1 merged); develop is unchanged. API PR #87 is also merged.

Backend post-merge CI passed all six jobs, including 2,498 tests / 35,125 assertions: https://github.com/ken-OMO/shuleos-api/actions/runs/43750275569. The frontend live gate must be rerun at this backend pin; its exact frontend head, workflow run and outcome are recorded in the corresponding draft frontend PR. Earlier results below are historical and do not count as a rerun against the new pin.

The nine live tests remain unchanged: actual Laravel HTTP/PostgreSQL, five role dashboards across two schools, logout/account switching, refresh revocation, reciprocal foreign-school resource denial and linked/unlinked-child boundaries. No fixture-only permission grants, mocked API responses or production records are introduced. The workflow also runs on pushes to the dashboard target branch so a later merge can verify the same pinned gate.

This rerun verifies authentication/dashboard compatibility with the new backend baseline. It does not establish whole-ERP subscription enforcement or business-form workflows; those remain on hold. The backend subscription/lifecycle first-slice tests are separate evidence in PR #88. Deployment and real-school Elections remain blocked.

## Historical candidate record

Historical status before the merges: 15 November 2026. The scoped live integration gate **PASSED** against backend candidate `4ead486ea2b240e0266ed21538ea67f695128654` and frontend `d1d8fcf8c4c83019ac5c0d922f43c221f315c2fc`. Both PR #1 (web) and #87 (API) remain drafts. No business workflows, merge or deployment.

## Historical final-candidate follow-up

At that stage the live workflow pinned backend `bf06a480cec04ba99ea0391e43bddfb3b17aa323`, which includes the same least-privilege grants and a schema-correct leadership readiness query. Full regression of the earlier candidate exposed an existing academic-insight path filtering nonexistent child-table school columns. The repair derives paper/result ownership through parent exams and adds a nonzero two-school count/deleted-exam regression. No existing grant is removed to avoid that path. The final-candidate evidence is maintained in [API PR #87](https://github.com/ken-OMO/shuleos-api/pull/87) and [web PR #1](https://github.com/ken-OMO/shuleos-web/pull/1); the successful earlier scoped run remains recorded below.

## Successful candidate verification

Real Laravel/PostgreSQL CI: https://github.com/ken-OMO/shuleos-web/actions/runs/43718176219 — **9 tests passed**. All five role journeys passed in Alpha and Beta: teacher, school administrator, Principal, parent and learner. Logout revokes both `/auth/me` and refresh access; school switching does not show previous-school data. Teacher assignment and administrator user-record positive controls succeed, reciprocal foreign-school IDs are denied, parent linked-child access succeeds while unlinked/foreign children are denied, and refresh/anonymous checks pass. The fixture adds no permissions. All required baseline grant diagnostics are empty.

Fresh and existing PostgreSQL candidate checks: https://github.com/ken-OMO/shuleos-api/actions/runs/43718172107 — **23 tests / 203 assertions per database state**, plus an existing-state CLI probe preserving existing rows and a legitimate prior grant while adding exactly fourteen missing role/permission pairs; rerun is a no-op.

The backend repair adds fifteen explicit pairs to active global system roles only. Principal/Headteacher receive the legacy module-entry permission, phase-two entry and four read-only dashboard permissions (principal dashboard, KPIs, action queue and alerts). Teacher receives own-assignment read access; Parent/Learner receive their portal-entry grants. No test-only grant, fixture override, guard removal or broad permission replay was used.

This proves only the exercised paths on the named candidate commits. It does not establish every ERP endpoint, platform OTP/email delivery, production deployment readiness or real-school Elections readiness. Business workflows have not started. Review and merge decisions are separate from this test result.

## Historical failed baseline

The sections below preserve the original failure and diagnosis against main `e5199c420a32d5e371789bc5678fa7f03649a6c4`. They are superseded by the successful candidate results above.

## Environment and method

- Backend pinned to `ken-OMO/shuleos-api` commit `e5199c420a32d5e371789bc5678fa7f03649a6c4`.
- Real Laravel HTTP server, PHP 8.2, PostgreSQL 16 service and built Next.js frontend in GitHub Actions.
- Two freshly seeded synthetic schools (Alpha and Beta); five real role identities per school, parent/learner links and teacher academic assignments.
- Real login, JWT middleware, permission resolution, HTTP requests and browser rendering. No intercepted API responses, injected JWTs or bypassed middleware.
- No role permissions added by the fixture. Only migrated baseline permissions are used.
- Isolated database `shuleos_live_integration_test`; fixture CLI refuses other environments, non-local DB hosts, cached config or unsafe mail/cache configuration.
- File-backed cache persists blacklist state across real requests. Cache is cleared between independent tests for isolated rate-limit buckets, never within a token-revocation scenario.
- No production records, external mail or election stations used.

## Observed results

First completed real integration run: https://github.com/ken-OMO/shuleos-web/actions/runs/43715403425

Nine tests executed: **5 passed, 4 failed**.

| Scenario | Result | Evidence / limit |
|---|---|---|
| Teacher login → role dashboard → logout → second-school switch | Passed | Both schools; school identity shown; previous token rejected by `/auth/me` and `/auth/refresh`; protected page redirects after logout |
| School-admin login → dashboard → logout → second-school switch | Passed | Same checks in both schools |
| Principal dashboard journey | Blocked | Authenticated Principal reaches permission-denied UI; dashboard request is never issued |
| Parent dashboard journey | Blocked | Authenticated Parent reaches permission-denied UI; phase-two dashboard request is never issued |
| Learner dashboard journey | Blocked | Authenticated Learner reaches permission-denied UI; phase-two dashboard request is never issued |
| Teacher assignment cross-school denial | Inconclusive / blocked | Own-assignment positive control returned 403, so foreign-assignment denial cannot count as isolation proof |
| Administrator user-record tenant isolation | Passed | Own-school lookup succeeds; reciprocal foreign-school IDs are denied; spoofed school input does not return the foreign school |
| Parent child-record scope | Passed | Linked-child positive controls succeed; same-school unlinked and foreign-school child IDs are denied in both directions |
| Refresh and anonymous access | Passed | Refresh rotates JWT; old JWT fails, new JWT succeeds; all five dashboard endpoints reject anonymous requests |

Passing checks establish only these exercised boundaries. They do not establish isolation across every ERP endpoint, production deployment, platform OTP or first-login email delivery.

## Source diagnosis

The following portal migrations grant permissions only to roles already present, skipping absent roles:

- `2026_07_18_100002_add_teacher_portal_mobile_phase_one_permissions.php`
- `2026_07_18_210002_add_leadership_portal_phase_two_permissions.php`
- `2026_07_18_220002_add_learner_portal_phase_two_permissions.php`
- `2026_07_19_010002_add_parent_portal_phase_two_permissions.php`

Core system roles are ensured later by `2026_08_11_092718_ensure_core_system_roles.php`. The subsequent `2026_08_11_094331_backfill_core_system_role_permissions.php` grants the older/core portal permissions, omitting the dashboard phase-two and teacher own-assignment permissions needed here. This ordering is consistent with the real fresh-database failures. The harness prints safe role/permission diagnostics and asserts authoritative login claims to make the missing grants explicit.

Do not repair this by weakening frontend guards, bypassing backend authorization, granting all permissions, or silently adding fixture-only grants.

## Historical next development action (completed; superseded by the current baseline)

Prepare a forward-only, idempotent, least-privilege backend role-permission backfill using the intended role contracts. Preserve school-specific/custom-role choices and existing grants. Verify migration behavior on a freshly migrated PostgreSQL database and an existing database, with role-boundary regression tests. Then rerun all nine live tests against the resulting pinned backend commit before reopening the business-workflow gate.

The backend source was not modified in this verification work. Student Elections remains blocked for real-school use.

## Reproduce

The `.github/workflows/live-integration.yml` workflow owns the isolated environment and runs `npm run test:live`. `tests/live/seed.php` creates the synthetic records. The generated `tests/live/fixtures.json` contains test-only credentials, is ignored by Git, and is not uploaded as an artifact. Browser failure snapshots contain only synthetic UI records. Raw Laravel logs are not published.
