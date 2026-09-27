# Phase 1 Supabase seed verification

Completed September 26, 2026 (America/Puerto_Rico). The corrected local JDBC configuration connected successfully to Supabase PostgreSQL. No private credentials or connection strings are recorded here.

## Counts and restart checks

| Stage | Products | Vendors | Duplicate SKU groups | Duplicate demo vendor-name groups |
| --- | ---: | ---: | ---: | ---: |
| Before initialization | 0* | 0* | N/A | N/A |
| First seeded startup | 3 | 2 | 0 | 0 |
| Second seeded startup | 3 | 2 | 0 | 0 |
| Final startup, seeding disabled | 3 | 2 | 0 | 0 |

\* Direct JDBC inspection confirmed that `public.products` and `public.vendors` did not yet exist. The first application startup created these two necessary Phase 1 tables from the existing JPA definitions. Subsequent startups used Hibernate `validate` to avoid further schema changes. No existing Supabase records were deleted, truncated or reset.

The first and second seeded runs had identical record IDs, values, creation timestamps and update timestamps. The second run inserted nothing and updated nothing. The database-level `uk_products_sku` unique constraint was also verified directly.

## Records inserted

The existing repository seed definitions were the sole source of truth:

| SKU | Product | Unit cost | Quantity | Reorder point |
| --- | --- | ---: | ---: | ---: |
| SKU-001 | Safety Gloves | 12.50 | 120 | 20 |
| SKU-002 | Packaging Box | 3.25 | 8 | 10 |
| SKU-003 | Shipping Tape | 4.75 | 0 | 5 |

Vendors: **Caribbean Supply Co.** and **PR Distribution Group**, with blank optional contact fields. All five records are active in the final state.

## Seed implementation

The original whole-table emptiness guards were replaced with checks for each demo record:

- Products match by exact SKU, with the existing database unique constraint.
- Vendors match by case-insensitive, trimmed name, including inactive records.
- Missing demo records are inserted even when unrelated records already exist.
- Existing values are preserved. No general vendor-name uniqueness constraint or other schema migration was introduced.
- A vendor renamed to a different name no longer matches the original demo name. Run only one seeding backend at a time.
- Both the `dev` profile and `SEED_DATA_ENABLED=true` remain required. Seed definitions and code are retained for later use.

## Live API verification

The Spring Boot API on port 8080 returned the same IDs and counts as direct Supabase JDBC reads:

- `GET /api/products`, `GET /api/vendors`, and individual record reads passed.
- Product searches by SKU and name, and vendor searches by name, returned the expected records.
- A temporary product description update and vendor phone update through `PUT` were confirmed directly in Supabase.
- Both records were deactivated through `PATCH`; direct database reads confirmed `active=false`, and the product API returned `INACTIVE`.
- Original field values and active flags were restored through the API afterward. No extra verification rows were created. The verified records' `updated_at` timestamps advanced naturally during these checks.
- Final reads after a normal backend restart confirmed persistence, all expected cost/quantity/reorder values, and zero duplicate groups.

## Automated checks

- Final backend run: **32 passed**, 0 failures/errors/skips, isolated H2 with live `DB_*` variables removed.
- The earlier isolated PostgreSQL test-profile run also passed all **32** executions: 27 catalog API executions on local PostgreSQL and 5 seed/opt-in checks using isolated H2/application contexts.
- Frontend `npm run lint`: passed.
- Frontend `npm run typecheck`: passed.
- Frontend `npm run build`: passed.
- Source and rebuilt browser JavaScript were checked against the private connection values without printing them; no matches were found. `.env` remains ignored by Git.

Automated destructive catalog tests were never pointed at Supabase. Only the explicitly requested, reversible API verification was performed against the hosted data.

## Final configuration

The root `.env` contains `SEED_DATA_ENABLED=false`. The running backend was restarted with seeding disabled and without the `dev` profile. It is connected to Supabase and available on port 8080.

The earlier invalid HTTPS project/API URL was corrected locally before any hosted writes. A temporary libpq audit-output issue was bypassed by using the same PostgreSQL JDBC driver as Spring Boot. No unresolved seed or API errors remain. No Phase 2 functionality was implemented.
