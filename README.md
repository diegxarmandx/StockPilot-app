# StockPilot

StockPilot is a small ERP-style operations application focused on purchasing and inventory workflows. It is being built as a production-style full-stack project using Java, Spring Boot, React, TypeScript, and PostgreSQL.

This repository implements **Phase 0 (foundation)**, **Phase 1 (products and vendors)**, **Phase 2 (purchase orders)**, and **Phase 3 (receiving and inventory history)**.

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
│       ├── pages/           # Catalogs, forms and purchase orders
│       ├── services/        # Central fetch client and mutations
│       └── types/           # Typed API contracts
├── scripts/dev-backend.sh
├── docker-compose.yml
├── .env.example
└── README.md
```

Controllers handle HTTP, services own business logic and transactions, and repositories persist entities. Search, filtering, stock status, and pagination are canonical on the backend. The frontend calls only Spring Boot; there is no Supabase SDK, Supabase Auth, or direct browser database access. The Java package `com.opscore.erp` remains for import compatibility; Maven coordinates are `com.stockpilot:stockpilot`.

Money uses `BigDecimal` and is returned as a decimal **string**. Unit costs use `numeric(12,2)`; PO line totals, subtotal and total use `numeric(24,2)` to accommodate quantity multiplication. Frontend PO previews use integer cents (`BigInt`).

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
4. For a dedicated StockPilot project, open **Integrations → Data API** and turn **Enable Data API** off before starting Spring Boot. JDBC and Table Editor remain the access paths for this application. Hibernate-created tables do not automatically receive RLS protection through the dashboard table-creation flow. If another application needs the Data API, keep StockPilot tables out of exposed access or enable RLS on `public.products`, `public.vendors`, `public.purchase_orders`, `public.purchase_order_items` and `public.inventory_transactions` before adding data, with no public access policies. After the initial Hibernate startup, run [`supabase-purchase-orders.sql`](backend/src/main/resources/supabase-purchase-orders.sql) in Supabase SQL Editor to protect the PO tables, and [`supabase-inventory.sql`](backend/src/main/resources/supabase-inventory.sql) to protect the inventory ledger before receiving any orders. The existing database-owner JDBC connection continues to work; the script is not automatically applied to non-Supabase databases. Do not grant `anon`/`authenticated` access for StockPilot. See [Supabase's Data API controls](https://supabase.com/docs/guides/api/securing-your-api).
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

**Upgrading an existing Phase 2 PostgreSQL database:** stop the backend and execute [`db/phase3-postgresql.sql`](backend/src/main/resources/db/phase3-postgresql.sql) in Supabase SQL Editor (or `psql` for a local database). This transactional, repeatable script adds `received_at` and widens the existing PO status check to include RECEIVED. Hibernate `update` does not update the old enum check by itself. It preserves existing records. Fresh databases get the new schema directly from Hibernate and do not need this upgrade script.

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

Open **http://localhost:5173** and load Products or Vendors to confirm connectivity. `GET http://localhost:8080/api/health` returns `{"status":"UP"}`; this checks API reachability, not ongoing database readiness. Confirm database access by loading or creating a product/vendor.

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
| `SERVER_PORT` | `8080` | Local backend HTTP port; leave unset on Vercel |
| `PORT` | Unset | Platform HTTP port; set to `8080` in the Vercel backend project |
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
- Backend-aggregated dashboard: product count, open POs, inventory value, low stock and recent inventory activity.
- Purchase-order list, search, status filtering, pagination, create, detail, draft edit, order, cancel and full-receipt flows.
- Transactional inventory increases, immutable receipt history, duplicate prevention and product-level inventory activity links.
- Responsive layout, keyboard-accessible controls, labelled fields, and local fonts.

