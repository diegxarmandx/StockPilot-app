# Deploy StockPilot as two Vercel projects

Prepared September 27, 2026. Nothing has been deployed by this change.

```text
stockpilot (frontend/, Vite) → stockpilot-api (backend/, Java 21 container) → Supabase PostgreSQL
```

Vercel now supports HTTP containers via `Dockerfile.vercel`; it detects this filename in the project root, builds the image and routes requests to it. This uses Container Images on Fluid compute, not a community Java function runtime or a Maven command masquerading as a static build. Container Images are currently beta. See [Vercel Container Images](https://vercel.com/docs/functions/container-images) and [the Dockerfile announcement](https://vercel.com/blog/dockerfile-on-vercel).

## Exact project settings

Import `diegxarmandx/StockPilot-app` twice. The names below are project names; the exact `.vercel.app` domains depend on availability. Leave files outside each root excluded.

| Setting | Frontend | Backend |
| --- | --- | --- |
| Project name | `stockpilot` | `stockpilot-api` |
| Root directory | `frontend` | `backend` |
| Production branch | `main` | `main` |
| Framework | Vite | Container auto-detection from `Dockerfile.vercel`; use Other if the import UI asks for a framework |
| Install command | `npm ci` | No override; Dockerfile handles the build |
| Build command | `npm run build` | No override; Dockerfile runs Maven wrapper |
| Output directory | `dist` | No static output override |
| Node.js | 22.x | Not applicable; Java 21 is in the image |
| Runtime port | Not applicable | Set `PORT=8080` in project environment variables |

Do not select Services or create a combined root-level service configuration: these are two independent projects. Do not add `@vercel/java`, legacy `builds` entries, an npm backend start script, or a static JAR output directory. The Dockerfile is the backend build/start definition.

`backend/Dockerfile.vercel` uses a Java 21 JDK build stage and a Java 21 JRE runtime, runs as a non-root user, and copies only the packaged application into the runtime image. Builds skip execution of database tests; run the documented test suites before deploying. `.dockerignore` allowlists source/build inputs and excludes credentials, test sources and local output. `PORT` is read by Spring; without it, local `SERVER_PORT` or 8080 applies. Do not set `SERVER_PORT` on Vercel, since Spring environment binding can override the YAML port property.

Vercel's container default port is 80. Explicitly setting **PORT=8080** aligns the platform and the non-root Java process. `EXPOSE` alone does not configure Vercel's routing.

## Enter backend environment variables manually

Set these in **stockpilot-api → Settings → Environment Variables → Production**. Obtain database values from the Supabase Connect dialog; do not upload or copy the local `.env` file.

| Variable | Value |
| --- | --- |
| `DB_URL` | PostgreSQL **JDBC** URL for your Supabase endpoint with SSL options; no username/password embedded |
| `DB_USERNAME` | Supabase database/pooler username for that endpoint |
| `DB_PASSWORD` | Database password; backend only |
| `CORS_ALLOWED_ORIGINS` | Exact frontend HTTPS origin, e.g. `https://stockpilot.vercel.app`; no trailing slash |
| `PORT` | `8080` |
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `SEED_DATA_ENABLED` | `false` |
| `SHOW_SQL` | `false` |
| `DB_POOL_MAX_SIZE` | Optional; production default `5` connections per instance |

Credentials are required environment placeholders without fallback credentials. The image has safe profile/seed/logging defaults, but set them explicitly in the project as well. Do not activate `dev`, override `APP_SEED_ENABLED`, set destructive Hibernate overrides, or enable SQL initialization in production.

The `prod` profile uses `ddl-auto=validate` and `spring.sql.init.mode=never`: startup neither creates tables nor runs `schema.sql`. It expects the existing Phase 3 schema, constraints and `purchase_order_number_seq`. If validation fails, inspect the mismatch and apply a reviewed migration separately; do not switch production to `create`, `create-drop` or `update` to bypass the failure. No schema changes are included in this deployment preparation.

For autoscaling instances, Supabase transaction pooling can limit database connection pressure; JDBC must include `prepareThreshold=0` when using transaction pooling. Use the exact host, port and matching username from Connect. A JDBC shape (placeholders only) is `jdbc:postgresql://<pooler-host>:<port>/postgres?sslmode=require&prepareThreshold=0`. Session pooling also works with a suitable connection budget. SSL `require` encrypts transport; certificate verification needs `verify-full` and the appropriate certificate setup. See [Supabase connection guidance](https://supabase.com/docs/guides/database/connecting-to-postgres). RLS, provider and client libraries remain unchanged.

## Frontend environment variable

Set only `VITE_API_BASE_URL` to the backend's final HTTPS **origin**, e.g. `https://stockpilot-api.vercel.app`, without `/api`. It is public build-time configuration. Database variables never belong in this project or any `VITE_` variable.

The Vercel build rejects missing, non-HTTPS or localhost API origins. Local Vite development retains its localhost fallback. Rebuild/redeploy the frontend whenever the API origin changes.

`frontend/vercel.json` uses Vercel's documented [Vite SPA rewrite](https://vercel.com/docs/frameworks/frontend/vite#using-vite-to-make-spas). Existing assets are served normally; unmatched client routes fall back to `index.html`. Deep links do not need individual rules.

## Deployment order and CORS

1. Review and commit/push these deployment files when ready. This preparation has not pushed them, created projects or deployed anything.
2. Reserve/create the frontend project to learn its final domain, or use the intended domain initially in backend CORS. Creating/importing through the dashboard may start a deployment; add its required environment variable before a successful build.
3. Configure and deploy **stockpilot-api first**, with its Production variables. Confirm health and a paginated read.
4. Set the actual backend origin as frontend `VITE_API_BASE_URL`, then deploy **stockpilot**.
5. Set backend `CORS_ALLOWED_ORIGINS` to the final frontend origin and redeploy the backend if that origin differs. Multiple explicitly approved origins are comma-separated. Local defaults remain available when running without the production profile.
6. Verify from the final frontend domain. Changing environment settings alone does not update an existing deployment.

Preview deployments should use a separate disposable database/backend and explicit frontend preview origins. Avoid pointing mutation tests at production or allowing all `*.vercel.app` origins. Deployment Protection on the API can block browser requests/preflight from the separate frontend project; verify the chosen protection settings support that cross-origin use. No bypass secret may go into the frontend bundle.

## Production verification

Replace these example domains with the actual assigned domains:

```bash
curl --fail https://stockpilot-api.vercel.app/api/health
curl --fail 'https://stockpilot-api.vercel.app/api/products?page=0&size=1'
curl --fail 'https://stockpilot-api.vercel.app/api/vendors?page=0&size=1'
curl -i -X OPTIONS https://stockpilot-api.vercel.app/api/products \
  -H 'Origin: https://stockpilot.vercel.app' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type'
```

Expect `{"status":"UP"}`, catalog JSON and the exact frontend `Access-Control-Allow-Origin`. Health is a simple reachability endpoint, not a continuous database readiness check; the catalog reads confirm persistence access.

Open and hard-refresh `/products`, `/vendors`, `/purchase-orders` and `/inventory`. Confirm Network requests go to the HTTPS backend and static JS/CSS/fonts return their correct content types, not HTML. Check startup logs for the prod profile, successful schema validation and no seeding. Confirm row counts are unchanged across a backend restart before intentionally making any business mutations. Keep the existing UI free of health/debug indicators.

## Limits and remaining manual checks

- Container Images are beta; Vercel Function resource/time limits and cold starts apply. Measure Java startup and database connection use after deployment; each scaled instance has its own pool. Containers do not provide durable local application state.
- Secure Compute/static IP support is currently unavailable for these containers; verify Supabase network restrictions permit the chosen deployment path.
- The app still has no authentication. A public API permits public writes; CORS is not access control. Use only intended portfolio data or an appropriate access-controlled environment. This change does not add authentication.
- Docker is unavailable on the preparation machine, so the Docker image itself must still be built/verified on Vercel or a Docker-enabled machine. No remote deployment or assigned domain has been verified.

Optional local image verification from the repository root, with Docker installed:

```bash
docker build -f backend/Dockerfile.vercel -t stockpilot-api backend
# Provide production-shaped variables for a separate test database, never a committed secret file:
docker run --rm -p 8080:8080 \
  -e PORT=8080 -e DB_URL -e DB_USERNAME -e DB_PASSWORD \
  -e CORS_ALLOWED_ORIGINS stockpilot-api
```

## Verification performed

- Backend H2: **74 passed**, no failures/errors/skips.
- PostgreSQL profile: **74 passed**, no failures/errors/skips, using native disposable local PostgreSQL (seed-specific tests remain isolated H2).
- Java 21 executable JAR: Maven package passed. Started the JAR with `prod` and `PORT=8081` against the existing disposable schema; startup validation and health passed.
- CORS preflight: configured origin returned 200; unlisted origin returned 403.
- Frontend lint, TypeScript and production build: passed. Build used `VERCEL=1` and an illustrative public HTTPS API origin, not local database credentials.
- Missing API origin and localhost-origin Vercel builds: correctly rejected. Built JS contained no localhost API fallback.
- Playwright: **12 passed**, final run 20.5 seconds, against the production-profile JAR and disposable database.
- Built frontend local preview: all four deep links rendered, JS/CSS assets returned non-HTML content types. A browser-only request override directed the illustrative API origin to the local test backend. This tests the build, not Vercel's remote routing infrastructure.
- No live Supabase connection, schema mutation, seed run, project creation, Git push or deployment occurred. Local credentials were not copied into deployment files.

Docker image build and actual Vercel SPA routing still require verification on the target platform. Production deployment checks above remain manual because automatic deployment was explicitly excluded.
