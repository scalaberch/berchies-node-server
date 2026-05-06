# MySQL Backup Runner

This module runs MySQL backups from the backend environment and can optionally upload them to S3.

## What it does

- Runs `mysqldump` with consistent options for InnoDB (`--single-transaction`, `--quick`)
- Compresses output to `.sql.gz`
- Stores backup locally in `BACKUP_OUTPUT_DIR`
- Optionally uploads to S3 when `BACKUP_UPLOAD_TO_S3=1`

## Run command

From `backend/`:

`npm run backup:mysql`

## Required env vars

- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_USER`
- `MYSQL_PASS`
- `MYSQL_DATABASE`

## Optional env vars

- `BACKUP_OUTPUT_DIR` (default: `resources/backups/mysql`)
- `BACKUP_UPLOAD_TO_S3` (`1` to enable S3 upload, default `0`)
- `BACKUP_S3_BUCKET` (required only when upload enabled)
- `BACKUP_S3_PREFIX` (default: `mysql`)
- `AWS_REGION` (default: `ap-southeast-1`)
- `ENV` (used in S3 key path, default: `local`)

## S3 key format

`<BACKUP_S3_PREFIX>/<ENV>/full/YYYY/MM/DD/mysql-<db>-<timestamp>.sql.gz`

## Notes

- Ensure `mysqldump` is installed in the runtime environment.
- Ensure AWS CLI is installed when using S3 upload.
- Configure S3 lifecycle on your prefix (for example: expire after 90 days).