The frontend displays USD without currency conversion. Opening quantity can be entered only when creating a product. Existing stock is read-only in product forms and cannot be changed through PUT; subsequent increases happen through the receiving service. Inventory valuation uses current product unit costs, not an accounting cost-layer model.

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
| GET | `/api/purchase-orders` | Paginated PO search and filters |
| POST | `/api/purchase-orders` | Create a draft |
| GET | `/api/purchase-orders/{id}` | Fetch a PO with items |
| PUT | `/api/purchase-orders/{id}` | Replace vendor/items of a draft |
| POST | `/api/purchase-orders/{id}/order` | Mark a draft ordered |
| POST | `/api/purchase-orders/{id}/cancel` | Cancel a draft |
| POST | `/api/purchase-orders/{id}/receive` | Receive every item of an ordered PO once |
| GET | `/api/inventory-transactions` | Read-only paginated ledger with filters |
| GET | `/api/products/{productId}/inventory-transactions` | Read-only paginated product history |
| GET | `/api/dashboard` | Backend aggregates and five latest ledger entries |

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

`PUT` replaces all editable fields: product updates require SKU, name, unit cost, reorder point and active; `quantityOnHand` is rejected on PUT; vendor updates require name and active. Omitted optional text fields are cleared. Send `active: true` when editing to reactivate a record.

Product responses add `id`, `createdAt`, `updatedAt` and canonical `stockStatus` (`IN_STOCK`, `LOW_STOCK`, `OUT_OF_STOCK`, `INACTIVE`). Vendor responses add ID and timestamps. Responses never expose JPA entities.

### Purchase orders

```json
{
  "vendorId": 1,
  "items": [
    { "productId": 1, "quantity": 10 },
    { "productId": 3, "quantity": 5 }
  ]
}
```

Send this shape to POST or PUT; substitute existing active record IDs. Requests cannot supply prices, totals, PO numbers, status or timestamps. Vendor/products must exist and be active. Orders require 1–100 items with positive integer quantities (maximum 2,147,483,647). Duplicate product IDs are rejected with `400 DUPLICATE_PRODUCT`.

- Workflow: **DRAFT → ORDERED → RECEIVED**, or **DRAFT → CANCELLED**. Only drafts can be edited. RECEIVED and CANCELLED are terminal; ORDERED permits only receiving. Repeated or invalid transitions and non-draft edits return **409**. Ordering sets `orderedAt` without changing stock. Receiving sets `receivedAt` and updates stock atomically.
- The service copies each new item's current product price. **Existing item prices remain unchanged**, including when quantities or the vendor are edited. New products added to a draft use their current catalog cost. Removing a line, saving, and later adding it again creates a new price snapshot. Product names/SKUs and vendor details are live references; prices are snapshots.
- `lineTotal = quantity × saved unitCost`; `subtotal = sum(lineTotal)`; `total = subtotal`. All calculations use `BigDecimal`, without tax or floating-point arithmetic. The browser preview is advisory; the server confirms saved totals.
- An independent database sequence generates numbers such as `PO-2026-000001`. The year is UTC; the sequence is global and does not reset annually. Rollbacks may leave gaps. The number is immutable and unrelated to the row ID. `schema.sql` creates the sequence idempotently during startup; it is never reset on restart.
- PO creation and mutations are transactional. Update/order/cancel acquire the same parent-row write lock so competing status changes cannot both succeed. Item removal uses orphan deletion within a draft; there is no purchase-order DELETE endpoint.
- List parameters: `search` matches PO number or vendor name (literal, case-insensitive); `status=DRAFT|ORDERED|CANCELLED|RECEIVED`; `vendorId`; `page`; `size`. Pagination bounds match the catalog. Example: `/api/purchase-orders?status=DRAFT&vendorId=1&search=PO-2026&page=0&size=20`.
- Lists return summaries with `itemCount`, vendor summary, totals and timestamps. Detail/mutation responses include item IDs, product IDs, SKU/name, quantity, saved unit cost and line total. All responses are DTOs.
- Missing references return 404; inactive records and duplicate products return 400; invalid quantities return 400 `VALIDATION_ERROR` with paths such as `items[0].quantity`.

