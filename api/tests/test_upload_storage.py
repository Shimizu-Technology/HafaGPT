from api.upload_storage import (
    delete_private_upload_references,
    make_private_upload_reference,
    parse_private_upload_reference,
    resolve_private_upload_reference,
)


def test_private_reference_round_trip():
    reference = make_private_upload_reference("private-bucket", "uploads/user/photo.png")
    assert parse_private_upload_reference(reference) == (
        "private-bucket",
        "uploads/user/photo.png",
    )


def test_public_and_legacy_urls_pass_through():
    url = "https://example.com/legacy.png"
    assert resolve_private_upload_reference(url) == url


def test_unapproved_private_bucket_fails_closed(monkeypatch):
    monkeypatch.setenv("AWS_PRIVATE_UPLOADS_BUCKET", "expected-bucket")
    assert resolve_private_upload_reference("s3://different-bucket/private.txt") is None


def test_approved_reference_gets_short_lived_url(monkeypatch):
    monkeypatch.setenv("AWS_PRIVATE_UPLOADS_BUCKET", "private-bucket")

    class FakeClient:
        def generate_presigned_url(self, operation, Params, ExpiresIn):
            assert operation == "get_object"
            assert Params == {"Bucket": "private-bucket", "Key": "uploads/user/photo.png"}
            assert ExpiresIn == 15 * 60
            return "https://signed.example/photo.png"

    monkeypatch.setattr("api.upload_storage._storage_client", lambda: FakeClient())
    assert (
        resolve_private_upload_reference("s3://private-bucket/uploads/user/photo.png")
        == "https://signed.example/photo.png"
    )


def test_deletes_only_objects_from_approved_private_bucket(monkeypatch):
    monkeypatch.setenv("AWS_PRIVATE_UPLOADS_BUCKET", "private-bucket")

    class FakeClient:
        def __init__(self):
            self.deleted = []

        def delete_object(self, **kwargs):
            self.deleted.append(kwargs)

    client = FakeClient()
    monkeypatch.setattr("api.upload_storage._storage_client", lambda: client)

    count = delete_private_upload_references([
        "s3://private-bucket/uploads/user/photo.png",
        "s3://other-bucket/uploads/user/other.png",
        "https://example.com/legacy.png",
    ])

    assert count == 1
    assert client.deleted == [{
        "Bucket": "private-bucket",
        "Key": "uploads/user/photo.png",
    }]
