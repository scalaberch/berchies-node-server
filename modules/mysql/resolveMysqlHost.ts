import fs from 'fs';

/**
 * True when the Node process runs inside a Docker container (Linux cgroup heuristic).
 */
export function isRunningInDocker(): boolean {
  try {
    const cgroup = fs.readFileSync('/proc/1/cgroup', 'utf8');
    return /docker|kubepods/i.test(cgroup);
  } catch {
    return false;
  }
}

/**
 * Resolves MySQL host the same way as `server/scripts/mysql/run-generate-models.js`.
 *
 * `.env` often sets `MYSQL_HOST=crown-mysql` for the Compose network. On the host machine
 * that hostname does not resolve; for `ENV=local` or `ENV=dev` we use `127.0.0.1` when not
 * running inside Docker so tools (`npm run seed`, the API, etc.) connect via published port.
 */
export function resolveMysqlHost(): string {
  let host = process.env.MYSQL_HOST || 'localhost';
  const env = String(process.env.ENV || '').toLowerCase();
  if ((env === 'local' || env === 'dev') && !isRunningInDocker()) {
    host = '127.0.0.1';
  }
  return host;
}