The relational model adds `purchase_orders` (vendor FK, unique PO number, status, totals, timestamps), `purchase_order_items` (PO/product FKs, quantity, saved unit cost, line total), and `purchase_order_number_seq`. Indexes cover vendor/status and item product lookups. A unique `(purchase_order_id, product_id)` constraint prevents duplicate lines; checks enforce positive quantities and consistent line/PO totals. The item uniqueness index also supports parent lookups. Hibernate `update` remains the development schema mechanism; versioned production migrations are deferred.

React routes: `/purchase-orders`, `/purchase-orders/new`, `/purchase-orders/:id`, `/purchase-orders/:id/edit`. Vendor/product selectors search and paginate active records on the backend. Confirmation dialogs explain ordering, cancellation and the irreversible inventory increase on receipt.

### Receiving and inventory history

```text
DRAFT ──→ ORDERED ──→ RECEIVED
  └─────→ CANCELLED
```

`POST /api/purchase-orders/{id}/receive` takes no request body and returns the updated PO DTO. Only ORDERED is receivable. DRAFT/CANCELLED return `409 PURCHASE_ORDER_NOT_RECEIVABLE`; a second receipt returns `409 PURCHASE_ORDER_ALREADY_RECEIVED`; missing POs return 404. A stock balance beyond the supported integer maximum returns `409 INVENTORY_UPDATE_FAILED`. Inactive product/vendor records do not prevent receiving an already-ordered commitment. Receipt never changes product costs or the saved PO item prices.

The public service method uses **`@Transactional`** around the complete receipt: lock the PO, load its lines, lock products, read balances, increment quantities, insert one ledger entry per line, and mark the PO RECEIVED with `receivedAt`. A failed item, constraint or final save rolls back **every balance, ledger row and PO change**, including statements already flushed to the database. Flushing an item is not committing it.

Duplicate protection has two layers:

1. A **pessimistic write lock on the PO row** serializes competing receipts. A waiting request sees RECEIVED after the first commits and returns 409.
2. A database unique constraint on **`(reference_type, reference_id, product_id)`** rejects a second receipt entry for the same PO/product even if application logic regresses. Full receiving and no duplicate PO product lines make this one-entry rule appropriate for this phase.

