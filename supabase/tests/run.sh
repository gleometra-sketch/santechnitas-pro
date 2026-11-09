#!/usr/bin/env bash
# Paleidžia migracijas ir RLS testus vietinėje PostgreSQL (15+). Naudojimas: ./supabase/tests/run.sh [duomenų_bazės_vardas]
# Reikia psql ir teisių kurti duomenų bazę bei vaidmenis (pvz. postgres superuser).
set -euo pipefail
DB="${1:-santechnitas_test}"
DIR="$(cd "$(dirname "$0")/.." && pwd)"
psql -q -d postgres -c "drop database if exists $DB" -c "create database $DB"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -c "do \$\$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end \$\$;"
sed '/^create role/d' "$DIR/tests/supabase_stub.sql" | psql -q -v ON_ERROR_STOP=1 -d "$DB"
for f in "$DIR"/migrations/*.sql; do echo "migracija: $(basename "$f")"; psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f"; done
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/tests/rls_test.sql" 2>&1 | grep -E "PASS|FAIL|VISI|ERROR"
