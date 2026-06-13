#!/usr/bin/env node
/**
 * Orchestrates: kysely-codegen → clean-generated → per-table MysqlTable classes.
 * Replaces generate-models.sh for consistent dotenv, URL building, and Windows-friendly runs.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '../../..');
const definesRel = 'src/database/mysql.defines.ts';
const definesPath = path.join(root, definesRel);

function isRunningInDocker() {
  if (process.env.RUNNING_IN_DOCKER === '1') {
    return true;
  }
  try {
    if (fs.existsSync('/.dockerenv')) {
      return true;
    }
    const cgroup = fs.readFileSync('/proc/1/cgroup', 'utf8');
    if (/docker|kubepods/i.test(cgroup)) {
      return true;
    }
    const selfCgroup = fs.readFileSync('/proc/self/cgroup', 'utf8');
    return selfCgroup.split('\n').some((line) => /docker|kubepods|containerd/i.test(line));
  } catch {
    return false;
  }
}

function resolveMysqlHost() {
  let host = process.env.MYSQL_HOST || 'localhost';
  const env = String(process.env.ENV || '').toLowerCase();
  if ((env === 'local' || env === 'dev') && !isRunningInDocker()) {
    host = '127.0.0.1';
  }
  return host;
}

function buildDatabaseUrl() {
  const user = process.env.MYSQL_USER;
  const database = process.env.MYSQL_DATABASE;
  const pass = process.env.MYSQL_PASS != null ? String(process.env.MYSQL_PASS) : '';
  const port = Number(process.env.MYSQL_PORT) || 3306;
  const host = resolveMysqlHost();

  if (!user || !database) {
    console.error(
      '[mysql:generateModels] Missing MYSQL_USER or MYSQL_DATABASE. Set them in .env (see server/scripts/mysql/run-generate-models.js).',
    );
    process.exit(1);
  }

  const u = encodeURIComponent(user);
  const p = encodeURIComponent(pass);
  const auth = pass.length > 0 ? `${u}:${p}` : u;
  return `mysql://${auth}@${host}:${port}/${encodeURIComponent(database)}`;
}

function main() {
  const databaseUrl = buildDatabaseUrl();

  if (fs.existsSync(definesPath)) {
    fs.unlinkSync(definesPath);
  }

  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  execFileSync(
    npx,
    [
      'kysely-codegen',
      `--url=${databaseUrl}`,
      '--dialect=mysql',
      `--out-file=${definesPath}`,
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

  console.log('[mysql:generateModels] Done:', definesRel, '+ src/database/tables/*Table.ts');
}

main();
