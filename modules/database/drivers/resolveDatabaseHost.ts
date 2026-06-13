import fs from 'fs';

/**
 * True when the Node process runs inside a Docker container.
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
    const selfCgroup = fs.readFileSync('/proc/self/cgroup', 'utf8');
    return selfCgroup.split('\n').some((line) => /docker|kubepods|containerd/i.test(line));
  } catch {
    return false;
  }
}

/**
 * Resolves DB host for local/dev: Compose service name in `.env`, `127.0.0.1` on the Windows/macOS host.
 */
export function resolveDatabaseHost(hostEnvKey: string, fallback = 'localhost'): string {
  let host = process.env[hostEnvKey] || fallback;
  const env = String(process.env.ENV || '').toLowerCase();
  if ((env === 'local' || env === 'dev') && !isRunningInDocker()) {
    host = '127.0.0.1';
  }
  return host;
}
