# MySQL Backup Runner

This module runs MySQL backups from the backend environment and can optionally upload them to S3.

## What it does

- Runs `mysqldump` with consistent options for InnoDB (`--single-transaction`, `--quick`)
- Compresses output to `.sql.gz`
- Stores backup locally in `MYSQL_BACKUP_OUTPUT_DIR`
- Optionally uploads to S3 when `MYSQL_BACKUP_S3_UPLOAD=1`

## Run command

From `backend/`:

`npm run backup:mysql`

On EC2 (production artifact):

`node ./dist/server/modules/mysql/backup/run.js`

## Required env vars

- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_USER`
- `MYSQL_PASS`
- `MYSQL_DATABASE`

## Optional env vars

- `MYSQL_BACKUP_OUTPUT_DIR` (default: `resources/backups/mysql`)
- `MYSQL_BACKUP_S3_UPLOAD` (`1` to enable S3 upload, default `0`)
- `MYSQL_BACKUP_S3_BUCKET` (required only when upload enabled)
- `MYSQL_BACKUP_S3_PREFIX` (default: `mysql`)
- `AWS_REGION` (default: `ap-southeast-1`)
- `ENV` (used in S3 key path, default: `local`)

## S3 key format

`<MYSQL_BACKUP_S3_PREFIX>/<ENV>/full/YYYY/MM/DD/mysql-<db>-<timestamp>.sql.gz`

## Notes

- Ensure `mysqldump` is installed in the runtime environment.
- Ensure AWS CLI is installed when using S3 upload.
- Configure S3 lifecycle on your prefix (for example: expire after 90 days).
