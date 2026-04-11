import fs from 'fs';

/**
 * True when the Node process runs inside a Docker container.
 *
 * - `/.dockerenv` is created by Docker in Linux containers (reliable on Docker Desktop too).
 * - Legacy cgroup v1 often contained "docker" in `/proc/1/cgroup`; cgroup v2 often does not,
 *   so relying on cgroups alone falsely treats containers as "on the host" and breaks
 *   MYSQL_HOST (e.g. `crown-mysql`) by forcing `127.0.0.1`.
 */
export function isRunningInDocker(): boolean {
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
    // cgroup v2 short form (e.g. `0::/`) — still inside a container if .dockerenv was missing
    const selfCgroup = fs.readFileSync('/proc/self/cgroup', 'utf8');
    return selfCgroup.split('\n').some((line) => /docker|kubepods|containerd/i.test(line));
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
