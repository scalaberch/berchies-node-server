import { getEnvVariable } from '@server/env';
import { createS3Storage, joinObjectKey, type S3Storage } from '@server/lib/files/s3';

export type AppS3Config = {
  bucket: string;
  baseFolder: string;
};

const normalizeFolder = (value: string): string =>
  String(value ?? '')
    .trim()
    .replace(/^\/+|\/+$/g, '');

/**
 * Application-wide S3 settings from env (`AWS_S3_BUCKET`, optional `AWS_S3_BASE_FOLDER`).
 */
export const getAppS3Config = (): AppS3Config => ({
  bucket: String(getEnvVariable('AWS_S3_BUCKET', false, '')).trim(),
  baseFolder: normalizeFolder(String(getEnvVariable('AWS_S3_BASE_FOLDER', false, ''))),
});

/** Build an object key under the optional app base folder. */
export const resolveAppS3ObjectKey = (...segments: string[]): string => {
  const { baseFolder } = getAppS3Config();
  return joinObjectKey(baseFolder, ...segments);
};

/** S3 storage using the app bucket from env. */
export const createAppS3Storage = (options?: { signedUrlExpirySeconds?: number }): S3Storage => {
  const { bucket } = getAppS3Config();
  return createS3Storage({
    bucket,
    signedUrlExpirySeconds: options?.signedUrlExpirySeconds ?? 3600,
  });
};

export default {
  getAppS3Config,
  resolveAppS3ObjectKey,
  createAppS3Storage,
};
