#!/bin/sh
set -eu

psql -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
SQL

found=false
for migration in /migrations/*.sql; do
  if [ ! -f "$migration" ]; then
    continue
  fi

  found=true
  version="$(basename "$migration")"
  applied="$(psql -v ON_ERROR_STOP=1 -Atq -v version="$version" <<'SQL'
SELECT 1 FROM schema_migrations WHERE version = :'version';
SQL
)"

  if [ "$applied" = "1" ]; then
    echo "Skipping $version (already applied)"
    continue
  fi

  echo "Applying $version"
  psql -v ON_ERROR_STOP=1 -f "$migration"
  psql -v ON_ERROR_STOP=1 -v version="$version" <<'SQL'
INSERT INTO schema_migrations (version) VALUES (:'version');
SQL
done

if [ "$found" = false ]; then
  echo "No migration files found in /migrations" >&2
  exit 1
fi

echo "Database migrations are up to date."
