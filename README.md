# StockPilot

StockPilot is a small ERP-style operations application focused on purchasing and inventory workflows. It is being built as a production-style full-stack project using Java, Spring Boot, React, TypeScript, and PostgreSQL.

This repository implements **Phase 0 (foundation)** and **Phase 1 (products and vendors)** only.

## Stack

| Layer | Versions and dependencies |
| --- | --- |
| Backend | Java 21, Maven 3.9.11 (wrapper), Spring Boot 3.5.16 |
| Spring starters | Web, Data JPA, Validation, Test 3.5.16; Spring Web/MVC 6.2.19 and Spring Data JPA 3.5.13 |
| Persistence | Hibernate ORM 6.6.53.Final, PostgreSQL JDBC 42.7.11, HikariCP 6.3.3 |
| Validation / boilerplate | Hibernate Validator 8.0.3.Final, Lombok 1.18.46 |
| Backend testing | JUnit Jupiter 5.12.2, Spring Boot Test / MockMvc, H2 2.3.232; optional real PostgreSQL profile |
| Frontend | React / React DOM 19.3.0, TypeScript 5.9.3, Vite 7.3.6, React Router DOM 7.18.4 |
| Styling | Tailwind CSS / Vite plugin 4.3.3, Lucide React 1.48.0, locally bundled DM Sans and IBM Plex Mono 5.3.0 |
| Frontend tooling | ESLint 9.39.5, typescript-eslint 8.70.1, React Hooks / Refresh lint plugins, Playwright 1.63.0, Prettier 3.9.9 |
| Primary development database | Supabase-hosted PostgreSQL, through standard JDBC |
| Optional local fallback | Docker Compose with PostgreSQL 16.13 Alpine and a persistent named volume |

