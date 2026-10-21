#!/usr/bin/env bash
# Sync dist/ to any S3-compatible bucket.
# Hashed assets are cached forever; index.html is revalidated on every request.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

: "${S3_BUCKET:?S3_BUCKET is required (e.g. s3://my-bucket)}"

endpoint_args=()
if [ -n "${S3_ENDPOINT_URL:-}" ]; then
  endpoint_args=(--endpoint-url "$S3_ENDPOINT_URL")
fi
dry_run_args=()
if [ "${DRY_RUN:-}" = "1" ]; then
  dry_run_args=(--dryrun)
fi

npm run build

# Assets first so the new index.html never references files that are not uploaded yet.
# The ${arr[@]+...} form keeps empty arrays safe under `set -u` on macOS bash 3.2.
aws s3 sync dist/ "$S3_BUCKET" \
  ${endpoint_args[@]+"${endpoint_args[@]}"} ${dry_run_args[@]+"${dry_run_args[@]}"} \
  --delete --exclude "index.html" \
  --cache-control "public, max-age=31536000, immutable"

aws s3 cp dist/index.html "${S3_BUCKET%/}/index.html" \
  ${endpoint_args[@]+"${endpoint_args[@]}"} ${dry_run_args[@]+"${dry_run_args[@]}"} \
  --cache-control "no-cache" \
  --content-type "text/html; charset=utf-8"
