import { S3Client } from '@aws-sdk/client-s3';
import { getEnvVariable } from '@server/env';

let s3Client: S3Client | null = null;

/**
 * Shared S3 client for the application (credentials/region from env).
 */
export const getS3Client = (): S3Client => {
  if (s3Client) {
    return s3Client;
  }

  const accessKeyId = String(getEnvVariable('AWS_ACCESS_KEY_ID', false, '')).trim();
  const secretAccessKey = String(getEnvVariable('AWS_SECRET_ACCESS_KEY', false, '')).trim();
  const region = String(getEnvVariable('AWS_REGION', false, 'ap-southeast-1')).trim();

  s3Client = new S3Client({
    region,
    credentials:
      accessKeyId && secretAccessKey
        ? {
            accessKeyId,
            secretAccessKey,
          }
        : undefined,
  });

  return s3Client;
};
