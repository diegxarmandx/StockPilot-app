# StockPilot branding and Supabase configuration verification

This report records the earlier configuration task. Live Supabase connection, seeding, restart and API verification have since completed; see [Phase 1 Supabase seed verification](seed-verification.md).

Verified locally on September 26, 2026 (America/Puerto_Rico). No private Supabase project or credentials were accessed.

| Check | Actual result |
| --- | --- |
| Backend default tests | **30 passed**, 0 failures/errors/skips, using isolated H2 with main `DB_*` variables unset |
| Backend PostgreSQL profile | **30 passed**: 27 catalog API executions on native PostgreSQL **14.17**, plus 3 isolated seed checks (the seed integration test remains on H2) |
| Backend direct startup | `./mvnw spring-boot:run` connected to isolated PostgreSQL using only `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`; a JDBC `sslmode=disable` parameter was passed through for the local non-SSL database |
| Backend helper startup | `scripts/dev-backend.sh` started the updated application successfully on port 8080 against the isolated local database |
| Helper smoke checks | Missing-value reporting, quoted JDBC URL parameters, exported-value precedence over `.env`, and absence of credential output passed |
| Frontend lint | `npm run lint` passed with no warnings |
| Frontend TypeScript | `npm run typecheck` passed |
| Frontend production build | `npm run build` passed |
| Browser integration | **6 passed**, including StockPilot title/home branding and real product/vendor lifecycle flows, using only local PostgreSQL |
| Branding audit | No old visible branding; remaining legacy identifiers are the deliberately retained Java package/import paths |
| Credential audit | No credential-pattern findings in repository source/configuration/docs; no database environment names or Supabase credential references in browser source/production JavaScript |
| Git audit | `.env` and nested/local env files are ignored; generated artifacts remain ignored; `git diff --check` passed. This repository has no commits yet, so there is no committed history to scan |
| Docker fallback | Preserved, with separate `LOCAL_DB_*` variables and a required local password; runtime **not verified** because installed Docker CLI links point to a missing Docker application |
| Hosted Supabase / SSL | **Not verified** without the user's private connection details and project network/certificate configuration |

The first H2 attempt inside the restricted sandbox failed because Mockito's Java instrumentation could not attach. The same suite passed outside the sandbox; no test expectations were weakened.

## Commands exercised

From `backend/`, using temporary Java 21/Maven caches (machine-specific cache flags omitted):

```bash
# DB_URL, DB_USERNAME and DB_PASSWORD unset:
./mvnw test
# TEST_DB_* supplied for a disposable native LOCAL test database:
./mvnw -Dtest.profile=postgres-test test
# DB_* supplied for the separate local application database:
./mvnw spring-boot:run
```

From the repository root, with local `DB_*` exported:

```bash
./scripts/dev-backend.sh
```

From `frontend/`:

```bash
npm run lint
npm run typecheck
npm run build
E2E_ALLOW_WRITES=true PW_CHANNEL=chrome npm run test:e2e
```

The native PostgreSQL instance uses port 56473 and separate application/test databases. Existing external databases were not modified. Browser tests target the locally configured backend and retain their test records as inactive.

## Changes reviewed

- Sidebar brand, accessible home label, page footer, initial HTML title/description, and dynamic route titles now use StockPilot.
- README/project metadata use StockPilot. Maven coordinates are `com.stockpilot:stockpilot`; the already-correct Spring application name remains `stockpilot`.
- Java package `com.opscore.erp` and imports remain unchanged.
- Main datasource has no default database URL/user/password. Standard JDBC handles supplied SSL/pooler parameters.
- Optional Compose credentials use only `LOCAL_DB_*`, not hosted `DB_*` settings. The volume is retained.
- Both `dev` and `SEED_DATA_ENABLED=true` are required for seeds. Repeated runs preserve edits and do not duplicate catalog rows.
- Automated tests use H2 or explicit local `TEST_DB_*`; browser writes require explicit opt-in.
- No Supabase SDK, Auth, frontend database access, schema migrations, or Phase 2 workflows were added.

## Remaining user verification

Follow the README's primary Supabase setup: choose a direct/session endpoint in Connect, configure the private JDBC URL/user/password locally, and keep Data API exposure disabled for this dedicated backend-only project. Start Spring Boot and React, create/edit/search/deactivate product and vendor records, and inspect `public.products` / `public.vendors` in Table Editor. Restart Spring Boot and confirm those hosted rows persist.

The Docker fallback also needs a runtime check on a machine with working Docker. Existing local data is not automatically migrated to Supabase, and renamed fallback defaults do not change an existing database volume's users or database names.
