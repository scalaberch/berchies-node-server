import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getS3Client } from '@server/lib/aws/s3Client';

export const S3_NOT_CONFIGURED = 'S3_NOT_CONFIGURED';

export type S3PutObjectInput = {
  key: string;
  body: Buffer;
  contentType: string;
  cacheControl?: string;
};

export type S3DeleteObjectInput = {
  key: string;
};

export type S3StorageOptions = {
  bucket: string;
  signedUrlExpirySeconds?: number;
};

/**
 * Bucket-scoped S3 helper: upload objects and issue signed download URLs.
 * Construct one instance per bucket/use-case (e.g. payment proofs, exports).
 */
export class S3Storage {
  private readonly bucket: string;
  private readonly signedUrlExpirySeconds: number;

  constructor(options: S3StorageOptions) {
    this.bucket = String(options.bucket ?? '').trim();
    const expiry = Number(options.signedUrlExpirySeconds ?? 3600);
    this.signedUrlExpirySeconds = Number.isFinite(expiry) && expiry > 0 ? expiry : 3600;
  }

  isConfigured(): boolean {
    return this.bucket.length > 0;
  }

  assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new Error(S3_NOT_CONFIGURED);
    }
  }

  async putObject(input: S3PutObjectInput): Promise<void> {
    this.assertConfigured();

    await getS3Client().send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        ...(input.cacheControl ? { CacheControl: input.cacheControl } : {}),
      }),
    );
  }

  async deleteObject(input: S3DeleteObjectInput): Promise<void> {
    const key = String(input.key ?? '').trim();
    if (!key) {
      return;
    }

    this.assertConfigured();

    await getS3Client().send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  async getObject(objectKey: string): Promise<{ body: Buffer; contentType: string }> {
    const key = String(objectKey ?? '').trim();
    if (!key) {
      throw new Error('S3_OBJECT_KEY_REQUIRED');
    }

    this.assertConfigured();

    const result = await getS3Client().send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );

    const bytes = await result.Body?.transformToByteArray();
    if (!bytes || bytes.length === 0) {
      throw new Error('S3_OBJECT_EMPTY');
    }

    return {
      body: Buffer.from(bytes),
      contentType: String(result.ContentType ?? 'application/octet-stream'),
    };
  }

  async getSignedDownloadUrl(objectKey: string, expiresInSeconds?: number): Promise<string> {
    const key = String(objectKey ?? '').trim();
    if (!key) {
      return '';
    }

    this.assertConfigured();

    const expiresIn =
      expiresInSeconds && expiresInSeconds > 0 ? expiresInSeconds : this.signedUrlExpirySeconds;

    return getSignedUrl(
      getS3Client(),
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
      { expiresIn },
    );
  }
}

/** Join path segments into an S3 object key (no leading slash). */
export const joinObjectKey = (...segments: string[]): string =>
  segments
    .map((segment) => String(segment ?? '').trim().replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');

export const createS3Storage = (options: S3StorageOptions): S3Storage => new S3Storage(options);

export default {
  S3Storage,
  S3_NOT_CONFIGURED,
  createS3Storage,
  joinObjectKey,
};
