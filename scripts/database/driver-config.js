require('dotenv').config();

const fs = require('fs');

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

function resolveDatabaseHost(hostEnvKey, fallback = 'localhost') {
  let host = process.env[hostEnvKey] || fallback;
  const env = String(process.env.ENV || '').toLowerCase();
  if ((env === 'local' || env === 'dev') && !isRunningInDocker()) {
    host = '127.0.0.1';
  }
  return host;
}

function resolveDbDriver() {
  const raw = String(process.env.DB_DRIVER ?? '').trim().toLowerCase();
  if (!raw) {
    throw new Error(
      '[database] DB_DRIVER is required. Set DB_DRIVER=mysql or DB_DRIVER=postgres in .env',
    );
  }
  if (raw !== 'mysql' && raw !== 'postgres') {
    throw new Error(`[database] Invalid DB_DRIVER="${raw}". Must be mysql or postgres.`);
  }
  return raw;
}

function buildDatabaseUrl() {
  const driver = resolveDbDriver();

  if (driver === 'postgres') {
    const user = process.env.POSTGRES_USER;
    const database = process.env.POSTGRES_DB;
    const pass = process.env.POSTGRES_PASSWORD != null ? String(process.env.POSTGRES_PASSWORD) : '';
    const port = Number(process.env.POSTGRES_PORT) || 5432;
    const host = resolveDatabaseHost('POSTGRES_HOST', 'localhost');

    if (!user || !database) {
      throw new Error('[db:generateModels] Missing POSTGRES_USER or POSTGRES_DB.');
    }

    const u = encodeURIComponent(user);
    const p = encodeURIComponent(pass);
    const auth = pass.length > 0 ? `${u}:${p}` : u;
    return { driver, url: `postgres://${auth}@${host}:${port}/${encodeURIComponent(database)}` };
  }

  const user = process.env.MYSQL_USER;
  const database = process.env.MYSQL_DATABASE;
  const pass = process.env.MYSQL_PASS != null ? String(process.env.MYSQL_PASS) : '';
  const port = Number(process.env.MYSQL_PORT) || 3306;
  const host = resolveDatabaseHost('MYSQL_HOST', 'localhost');

  if (!user || !database) {
    throw new Error('[db:generateModels] Missing MYSQL_USER or MYSQL_DATABASE.');
  }

  const u = encodeURIComponent(user);
  const p = encodeURIComponent(pass);
  const auth = pass.length > 0 ? `${u}:${p}` : u;
  return { driver, url: `mysql://${auth}@${host}:${port}/${encodeURIComponent(database)}` };
}

function isDbUuidAutoEnv() {
  const raw = process.env.DB_UUID_AUTO ?? process.env.MYSQL_UUID_AUTO;
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s) {
    return true;
  }
  if (s === '0' || s === 'false' || s === 'no' || s === 'off') {
    return false;
  }
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

module.exports = {
  buildDatabaseUrl,
  isDbUuidAutoEnv,
  resolveDbDriver,
  resolveDatabaseHost,
};
