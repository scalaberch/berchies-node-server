#!/usr/bin/env node
/**
 * Orchestrates: kysely-codegen → clean-generated → per-table DbTable classes.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { buildDatabaseUrl } = require('./driver-config');

const root = path.resolve(__dirname, '../../..');
const definesRel = 'src/database/schema.defines.ts';
const definesPath = path.join(root, definesRel);

function main() {
  const { driver, url: databaseUrl } = buildDatabaseUrl();

  if (fs.existsSync(definesPath)) {
    fs.unlinkSync(definesPath);
  }

  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  execFileSync(
    npx,
    [
      'kysely-codegen',
      `--url=${databaseUrl}`,
      `--dialect=${driver}`,
      `--out-file=${definesRel}`,
      '--singularize',
      '--log-level=silent',
    ],
    { stdio: 'inherit', cwd: root, env: process.env },
  );

  require('./clean-generated.js');

  fs.mkdirSync(path.join(root, 'src/database/tables'), { recursive: true });

  execFileSync(process.execPath, [path.join(__dirname, 'tables.js')], {
    stdio: 'inherit',
    cwd: root,
    env: process.env,
  });

  console.log('[db:generateModels] Done:', definesRel, '+ src/database/tables/*Table.ts');
}

main();
