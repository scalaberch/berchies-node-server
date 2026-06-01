import dotenv from 'dotenv';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import zlib from 'node:zlib';

// Load .env like the API (avoid `source .env` in shell — `$` in values breaks bash).
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });

type BackupEnv = {
  MYSQL_HOST: string;
  MYSQL_PORT: string;
  MYSQL_USER: string;
  MYSQL_PASS: string;
  MYSQL_DATABASE: string;
  ENV: string;
  AWS_REGION: string;
  MYSQL_BACKUP_OUTPUT_DIR: string;
  MYSQL_BACKUP_S3_UPLOAD: string;
  MYSQL_BACKUP_S3_BUCKET: string;
  MYSQL_BACKUP_S3_PREFIX: string;
};

function readEnv(): BackupEnv {
  return {
    MYSQL_HOST: process.env.MYSQL_HOST ?? '',
    MYSQL_PORT: process.env.MYSQL_PORT ?? '3306',
    MYSQL_USER: process.env.MYSQL_USER ?? '',
    MYSQL_PASS: process.env.MYSQL_PASS ?? '',
    MYSQL_DATABASE: process.env.MYSQL_DATABASE ?? '',
    ENV: process.env.ENV ?? 'local',
    AWS_REGION: process.env.AWS_REGION ?? 'ap-southeast-1',
    MYSQL_BACKUP_OUTPUT_DIR:
      process.env.MYSQL_BACKUP_OUTPUT_DIR ?? 'resources/backups/mysql',
    MYSQL_BACKUP_S3_UPLOAD: process.env.MYSQL_BACKUP_S3_UPLOAD ?? '0',
    MYSQL_BACKUP_S3_BUCKET: process.env.MYSQL_BACKUP_S3_BUCKET ?? '',
    MYSQL_BACKUP_S3_PREFIX: process.env.MYSQL_BACKUP_S3_PREFIX ?? 'mysql',
  };
}

function assertRequired(env: BackupEnv): void {
  const required = ['MYSQL_HOST', 'MYSQL_PORT', 'MYSQL_USER', 'MYSQL_PASS', 'MYSQL_DATABASE'] as const;
  const missing = required.filter((key) => !String(env[key]).trim());
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}

function nowParts(): { stamp: string; yyyy: string; mm: string; dd: string } {
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const hh = String(now.getUTCHours()).padStart(2, '0');
  const min = String(now.getUTCMinutes()).padStart(2, '0');
  const sec = String(now.getUTCSeconds()).padStart(2, '0');
  return {
    stamp: `${yyyy}-${mm}-${dd}T${hh}-${min}-${sec}Z`,
    yyyy,
    mm,
    dd,
  };
}

async function runMysqlDumpToGzip(env: BackupEnv, outputFile: string): Promise<void> {
  const dump = spawn(
    'mysqldump',
    [
      `--host=${env.MYSQL_HOST}`,
      `--port=${env.MYSQL_PORT}`,
      `--user=${env.MYSQL_USER}`,
      '--single-transaction',
      '--quick',
      '--no-tablespaces',
      '--routines',
      '--triggers',
      '--events',
      env.MYSQL_DATABASE,
    ],
    {
      env: {
        ...process.env,
        MYSQL_PWD: env.MYSQL_PASS,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  let stderr = '';
  dump.stderr.on('data', (chunk) => {
    stderr += String(chunk);
  });

  const gzip = zlib.createGzip({ level: 9 });
  const writer = fs.createWriteStream(outputFile);

  const exitCode = await new Promise<number>((resolve, reject) => {
    dump.on('error', reject);
    dump.on('close', resolve);
    pipeline(dump.stdout, gzip, writer).catch(reject);
  });

  if (exitCode !== 0) {
    await fsp.unlink(outputFile).catch(() => undefined);
    throw new Error(`mysqldump failed (code=${exitCode}): ${stderr.trim() || 'no stderr'}`);
  }
}

async function uploadToS3(env: BackupEnv, filePath: string, s3Key: string): Promise<void> {
  if (!env.MYSQL_BACKUP_S3_BUCKET.trim()) {
    throw new Error('MYSQL_BACKUP_S3_BUCKET is required when MYSQL_BACKUP_S3_UPLOAD=1');
  }

  await new Promise<void>((resolve, reject) => {
    const uploader = spawn(
      'aws',
      [
        's3',
        'cp',
        filePath,
        `s3://${env.MYSQL_BACKUP_S3_BUCKET}/${s3Key}`,
        '--region',
        env.AWS_REGION,
        '--sse',
        'AES256',
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );

    let stderr = '';
    uploader.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    uploader.on('error', reject);
    uploader.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`aws s3 cp failed (code=${code}): ${stderr.trim() || 'no stderr'}`));
    });
  });
}

async function main() {
  const env = readEnv();
  assertRequired(env);

  const uploadToS3Enabled = String(env.MYSQL_BACKUP_S3_UPLOAD).trim() === '1';
  const parts = nowParts();
  const backupDir = path.resolve(process.cwd(), env.MYSQL_BACKUP_OUTPUT_DIR);
  await fsp.mkdir(backupDir, { recursive: true });

  const fileName = `mysql-${env.MYSQL_DATABASE}-${parts.stamp}.sql.gz`;
  const outputFile = path.join(backupDir, fileName);
  const s3Prefix = String(env.MYSQL_BACKUP_S3_PREFIX).replace(/^\/+|\/+$/g, '');
  const s3Key = `${s3Prefix}/${env.ENV}/full/${parts.yyyy}/${parts.mm}/${parts.dd}/${fileName}`;

  const startedAt = Date.now();
  console.info(`[backup] starting mysql dump for database "${env.MYSQL_DATABASE}"`);
  await runMysqlDumpToGzip(env, outputFile);
  const stat = await fsp.stat(outputFile);
  console.info(`[backup] dump completed: ${outputFile} (${stat.size} bytes)`);

  if (uploadToS3Enabled) {
    console.info(`[backup] uploading to s3://${env.MYSQL_BACKUP_S3_BUCKET}/${s3Key}`);
    await uploadToS3(env, outputFile, s3Key);
    console.info('[backup] upload completed');
  } else {
    console.info('[backup] MYSQL_BACKUP_S3_UPLOAD != 1, skipping upload');
  }

  const elapsedMs = Date.now() - startedAt;
  console.info(`[backup] done in ${elapsedMs}ms`);
}

main().catch((error) => {
  console.error('[backup] failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
