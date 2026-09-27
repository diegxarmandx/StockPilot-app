# Phase 3 verification — receiving and inventory

Verified September 27, 2026 (America/Puerto_Rico). Automated mutation tests used isolated local databases. The live Supabase receipt was a separate, explicitly requested verification performed after the automated checks passed.

## Changes

- Extended the PO workflow with ORDERED → RECEIVED and `receivedAt`. RECEIVED/CANCELLED are terminal; editing remains DRAFT-only.
- Added `InventoryTransaction`, its read-only API/DTO/service, and a transactional full-PO receiving operation.
- Added an Inventory activity page, product history links, receipt confirmation/feedback, received status/date, and backend-aggregated dashboard cards/recent activity.
- Existing product stock is read-only and `quantityOnHand` is rejected by product PUT. Opening stock remains supported on creation. Product edits/deactivation acquire the same row lock used by receiving.
- Added the PostgreSQL Phase 2 status-constraint upgrade and Supabase inventory-table RLS script. No new dependencies or unrelated ERP modules were added.

## Integrity design

The public receiving service method runs under Spring `@Transactional`. It locks the PO with `PESSIMISTIC_WRITE`, verifies ORDERED, locks products in ascending product-ID order, adds quantities with integer-overflow checks, writes one immutable ledger row per line, then marks RECEIVED and sets its timestamp. Item flushes remain within the same transaction; failure rolls back all writes.

The PO lock plus status check prevents repeated and simultaneous receipts. A unique `(reference_type, reference_id, product_id)` constraint independently prevents duplicate receipt rows. Product locks protect receipts on different POs that share products; consistent lock ordering avoids circular waits. Product metadata changes cannot overwrite a concurrent receipt.

Ledger rows expose no write endpoints, are Hibernate `@Immutable`, have non-updatable fields and no public setters, and their repository exposes no delete methods. Database administrators retain direct SQL privileges; this is application-level immutable history, not an audit-security framework. Quantities/balances use integers; all existing monetary values and dashboard valuation retain BigDecimal precision.

## Automated results

| Check | Result |
| --- | --- |
| Java 21 / Maven, default isolated H2 | 72 passed; zero failures/errors/skips |
| Java 21 / Maven, `postgres-test`, disposable native PostgreSQL 14.17 | 72 passed; zero failures/errors/skips |
| New receiving test executions in each run | 18 passed |
| Chrome / Playwright against isolated local PostgreSQL app | 9 passed |
| `npm run lint` | Passed, zero warnings |
| `npm run typecheck` | Passed |
| `npm run build` | Passed |
| `git diff --check` | Passed |
| Private credential and generated-file scan | Passed |

The PostgreSQL profile exercises catalog, PO and receiving integration suites against local PostgreSQL; the existing seed tests deliberately retain their own isolated H2 database. No automated suite used live Supabase. Docker was not used; the disposable native PostgreSQL instance was already available.

### Rollback and concurrency evidence

`ReceivingApiTest` covers:

- Multi-item receipt, exact before/after balances, business-number references, PO status/timestamps and unchanged PO money.
- DRAFT/CANCELLED rejection, missing POs, duplicate receipt rejection, no duplicate stock or ledger entries, and permanent RECEIVED edit/transition restrictions.
- **Deterministic partial-failure rollback:** the lower-ID first product is updated and its ledger insert flushed; the second product starts at `Integer.MAX_VALUE`, so adding one deterministically fails. Both original balances remain, no ledger rows survive, and the PO remains ORDERED with no received timestamp. No manual rollback simulation is used.
- **Database-safeguard rollback:** a conflicting second-product reference forces a unique-constraint failure after the first line flush. Only the pre-existing test fixture remains; neither product changes.
- **Same-PO concurrency:** two gated requests race; one succeeds, one returns 409, and one set of inventory increments/ledger rows remains.
- **Different-PO concurrency:** POs sharing two products in opposite request order both succeed without losing increments; recorded balances form a continuous chain.
- **Product-edit concurrency:** a metadata edit racing with receipt preserves both the edit and the received stock.
- Ledger pagination/filter/history, absent product history, no ledger mutation routes, rejection of product stock injection, database constraints, dashboard aggregates, and the repeatable status-constraint upgrade.

The browser receipt flow creates a product at stock 20, orders 50, receives through the confirmation dialog, verifies RECEIVED, stock 70 and history 20 → 70, checks dashboard activity, and repeats the API receive to verify 409 with no additional stock or ledger rows. All existing catalog and Phase 2 browser tests still pass. Screenshots are generated under ignored `frontend/test-results/`; desktop PO/ledger views were visually inspected.

## Live Supabase result

1. Stopped Spring Boot and applied `backend/src/main/resources/db/phase3-postgresql.sql` to widen the existing status check and add `received_at`, preserving all existing orders.
2. Started Phase 3 through the existing private JDBC environment with seeding off. Hibernate created `inventory_transactions` and its FK/check/unique/index constraints.
3. Enabled RLS on the new ledger table using `supabase-inventory.sql`, matching the existing table protections. No public policies were added.
4. Created **PO-2026-000002** for **50 Safety Gloves (SKU-001)** with an existing vendor; total **$625.00**. The known product started at **120**, rather than the illustrative 20. Marking ORDERED left its stock at 120.
5. Received it through the real React UI. The API returned 200; stock became **170**, the PO became **RECEIVED**, and `received_at` was **2026-09-27T04:38:18.537631Z**.
6. Direct Supabase queries verified the PO and a single ledger row: `PURCHASE_RECEIPT`, quantity 50, before 120, after 170, `PURCHASE_ORDER`, reference **PO-2026-000002**.
7. Repeat receipt returned **409 PURCHASE_ORDER_ALREADY_RECEIVED**. Stock remained 170 and ledger count remained one.
8. Restarted Spring Boot with schema validation and seeding off. PO status/timestamp, product balance and ledger ID persisted. A further repeat receipt still returned 409 without mutation.
9. Verified the live frontend's product table, inventory history and dashboard. Inventory value changed from **$1,526.00 to $2,151.00**; one open PO remains. The dashboard shows the receipt in recent activity. Mobile dashboard width fits the viewport.
10. Confirmed the existing **PO-2026-000001** response was unchanged. No existing records were deleted or reset.

| Records | Before | After |
| --- | ---: | ---: |
| Products | 3 | 3 |
| Vendors | 2 | 2 |
| Purchase orders | 1 | 2 |
| Purchase-order items | 2 | 3 |
| Inventory transactions | 0 | 1 |

The live receipt and resulting 170-unit balance are intentionally retained for review. `SEED_DATA_ENABLED=false` remains in local configuration and the running backend. Credentials were never printed or added to source files. The live application remains on backend port 8080 / frontend port 5173; temporary test servers on 8081/5174 were stopped after verification.

## Issues and limits

- Hibernate `update` does not widen an existing enum check. The documented, tested upgrade script resolved this for both the disposable browser database and live Supabase. Fresh databases receive the expanded schema directly from JPA.
- Product PUT no longer accepts `quantityOnHand`; existing clients must omit it. This prevents manual stock overwrites outside receiving. Initial balances are retained as opening stock, not backfilled into receipt rows.
- No unresolved test failures. No Phase 4 features implemented.
- Deferred: partial or individual-line receipts, manual adjustments, warehouses/transfers, reservations, authentication/RBAC, accounting, taxes, payments and a full audit-event framework. Phase 4 may focus on dashboard/final polish; additional reporting is only a possibility if time permits.
