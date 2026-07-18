#!/bin/bash
set -e

PGDATA="${PGDATA:-/var/lib/postgresql/data}"
PG_BIN="/usr/lib/postgresql/15/bin"

mkdir -p "$PGDATA"
chown -R postgres:postgres "$PGDATA"

if [ ! -f "$PGDATA/PG_VERSION" ]; then
  echo "Initializing PostgreSQL data directory..."
  su postgres -c "$PG_BIN/initdb -D $PGDATA"
  {
    echo "local all all trust"
    echo "host all all 127.0.0.1/32 trust"
    echo "host all all ::1/128 trust"
  } >> "$PGDATA/pg_hba.conf"
fi

# Remove stale postmaster PID from unclean shutdowns so PostgreSQL can start
rm -f "$PGDATA/postmaster.pid"

echo "Starting PostgreSQL..."
su postgres -c "$PG_BIN/pg_ctl -D $PGDATA -l /tmp/postgresql.log start"

for _ in $(seq 1 30); do
  if su postgres -c "$PG_BIN/pg_isready -q"; then
    break
  fi
  sleep 1
done

if ! su postgres -c "psql -tc \"SELECT 1 FROM pg_database WHERE datname = 'fingermile'\"" | grep -q 1; then
  su postgres -c "createdb fingermile"
fi

export DATABASE_URL="${DATABASE_URL:-postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/fingermile}"

echo "Starting FastAPI on port 8000..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
