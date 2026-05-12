#!/usr/bin/env bash
# Empties the uploads bucket: every object version and delete marker.
# Requires: aws CLI, jq, and credentials with s3:ListObjectVersions + s3:DeleteObject on the bucket.
#
# Usage:
#   export BUCKET=hostahtml-uploads-123456789012-us-east-1   # from CDK output BucketName
#   ./scripts/empty-uploads-bucket.sh

set -euo pipefail

: "${BUCKET:?Set BUCKET to the uploads bucket name (HostahtmlStack BucketName output)}"

echo "Purging all versions and delete markers in s3://${BUCKET} ..."

while true; do
  resp="$(aws s3api list-object-versions --bucket "$BUCKET" --max-keys 1000 --output json)"
  objs="$(echo "$resp" | jq '[.Versions[]?, .DeleteMarkers[]?] | map({Key: .Key, VersionId: .VersionId})')"
  n="$(echo "$objs" | jq 'length')"
  if [[ "$n" -eq 0 ]]; then
    echo "Bucket empty."
    break
  fi
  echo "$objs" | jq '{Objects: ., Quiet: true}' |
    aws s3api delete-objects --bucket "$BUCKET" --delete file:///dev/stdin
done
