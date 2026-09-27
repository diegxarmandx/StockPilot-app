#!/usr/bin/env bash
set -eo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Explicitly exported settings take precedence over the optional root .env file.
# Keep values in memory; never print credentials or place them in Maven arguments.
overrides=()
for variable in DB_URL DB_USERNAME DB_PASSWORD SERVER_PORT CORS_ALLOWED_ORIGINS SHOW_SQL SPRING_PROFILES_ACTIVE SEED_DATA_ENABLED; do
  if printenv "$variable" >/dev/null; then
    overrides+=("$variable=${!variable}")
  fi
done
if [[ -f "$project_dir/.env" ]]; then
  set -a
  source "$project_dir/.env"
  set +a
fi
for override in "${overrides[@]}"; do
  export "$override"
done

for variable in DB_URL DB_USERNAME DB_PASSWORD; do
  if [[ -z "${!variable}" ]]; then
    printf 'Missing %s. Set it in the environment or the root .env file.\n' "$variable" >&2
    exit 1
  fi
done
cd "$project_dir/backend"
exec ./mvnw spring-boot:run "$@"