**Product rows are also write-locked in ascending ID order.** This prevents lost balance increments when different POs contain the same products, and consistent lock ordering avoids circular waits. Product metadata edits/deactivation use the same product lock so an ordinary edit cannot overwrite concurrent receiving. These are ordinary database row locks, following [PostgreSQL's locking guidance](https://www.postgresql.org/docs/current/explicit-locking.html); no distributed lock is involved.

`InventoryTransaction` stores product FK, type `PURCHASE_RECEIPT`, positive quantity, balance before/after, reference type `PURCHASE_ORDER`, the **PO business number** as `referenceId`, and creation time. Checks enforce nonnegative balances and `balanceAfter - balanceBefore = quantity`. Indexes support product history, newest-first activity and reference lookup. Entities expose getters, use Hibernate `@Immutable` and non-updatable columns; the application has no ledger update/delete methods or HTTP write endpoints. Database owners still retain administrative SQL access; this is application-level immutable history, not a tamper-proof audit system.

For stock 20 and an ordered quantity of 50:

```text
Product.quantityOnHand: 20 → 70
Ledger: PURCHASE_RECEIPT, +50, before 20, after 70, reference PO-2026-000001
```

**Why store both balance and history?** `Product.quantityOnHand` makes current-stock reads efficient. `InventoryTransaction` retains how a balance changed, supporting debugging, traceability and operational auditing. Opening stock (including existing Phase 1/2 balances) is the baseline; it is not backfilled into receipt history. Later changes use the receiving workflow.

Ledger API examples:

```text
GET /api/inventory-transactions?productId=1&type=PURCHASE_RECEIPT&referenceId=PO-2026-000001&page=0&size=20
GET /api/products/1/inventory-transactions?page=0&size=20
```

General filters are optional; `referenceId` is an exact, trimmed, case-sensitive PO number. Both routes use the usual page metadata and bounds, newest creation time then ID first. The product route returns 404 for a missing product. `/inventory` supports reference filtering, pagination and product-scoped history; the SKU links and Products table history actions select a product.

`GET /api/dashboard` calculates all four cards in one database aggregate statement: all products, DRAFT + ORDERED POs, `sum(quantityOnHand × current unitCost)` for all products including inactive ones, and active products at/below reorder point (including zero stock). Inventory value is a BigDecimal decimal string. The response also includes five recent ledger entries. React does not download the catalog to calculate these values. After receiving, PO detail refreshes; navigating to Products, Inventory or Dashboard fetches current backend data.

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

The default test profile overrides the main datasource with H2; no `DB_*` variables or live Supabase access are required. Coverage includes product/vendor lifecycle, validation, exact monetary values, concurrent duplicate SKU handling, database constraints, stock status, search, pagination, CORS and no DELETE routes. Additional tests verify that seeding requires explicit opt-in and that repeated runs preserve edits without duplicates. Purchase-order tests cover exact totals, saved prices across edits, atomic rollback, validation, database constraints, pagination/search/filters, unique concurrent numbering, allowed/forbidden transitions, concurrent transition conflicts, and unchanged inventory before receipt. Receiving tests cover multi-item balances and references, repeat receipts, terminal states, deterministic partial-failure rollback, same/different-PO concurrency, concurrent product edits, ledger constraints/filtering, dashboard aggregates and the repeatable Phase 2 constraint upgrade.

### Backend: isolated PostgreSQL

Use only a **dedicated disposable local test database**; this profile creates/drops tables and the tests clear purchase-order and catalog data. Main `DB_*` settings are never used by this profile.

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

The same profile can target an isolated native local PostgreSQL instance. Seed integration tests always use their own H2 database, even when the catalog and purchase-order suites use PostgreSQL.

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

Coverage includes branding/title, real product/vendor forms, duplicate feedback, server pagination, filters, page-reload persistence, mobile layout, health, loading/empty/error/retry states, and the PO create/edit/search/order/read-only and cancellation workflows. The receiving flow checks 20 → 70 stock, receipt confirmation, RECEIVED state, ledger balances/reference, dashboard activity and rejection of a second receipt. Catalog lifecycle fixtures are retained as inactive; PO fixtures and their supplier/product references remain in the disposable database. The first smoke test expects a nonempty catalog.

### Manual Supabase verification

After configuring your private `DB_*` values and starting Spring Boot and React:

1. Open StockPilot and confirm API connectivity.
2. Create a product. In Supabase **Table Editor**, select schema `public`, open `products`, and refresh to find its SKU.
3. Create a vendor; refresh `public.vendors` and find its name.
4. Edit the product; refresh Table Editor and confirm the changed values and `updated_at`.
5. Stop/restart Spring Boot with the same database environment, leaving seeding off. Confirm both records persist.
6. Search by product SKU/name and vendor name/email.
7. Deactivate each record; verify `active=false` in Table Editor and the inactive status in StockPilot.

Hibernate creates the `products`, `vendors`, `purchase_orders`, `purchase_order_items` and `inventory_transactions` tables on successful startup; the SQL initializer creates the independent PO number sequence. No manual table definitions, API keys, Supabase Auth, or JavaScript SDK are needed. If startup fails, check the selected endpoint/username, password, SSL parameters, network reachability and any project database network restrictions. The health endpoint alone is not a database verification.

See [the verification report](docs/verification.md) for checks actually run and remaining machine-specific checks. The completed live Supabase seed and restart checks are recorded in [the seed verification report](docs/seed-verification.md).

### Manual purchase-order verification

1. Create a draft using existing active vendors/products; inspect `public.purchase_orders` and `public.purchase_order_items` in Table Editor.
2. Compare each saved cost with the product price at creation; verify quantity × cost, subtotal and total.
3. Edit quantities/vendor in the draft; confirm the database rows and totals update while existing line prices stay fixed.
4. Mark ordered; confirm `status=ORDERED` and `ordered_at` are persisted.
5. Attempt PUT on the ordered PO and confirm HTTP 409. The UI should show read-only and no Edit action.
6. Restart Spring Boot with the same credentials and `SEED_DATA_ENABLED=false`; reopen the PO and confirm it persists. Inventory quantities must remain unchanged.

See [Phase 2 verification](docs/phase2-verification.md) for actual isolated test results and the separate live Supabase checks.

### Manual receiving verification

After the isolated automated suites pass:

1. Note a known product's stock; create a new PO for a known quantity and mark it ORDERED. Stock must still be unchanged.
2. Receive the PO from its detail page. Confirm stock increased by exactly the ordered quantity.
3. Inspect `public.inventory_transactions`: PURCHASE_RECEIPT, correct before/after balances, quantity and PO business-number reference. Confirm PO status RECEIVED and populated `received_at`.
4. Repeat POST receive: expect 409, unchanged stock, and no extra ledger row.
5. Restart Spring Boot with the same credentials and seeding off. Verify the balance, receipt history and RECEIVED PO persist.
6. Keep unrelated existing data intact. This manual verification intentionally creates a real receipt; do not run automated mutation suites against Supabase.

See [Phase 3 verification](docs/phase3-verification.md) for actual test and live-database results.

## User interface

The interface uses a shared dark slate/blue palette, locally bundled DM Sans typography, consistent status badges, compact tables, and accessible forms. Desktop navigation becomes a keyboard-accessible drawer on smaller screens. Tables scroll within their own labelled regions; forms stack on mobile.

Key screens for a portfolio walkthrough:

- **Dashboard:** real inventory value, product/open-order/low-stock counts, recent orders and receiving activity.
- **Products:** paginated catalog, stock status, search, filters and grouped create/edit forms. Opening stock defaults to zero; subsequent product edits keep stock read-only.
- **Purchase Orders:** draft editor with an order summary, state-specific detail actions and receipt confirmation.
- **Inventory:** receipt quantities, before/after balances and purchase-order references.

Screenshots are intentionally not committed. To add them, capture these four screens from a clean, approved dataset at a consistent desktop viewport (1440 × 1000 is suitable), review for private business information, then save selected images under `docs/screenshots/` and link them here. Playwright generates review screenshots in ignored `frontend/test-results/`; those include disposable test fixtures and are not portfolio assets. Its UI checks also cover 320, 390, 768, 1024, 1440 and 1920px widths, keyboard drawer navigation, loading/error/empty states and long content.

See [Phase 4 verification](docs/phase4-verification.md) for executed checks, visual findings and intentional scope limits.

## Vercel deployment

The frontend and backend are prepared as separate Vercel projects. See [deployment settings and verification](docs/vercel-deployment.md) for the Java 21 container, production profile, environment variables, SPA routing, CORS and deployment order. Nothing is deployed automatically by these files.

## Current limits

Partial receipts, individual-line receiving, warehouses/transfers, reservations, manual stock adjustments, sales orders, auth/RBAC, invoices/payments, tax, three-way matching, notifications and a full audit-event framework are outside this phase.

Authentication / Spring Security, warehouse transfers, invoices, payments, AWS deployment, and production migrations are intentionally outside this scope. The application is a local development portfolio project, not an authenticated production deployment. Hibernate `update` is temporary; production migration tooling belongs in future work; receiving already has transactional and concurrency controls.
