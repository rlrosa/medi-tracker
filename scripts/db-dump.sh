#!/bin/bash
# Load .env
if [ -f .env ]; then
  # Use grep to find DATABASE_URL and sed to extract the value correctly
  DB_URL=$(grep ^DATABASE_URL .env | cut -d '"' -f 2)
  if [ -z "$DB_URL" ]; then
    DB_URL=$(grep ^DATABASE_URL .env | cut -d '=' -f 2-)
  fi
  export DATABASE_URL="$DB_URL"
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL not found in .env"
  exit 1
fi

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="db_dump_${TIMESTAMP}.sql"

echo "🚀 Dumping database to ${FILENAME}..."
# Using the full path to pg_dump to avoid any path issues
/usr/bin/pg_dump "$DATABASE_URL" > "$FILENAME"

if [ $? -eq 0 ]; then
  echo "✅ Success! Dump saved to ${FILENAME}"
else
  echo "❌ Error: pg_dump failed"
  # Check if it was a connection error
  exit 1
fi