Exact direct frontend versions are pinned in [`frontend/package.json`](frontend/package.json), with transitive versions locked in `package-lock.json`. Backend versions are pinned by the [Maven POM](backend/pom.xml) and the Spring Boot dependency BOM. The [Spring Boot requirements](https://docs.spring.io/spring-boot/3.5/system-requirements.html) and [Tailwind Vite setup](https://tailwindcss.com/docs/installation/using-vite) informed the foundation.

## Architecture

```text
React + TypeScript
        |
        | REST/JSON
        v
Spring Boot REST API
        |
        v
  JPA / Hibernate
        |
        v
Supabase PostgreSQL
```

```text
.
├── backend/
│   ├── .mvn/ + mvnw / mvnw.cmd
│   ├── pom.xml
│   └── src/
│       ├── main/java/com/opscore/erp/
│       │   ├── config/       # Local CORS and opt-in dev seed
│       │   ├── controller/   # HTTP routing and validation
│       │   ├── domain/       # JPA entities; never returned by controllers
│       │   ├── dto/          # Separate create, update, response and page DTOs
│       │   ├── exception/    # Consistent JSON errors
│       │   ├── repository/   # JPA persistence and specifications
│       │   └── service/      # Transactions and business rules
│       └── test/            # HTTP-to-database integration coverage
├── frontend/
│   ├── e2e/                 # Browser verification against a running backend
│   └── src/
│       ├── components/      # Tables' controls, fields, feedback and dialogs
│       ├── hooks/           # Abortable API reads and catalog query state
│       ├── layouts/         # Shared workspace shell
│       ├── pages/           # Catalogs, forms and phase placeholders
│       ├── services/        # Central fetch client and mutations
│       └── types/           # Typed API contracts
├── scripts/dev-backend.sh
├── docker-compose.yml
├── .env.example
└── README.md
```

Controllers handle HTTP, services own business logic and transactions, and repositories persist entities. Search, filtering, stock status, and pagination are canonical on the backend. The frontend calls only Spring Boot; there is no Supabase SDK, Supabase Auth, or direct browser database access. The Java package `com.opscore.erp` remains for import compatibility; Maven coordinates are `com.stockpilot:stockpilot`.

Money uses `BigDecimal` / `numeric(12,2)` and is returned as a decimal **string**, not a JavaScript floating-point amount.

## Prerequisites

- JDK **21**, with `JAVA_HOME` pointing to that installation.
- Node.js **22.12 or newer** and npm.
- A Supabase development project and its database connection details.
- Docker with Compose **only for the optional local fallback**.
- Internet access for initial Maven/npm dependencies and the hosted database.

Maven is provided by the wrapper. On Windows use `mvnw.cmd`; the environment helper requires Bash.

## Primary setup: Supabase PostgreSQL

1. Create or select your Supabase development project. Open **Connect** in its dashboard.
2. Select a **Direct connection** or **Session pooler** connection for this persistent Spring Boot process. Copy the actual host, port, database and username; do not construct a pooler hostname yourself. Direct connections depend on the available IP/network support; session pooling is suitable when your network needs IPv4. See [Supabase connection guidance](https://supabase.com/docs/guides/database/connecting-to-postgres).
3. Use the **database password**, not an anon/publishable/service-role API key. StockPilot does not need Supabase API keys.
4. For a dedicated StockPilot project, open **Integrations → Data API** and turn **Enable Data API** off before starting Spring Boot. JDBC and Table Editor remain the access paths for this application. Hibernate-created tables do not automatically receive RLS protection through the dashboard table-creation flow. If another application needs the Data API, keep StockPilot tables out of exposed access or enable RLS on `public.products` and `public.vendors` before adding data, with no public access policies. Do not grant `anon`/`authenticated` access for StockPilot. See [Supabase's Data API controls](https://supabase.com/docs/guides/api/securing-your-api).
5. Ensure the chosen database role can connect and create/alter/read/write tables and sequences in `public` while development uses `ddl-auto: update`. The connection dialog's database owner login supports this development setup. Do not enable Supabase Auth or add browser access policies.

Create the local, ignored configuration:

```bash
cp .env.example .env
```

Edit the three blank database entries locally. This is a **structure example only**; replace every angle-bracket value using your project's Connect dialog:

```dotenv
DB_URL='jdbc:postgresql://<host>:<port>/<database>?sslmode=require'
DB_USERNAME='<database-or-pooler-username>'
DB_PASSWORD='<database-password>'
VITE_API_BASE_URL=http://localhost:8080
```

Keep username/password out of the URL. Quote values for shell loading, especially URLs containing `&` and passwords containing shell punctuation. If your password contains a single quote, use correct shell escaping or export it through your local secret/environment tooling instead of copying this quoting literally.

Start the backend from the repository root:

```bash
./scripts/dev-backend.sh
```

The script loads root `.env`, preserves explicitly exported application settings over file values, and reports missing required variable **names** without printing credentials. No Docker dependency is assumed.

To use the requested Maven command directly, export the environment first. Spring Boot does **not** automatically source `.env`:

```bash
# From the repository root, in Bash/zsh:
set -a
source .env
set +a
cd backend
./mvnw spring-boot:run
```

Start the frontend separately:

```bash
cd frontend
npm ci
npm run dev
```

Open **http://localhost:5173**. The sidebar should show **API Status: Connected**. `GET http://localhost:8080/api/health` returns `{"status":"UP"}`; this checks API reachability, not ongoing database readiness. Confirm database access by loading or creating a product/vendor.

Vite reads root `.env` through `envDir` and exposes only `VITE_` variables. **Never put database credentials into a `VITE_` variable.** The browser only receives the Spring Boot API origin. Restart Vite after changing its environment. Port 5173 is strict so CORS origins stay predictable.

### SSL and pooler behavior

`DB_URL` is passed unchanged to PostgreSQL JDBC. There is no host/port assumption or Supabase-specific persistence code. Include `sslmode=require` for encrypted hosted connections. This encrypts transport but does not verify the server certificate; for verification, use `sslmode=verify-full` with Supabase's root certificate and the JDBC `sslrootcert` parameter. See [the SSL guidance](https://supabase.com/docs/guides/database/connecting-to-postgres#connecting-with-ssl).

Use direct or session pooling for normal development and Hibernate schema updates. If you intentionally use a **transaction pooler**, disable server-side prepared statements via an additional JDBC parameter:

```text
jdbc:postgresql://<host>:<port>/<database>?sslmode=require&prepareThreshold=0
```

[Supabase documents this JDBC setting](https://supabase.com/docs/guides/database/connecting-to-postgres#prepared-statements). No pooler mode is forced by the application. Do not configure SSL for local PostgreSQL unless you have set up local server certificates.

### Optional sample data

Seeding is **off by default**, including when connecting to Supabase. Both the `dev` profile and `SEED_DATA_ENABLED=true` must be explicitly supplied:

```bash
# From repository root, after DB_* configuration:
SEED_DATA_ENABLED=true ./scripts/dev-backend.sh -Dspring-boot.run.profiles=dev
```

Only use this when you intentionally want sample records in the selected database. Only missing demo records are inserted: products match by exact SKU; vendors match by trimmed, case-insensitive name. Existing values and inactive records are preserved. A renamed vendor no longer matches its original seed name. Seeding is transactional. Run initial seeding from a single backend instance, then return to normal startup with seeding disabled.

| SKU | Product | Unit cost | Stock | Reorder point |
| --- | --- | ---: | ---: | ---: |
| SKU-001 | Safety Gloves | $12.50 | 120 | 20 |
| SKU-002 | Packaging Box | $3.25 | 8 | 10 |
| SKU-003 | Shipping Tape | $4.75 | 0 | 5 |

Vendors: Caribbean Supply Co. and PR Distribution Group, with blank contact details.

## Optional fallback: local PostgreSQL through Docker Compose

Compose remains available for offline database work, contributors without Supabase, and isolated testing. It uses **separate `LOCAL_DB_*` variables**, never your Supabase `DB_USERNAME` or `DB_PASSWORD`.

In `.env`, choose a local-only `LOCAL_DB_PASSWORD`. The example defaults database/user to `stockpilot` and port to `5432`. Then, from the repository root:

```bash
docker compose up -d --wait
# Export LOCAL_DB_* values from the local configuration:
set -a
source .env
set +a
# Override only this backend process to use the local fallback:
DB_URL="jdbc:postgresql://localhost:${LOCAL_DB_PORT:-5432}/${LOCAL_DB_NAME:-stockpilot}" \
DB_USERNAME="${LOCAL_DB_USERNAME:-stockpilot}" \
DB_PASSWORD="$LOCAL_DB_PASSWORD" \
./scripts/dev-backend.sh
```

For direct Maven startup, export those same local `DB_*` overrides, then run `./mvnw spring-boot:run` in `backend/`. The local password is required only when using Compose. Supabase is never contacted by Compose.

```bash
docker compose ps
docker compose logs postgres
docker compose exec postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
docker compose down
```

The loopback-only port binding, health check and persistent `postgres_data` volume are retained. Existing volumes keep their original users/database/password: set `LOCAL_DB_*` to match them rather than assuming renamed defaults will migrate a database. Changing providers does not copy existing local records into Supabase. `docker compose down -v` destroys the local data; use it only for an intentional reset.

If port 5432 is occupied, change `LOCAL_DB_PORT` and use the same port in the local JDBC URL. Docker is not required for normal Supabase startup.

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `DB_URL` | **Required; no default** | PostgreSQL JDBC URL, including any SSL parameters |
| `DB_USERNAME` | **Required; no default** | Database username from the selected connection mode |
| `DB_PASSWORD` | **Required; no default** | Database password, backend only |
| `VITE_API_BASE_URL` | `http://localhost:8080` | Frontend API origin, without `/api` suffix |
| `SERVER_PORT` | `8080` | Backend HTTP port |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated frontend origins |
| `SHOW_SQL` | `false` | Development SQL logging |
| `SPRING_PROFILES_ACTIVE` | Empty | `dev` permits opt-in sample seeding |
| `SEED_DATA_ENABLED` | `false` | Also required to enable sample seeding |
| `LOCAL_DB_NAME` | `stockpilot` | Optional Compose database name |
| `LOCAL_DB_USERNAME` | `stockpilot` | Optional Compose database user |
| `LOCAL_DB_PASSWORD` | Required **only for Compose** | Separate local database password |
| `LOCAL_DB_PORT` | `5432` | Optional Compose host port |

Test-only settings: `TEST_DB_URL`, `TEST_DB_USERNAME`, and `TEST_DB_PASSWORD` are required for the PostgreSQL test profile and must refer to a **disposable local database**. H2 tests require none of them. Browser tests require the deliberate opt-in `E2E_ALLOW_WRITES=true`; optional `E2E_BASE_URL`, `E2E_API_BASE_URL` and `PW_CHANNEL` configure their local servers/browser. Never set `TEST_DB_URL` to your Supabase development project or run browser mutation tests against a backend using it.

## Implemented features

- Local database, Java backend, Vite frontend, health check and explicit CORS.
- Product catalog with create, fetch, full update, soft deactivation and server-side SKU/name search.
- Vendor directory with create, fetch, full update, soft deactivation and server-side name/email search.
- Both catalogs support active filtering, bounded pagination, loading, empty and error states.
- Dedicated create/edit pages, client validation, backend field errors, success notices and confirmation dialogs.
- Unique trimmed product SKUs, database constraints, nonnegative quantities/costs, UTC creation/update timestamps.
- Backend stock status: inactive first; otherwise zero stock, at/below reorder point, or in stock.
- Basic overview with real catalog counts. Purchase orders and further dashboard insights are placeholders.
- Responsive layout, keyboard-accessible controls, labelled fields, and local fonts.

The frontend displays USD. There is no currency conversion or inventory valuation logic. Initial quantity can be entered in product forms during this phase; inventory transactions will take ownership of stock changes in a later phase.

## API

All endpoints return JSON. Successful creates return **201** with a `Location` header; reads, updates and deactivations return **200** with a response DTO. There are no hard-delete endpoints.

| Method | Endpoint | Behavior |
| --- | --- | --- |
| GET | `/api/health` | Simple API health |
| GET | `/api/products` | Paginated product search |
| POST | `/api/products` | Create product |
| GET | `/api/products/{id}` | Fetch product |
| PUT | `/api/products/{id}` | Fully update product |
| PATCH | `/api/products/{id}/deactivate` | Soft-deactivate product |
| GET | `/api/vendors` | Paginated vendor search |
| POST | `/api/vendors` | Create vendor |
| GET | `/api/vendors/{id}` | Fetch vendor |
| PUT | `/api/vendors/{id}` | Fully update vendor |
| PATCH | `/api/vendors/{id}/deactivate` | Soft-deactivate vendor |

### Search and pagination

```text
GET /api/products?search=glove&active=true&page=0&size=20
GET /api/vendors?search=caribbean&active=true&page=0&size=20
```

Both lists accept `search` (case-insensitive literal substring, maximum 200 characters), optional `active=true|false` (omit for all), zero-based `page` (default 0), and `size` (default 20, range 1–100). Results use descending IDs for stable pagination. The frontend requests 10 records per page. `%` and `_` are searched literally, not as SQL wildcards.

```json
{
  "content": [],
  "page": 0,
  "size": 20,
  "totalElements": 0,
  "totalPages": 0,
  "first": true,
  "last": true
}
```

### Example requests

```bash
curl -i http://localhost:8080/api/products \
  -H 'Content-Type: application/json' \
  -d '{"sku":"SKU-004","name":"Warehouse Labels","description":"Adhesive labels","unitCost":"9.50","quantityOnHand":50,"reorderPoint":10,"active":true}'

curl -i http://localhost:8080/api/vendors \
  -H 'Content-Type: application/json' \
  -d '{"name":"Example Supply","email":"sales@example.com","phone":"787-555-0100","active":true}'
```

Product create requires `sku`, `name`, and `unitCost`; omitted/null quantity and reorder point default to 0, and active defaults to true. Maximum lengths: SKU 64, name 160, description 4000. Unit costs have at most 10 integer and 2 fractional digits. Quantities are nonnegative 32-bit integers. SKUs are **case-sensitive**, unique across active and inactive products, and trimmed before validation.

Vendor create requires `name` (maximum 160). Email is optional and validated when supplied (maximum 254); phone is optional (maximum 40). Blank optional strings become null. Active defaults to true.

`PUT` replaces all editable fields: product updates require SKU, name, unit cost, quantity, reorder point and active; vendor updates require name and active. Omitted optional text fields are cleared. Send `active: true` when editing to reactivate a record.

Product responses add `id`, `createdAt`, `updatedAt` and canonical `stockStatus` (`IN_STOCK`, `LOW_STOCK`, `OUT_OF_STOCK`, `INACTIVE`). Vendor responses add ID and timestamps. Responses never expose JPA entities.

### Errors

A missing record returns **404**, duplicate SKU **409**, and invalid input **400**. Malformed JSON, unknown request fields and fractional integer quantities are rejected. Other persistence conflicts return **409**; unexpected errors are logged and return a generic **500** message.

```json
{
  "timestamp": "2026-09-26T12:00:00Z",
  "status": 400,
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "errors": { "name": "Name is required" }
}
```

## Tests and quality checks

### Backend: isolated H2

```bash
cd backend
./mvnw test
```

The default test profile overrides the main datasource with H2; no `DB_*` variables or live Supabase access are required. Coverage includes product/vendor lifecycle, validation, exact monetary values, concurrent duplicate SKU handling, database constraints, stock status, search, pagination, CORS and no DELETE routes. Additional tests verify that seeding requires explicit opt-in and that repeated runs preserve edits without duplicates.

### Backend: isolated PostgreSQL

Use only a **dedicated disposable local test database**; this profile creates/drops tables and the tests clear catalog data. Main `DB_*` settings are never used by this profile.

```bash
# From repository root, with the optional local Compose database running:
docker compose exec postgres sh -c 'createdb -U "$POSTGRES_USER" stockpilot_test'
set -a
source .env
set +a
cd backend
TEST_DB_URL="jdbc:postgresql://localhost:${LOCAL_DB_PORT:-5432}/stockpilot_test" \
TEST_DB_USERNAME="${LOCAL_DB_USERNAME:-stockpilot}" \
TEST_DB_PASSWORD="$LOCAL_DB_PASSWORD" \
./mvnw -Dtest.profile=postgres-test test
```

The same profile can target an isolated native local PostgreSQL instance. Seed integration tests always use their own H2 database, even when the catalog suite uses PostgreSQL.

### Frontend

```bash
cd frontend
npm run lint
npm run typecheck
npm run build
```

The production build also checks TypeScript. `npm run format` formats frontend code.

### Browser integration

These tests write records. **Start a separate backend configured for a disposable local database**, with sample data, and point the frontend at that backend. Do not use the backend connected to your Supabase development project. The explicit write opt-in prevents an accidental default run against the running app.

```bash
cd frontend
npx playwright install chromium
E2E_ALLOW_WRITES=true npm run test:e2e
# Or installed Google Chrome:
E2E_ALLOW_WRITES=true PW_CHANNEL=chrome npm run test:e2e
```

Coverage includes branding/title, real product/vendor forms, duplicate feedback, server pagination, filters, page-reload persistence, mobile layout, health, placeholders, loading/empty/error/retry states. Created fixtures are retained as inactive. The first smoke test expects a nonempty catalog.

### Manual Supabase verification

After configuring your private `DB_*` values and starting Spring Boot and React:

1. Open StockPilot and confirm API connectivity.
2. Create a product. In Supabase **Table Editor**, select schema `public`, open `products`, and refresh to find its SKU.
3. Create a vendor; refresh `public.vendors` and find its name.
4. Edit the product; refresh Table Editor and confirm the changed values and `updated_at`.
5. Stop/restart Spring Boot with the same database environment, leaving seeding off. Confirm both records persist.
6. Search by product SKU/name and vendor name/email.
7. Deactivate each record; verify `active=false` in Table Editor and the inactive status in StockPilot.

Hibernate creates the `products` and `vendors` tables on first successful startup. No manual table definitions, API keys, Supabase Auth, or JavaScript SDK are needed. If startup fails, check the selected endpoint/username, password, SSL parameters, network reachability and any project database network restrictions. The health endpoint alone is not a database verification.

See [the verification report](docs/verification.md) for checks actually run and remaining machine-specific checks. The completed live Supabase seed and restart checks are recorded in [the seed verification report](docs/seed-verification.md).

## Phase 2 and current limits

Phase 2 will introduce **Purchase Orders**, **Purchase Order Items**, and the **receiving workflow**. No purchase-order entities or business workflows exist yet.

Authentication / Spring Security, warehouse transfers, invoices, payments, AWS deployment, production migrations and inventory-transaction controls are intentionally outside this scope. The application is a local development portfolio project, not an authenticated production deployment. Hibernate `update` is temporary; concurrency controls for stock transactions and production migrations belong in future work.
