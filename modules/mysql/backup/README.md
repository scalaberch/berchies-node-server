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

```bash
cd /opt/crown-backend
node ./dist/server/modules/mysql/backup/run.js
```

The script loads `.env` via **dotenv** (same idea as the API). Do **not** rely on `source .env` in bash if `MYSQL_PASS` contains `$` — bash will mangle it. Quote such values in `.env`, e.g. `MYSQL_PASS='your$pass'`.

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
- Configure S3 lifecycle on your prefix (see below).

## S3 lifecycle (expire old backups)

Backups are uploaded under:

`s3://<MYSQL_BACKUP_S3_BUCKET>/<MYSQL_BACKUP_S3_PREFIX>/<ENV>/full/YYYY/MM/DD/...`

Use a **prefix-scoped** lifecycle rule so app uploads (e.g. `AWS_S3_BASE_FOLDER`) are not affected.

### AWS Console

1. Open [S3](https://s3.console.aws.amazon.com/s3/) → bucket **`crown-ilg-bucket`** (or your `MYSQL_BACKUP_S3_BUCKET`).
2. **Management** tab → **Lifecycle rules** → **Create lifecycle rule**.
3. **Rule name:** `expire-mysql-backups`
4. **Choose a rule scope:** Limit to objects with a prefix → **`mysql-backups/`** (must match `MYSQL_BACKUP_S3_PREFIX` + `/`).
5. **Lifecycle rule actions:** check **Expire current versions of objects**.
6. **Days after object creation:** e.g. **60** (adjust for compliance; 30–90 is common for daily dumps).
7. Save.

Lifecycle runs once per day; deletes are not immediate.

### AWS CLI

Replace `60` with your retention days. If the bucket already has lifecycle rules, merge them in one JSON file instead of overwriting.

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket crown-ilg-bucket \
  --region ap-southeast-1 \
  --lifecycle-configuration '{
    "Rules": [{
      "ID": "expire-mysql-backups",
      "Status": "Enabled",
      "Filter": { "Prefix": "mysql-backups/" },
      "Expiration": { "Days": 60 }
    }]
  }'
```

Verify:

```bash
aws s3api get-bucket-lifecycle-configuration \
  --bucket crown-ilg-bucket \
  --region ap-southeast-1
```

### Optional: Glacier then expire

For cheaper long retention, add a transition (Console: **Transition current versions** → Glacier Instant Retrieval or Glacier Flexible Retrieval after 30 days, expire after 180). Only needed if you want archives beyond ~90 days.

