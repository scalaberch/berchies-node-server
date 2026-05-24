import { getEnvVariable } from '@server/env';

export const AWS_ACCESS_KEY_ID: string = getEnvVariable('AWS_ACCESS_KEY_ID');
export const AWS_SECRET_ACCESS_KEY: string = getEnvVariable('AWS_SECRET_ACCESS_KEY');
export const AWS_REGION: string = getEnvVariable('AWS_REGION');

export { getS3Client } from './s3Client';
export {
  getAppS3Config,
  resolveAppS3ObjectKey,
  createAppS3Storage,
  type AppS3Config,
} from './s3Config';
