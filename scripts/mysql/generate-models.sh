#!/usr/bin/env bash
# Deprecated: use `npm run mysql:generateModels` (runs run-generate-models.js).
set -e
cd "$(dirname "$0")/../../.."
exec node ./server/scripts/mysql/run-generate-models.js
