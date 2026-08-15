"""Private object references and short-lived download URLs for chat uploads."""

from __future__ import annotations

import os
from functools import lru_cache
import boto3


REFERENCE_SCHEME = "s3://"
DOWNLOAD_URL_TTL_SECONDS = 15 * 60


def make_private_upload_reference(bucket: str, object_key: str) -> str:
    return f"{REFERENCE_SCHEME}{bucket}/{object_key}"


def parse_private_upload_reference(reference: str | None) -> tuple[str, str] | None:
    if not reference or not reference.startswith(REFERENCE_SCHEME):
        return None
    bucket_and_key = reference[len(REFERENCE_SCHEME):]
    bucket, separator, object_key = bucket_and_key.partition("/")
    if not separator or not bucket or not object_key:
        return None
    return bucket, object_key


@lru_cache(maxsize=1)
def _storage_client():
    return boto3.client(
        "s3",
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        region_name=os.getenv("AWS_REGION", "us-west-2"),
    )


def resolve_private_upload_reference(reference: str | None) -> str | None:
    """Convert an approved private reference to a short-lived signed URL."""

    parsed = parse_private_upload_reference(reference)
    if not parsed:
        return reference

    bucket, object_key = parsed
    configured_bucket = os.getenv("AWS_PRIVATE_UPLOADS_BUCKET", "").strip()
    if not configured_bucket or bucket != configured_bucket:
        return None

    return _storage_client().generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket, "Key": object_key},
        ExpiresIn=DOWNLOAD_URL_TTL_SECONDS,
    )


def delete_private_upload_references(references: list[str]) -> int:
    """Delete approved private objects; ignore legacy/public URL values."""

    configured_bucket = os.getenv("AWS_PRIVATE_UPLOADS_BUCKET", "").strip()
    if not configured_bucket:
        return 0

    deleted = 0
    for reference in dict.fromkeys(references):
        parsed = parse_private_upload_reference(reference)
        if not parsed or parsed[0] != configured_bucket:
            continue
        _storage_client().delete_object(Bucket=parsed[0], Key=parsed[1])
        deleted += 1
    return deleted
