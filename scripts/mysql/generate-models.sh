#!/bin/bash
set -e

# move to directory
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd $SCRIPT_DIR/../../..

# load environment file
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

# check if there are mysql settings enabled in the env file
required_vars=("MYSQL_HOST" "MYSQL_USER" "MYSQL_DATABASE")
missing=0

for var in "${required_vars[@]}"; do
  if [[ -z "${!var}" ]]; then
    echo "Missing or empty: $var"
    missing=1
  fi
done

if [[ $missing -ne 0 ]]; then
  echo "Mysql configuration is not set properly. Please check your env file."
  exit 1;
fi

# generate the creds and the db url
credentials="$MYSQL_USER"
if [[ -n "$MYSQL_PASS" ]]; then
  credentials="$MYSQL_USER:$MYSQL_PASS"
fi
DB_HOST="$MYSQL_HOST"
if [[ "$ENV" == "dev" ]]; then 
  if ! grep -qE '/docker/|/kubepods/' /proc/1/cgroup 2>/dev/null; then
    DB_HOST="127.0.0.1"
  fi
fi
DATABASE_URL="mysql://${credentials}@${DB_HOST}/${MYSQL_DATABASE}"

# check if there is a config file for kysely and if not exists, create it!
if [[ -f "src/database/mysql.defines.ts" ]]; then
  rm src/database/mysql.defines.ts
fi

# generate the db definition
npx kysely-codegen --url="$DATABASE_URL" --dialect="mysql" --out-file="./src/database/mysql.defines.ts" --singularize --log-level="silent"
node ./server/scripts/mysql/clean-generated.js

# create the table folders if it doesn't exist.
mkdir -p ./src/database/tables

# run the table generator
node ./server/scripts/mysql/tables.js