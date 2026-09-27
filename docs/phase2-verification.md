# Phase 2 verification — purchase orders

Verified September 26, 2026 (America/Puerto_Rico). Automated mutation tests used disposable local databases. The Supabase checks below were a separate, explicitly requested verification against the existing development project.

## Implementation

- Added purchase-order entities, DTOs, repository, transactional service, controller and business errors.
- Added `purchase_orders`, `purchase_order_items` and an independent `purchase_order_number_seq`; no catalog records were deleted or reset.
- Added paginated list/search/status filtering, create/edit forms with paginated catalog selectors, detail view, terminal-status confirmation dialogs and real dashboard PO counts.
- Drafts can be ordered or cancelled. Ordered/cancelled POs cannot be edited or transitioned again. Parent-row locks serialize mutations.
- Prices are immutable item snapshots. Existing lines retain prices during draft edits; new lines copy current catalog prices. Money uses BigDecimal and decimal-string JSON; browser previews use BigInt cents.
- No dependencies were added. No receiving, inventory mutations, authentication or other Phase 3 functionality was implemented.

## Automated checks

| Check | Result |
| --- | --- |
| Java 21 / Maven backend tests, default H2 | 54 passed, 0 failures/errors/skips |
| Java 21 / Maven tests with `postgres-test`, disposable native PostgreSQL 14.17 | 54 passed, 0 failures/errors/skips |
| Purchase-order test executions within each backend run | 22 passed |
| Chrome / Playwright on isolated local backend | 8 passed |
| `npm run lint` | Passed, zero warnings |
| `npm run typecheck` | Passed |
| `npm run build` | Passed |
| `git diff --check` | Passed |
| Source credential/generated-file scan | Passed; private `.env` and build/test outputs remain ignored |

Backend coverage includes draft creation, unique concurrent numbering, snapshot costs, exact line/order totals, active references, positive integer quantities, duplicate products, required fields, unknown/server-owned fields, missing references, draft replacement, orphan cleanup, rollback, ordering timestamp, terminal status rules, pagination/filter/search, concurrent transition conflicts, database constraints and unchanged inventory. The original catalog and seed tests continue to pass. Seed-specific tests retain their separate H2 database even under the PostgreSQL profile.

Browser coverage includes the existing catalog workflows plus PO creation, two product lines, duplicate selection prevention, totals, draft editing, search, order, read-only detail/edit route and cancellation/status filtering. Desktop and mobile screenshots are generated under ignored `frontend/test-results/`. One initial browser run found an ambiguous test selector matching both a Draft filter option and badge; the selector was scoped and the full suite passed afterward.

Docker was not used for these runs; the existing disposable native PostgreSQL instance was available. No automated suite targeted Supabase.

## Live Supabase verification

Spring Boot connected through the existing private JDBC environment. Credentials and connection strings were not printed or added to source control. Hibernate created the Phase 2 tables; the new tables received RLS protection matching the existing catalog tables, with no public policies. The reviewed setup SQL is `backend/src/main/resources/supabase-purchase-orders.sql`.

| Step | Observed result |
| --- | --- |
| Before verification | 3 products, 2 vendors, 0 purchase orders, 0 items |
| Create draft | HTTP 201; `PO-2026-000001`, DRAFT, two persisted lines |
| Initial lines | SKU-001: 2 × $12.50; SKU-003: 3 × $4.75 |
| Initial subtotal / total | $39.25 / $39.25 |
| Edit draft | Changed vendor; quantities became 3 and 4; same item IDs and saved unit prices |
| Edited subtotal / total | $56.50 / $56.50 |
| Order | HTTP 200, ORDERED; `ordered_at` persisted as `2026-09-27T03:47:21.209645Z` |
| Edit ordered PO | HTTP 409, `PURCHASE_ORDER_NOT_EDITABLE` |
| Search/status/vendor filters | Returned the expected order |
| Direct database inspection | Confirmed PO row, both item rows, vendor, quantities, prices, totals, status and ordering timestamp |
| Backend restart | Restarted with schema validation and seeding disabled; the same PO, lines, total and ordered timestamp remained available |
| Final counts | 3 products, 2 vendors, 1 purchase order, 2 items |
| Live frontend after restart | Chrome displayed the Supabase PO as ORDERED, $56.50 and read-only, with no Edit action |
| Inventory | Quantities unchanged |
| Seed configuration | `SEED_DATA_ENABLED=false` in local configuration and live backend |

The ordered verification PO is deliberately retained for review. No purchase orders were seeded automatically. The application remains connected to Supabase on the usual backend port 8080 and frontend port 5173.

## Remaining scope

Phase 3: receiving purchase orders, inventory mutation, inventory transaction ledger, transactional receiving and duplicate receipt protection. Production migrations remain future work; development still uses Hibernate schema updates and the idempotent PO sequence initializer. Authentication, taxes, invoices and payments remain outside this phase.
