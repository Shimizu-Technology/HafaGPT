import ast
import io
import logging
import os
import threading
from contextlib import closing
from pathlib import Path
from types import SimpleNamespace
from typing import Optional
from unittest.mock import Mock
from urllib.parse import quote

import pytest
from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import Response
from fastapi.testclient import TestClient
from starlette.concurrency import run_in_threadpool
from api import upload_storage

ROOT = Path(__file__).resolve().parents[1] / 'api'
TYPES = {'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'text/plain'}


def isolated(filename, name, namespace):
    source = ROOT / filename
    node = next(node for node in ast.parse(source.read_text()).body if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == name)
    exec(compile(ast.Module(body=[node], type_ignores=[]), str(source), 'exec'), namespace)
    return namespace[name]


def metadata_loader(stored_row):
    cursor = Mock(); cursor.fetchone.return_value = stored_row
    connection = Mock(); connection.cursor.return_value = cursor
    function = isolated('conversations.py', 'get_conversation_attachment', {'Optional': Optional, 'closing': closing, 'get_db_connection_with_retry': lambda: connection})
    return function, cursor, connection


def test_metadata_scope_is_exact_and_returns_raw_reference():
    stored = {'url': 's3://approved/private/photo.png', 'filename': 'photo.png', 'content_type': 'image/png'}
    read, cursor, connection = metadata_loader(([stored], None))
    assert read('conv-a', 15, 0, 'learner-a') == stored
    sql, params = cursor.execute.call_args.args
    assert params == ('conv-a', 'learner-a', 15, 'learner-a')
    assert 'conversation.deleted_at IS NULL' in sql and 'logs.id = %s AND logs.user_id = %s' in sql
    assert 'logs.conversation_id = conversation.id' in sql
    cursor.close.assert_called_once(); connection.close.assert_called_once()


@pytest.mark.parametrize('stored,index', [(None, 0), (([], None), 0), (([{'url': 's3://approved/a.txt'}], None), 1), ((['invalid'], None), 0)])
def test_missing_owner_row_file_or_invalid_metadata_returns_none(stored, index):
    read, _, _ = metadata_loader(stored)
    assert read('conv-a', 15, index, 'other-owner') is None


@pytest.mark.parametrize('index', [-1, 10, 999])
def test_out_of_range_index_never_reads_database(index):
    read, cursor, _ = metadata_loader(([{'url': 's3://approved/a.txt'}], None))
    assert read('conv-a', 15, index, 'learner-a') is None
    cursor.execute.assert_not_called()


def test_legacy_image_is_only_index_zero():
    read, _, _ = metadata_loader((None, 's3://approved/photo.png'))
    assert read('conv-a', 15, 0, 'learner-a') == {'url': 's3://approved/photo.png', 'type': 'image'}
    assert read('conv-a', 15, 1, 'learner-a') is None


class Body(io.BytesIO):
    def __init__(self, value):
        super().__init__(value); self.amounts = []
    def read(self, amount=-1):
        self.amounts.append(amount); return super().read(amount)


@pytest.mark.parametrize('reference', ['https://external.example/a.txt', 'http://localhost/private', 's3://unapproved/a.txt', 's3://approved/', None])
def test_rejected_reference_never_constructs_storage_client(monkeypatch, reference):
    monkeypatch.setenv('AWS_PRIVATE_UPLOADS_BUCKET', 'approved')
    client = Mock(); monkeypatch.setattr(upload_storage, '_storage_client', client)
    assert upload_storage.read_private_upload(reference) is None
    client.assert_not_called()


def storage_fixture(monkeypatch, content, length):
    monkeypatch.setenv('AWS_PRIVATE_UPLOADS_BUCKET', 'approved')
    body = Body(content); client = Mock()
    client.get_object.return_value = {'Body': body, 'ContentLength': length}
    monkeypatch.setattr(upload_storage, '_storage_client', lambda: client)
    return body, client


def test_bounded_read_closes_object_body(monkeypatch):
    body, client = storage_fixture(monkeypatch, b'owned bytes', 11)
    assert upload_storage.read_private_upload('s3://approved/private/a.txt') == b'owned bytes'
    client.get_object.assert_called_once_with(Bucket='approved', Key='private/a.txt')
    assert body.amounts == [20 * 1024 * 1024 + 1] and body.closed


def test_oversize_length_closes_without_reading(monkeypatch):
    body, _ = storage_fixture(monkeypatch, b'', 20 * 1024 * 1024 + 1)
    with pytest.raises(upload_storage.PrivateUploadTooLarge): upload_storage.read_private_upload('s3://approved/a.txt')
    assert not body.amounts and body.closed


def test_lying_length_still_bounded_and_closed(monkeypatch):
    monkeypatch.setattr(upload_storage, 'MAX_PRIVATE_DOWNLOAD_BYTES', 5)
    body, _ = storage_fixture(monkeypatch, b'123456789', 5)
    with pytest.raises(upload_storage.PrivateUploadTooLarge): upload_storage.read_private_upload('s3://approved/a.txt')
    assert body.amounts == [6] and body.closed


def test_short_body_raises_and_closes(monkeypatch):
    body, _ = storage_fixture(monkeypatch, b'ab', 3)
    with pytest.raises(ValueError, match='Incomplete'): upload_storage.read_private_upload('s3://approved/a.txt')
    assert body.closed


def client_for(metadata=None, storage=None, authenticated=True):
    app = FastAPI()
    async def verify(authorization):
        if not authenticated or authorization != 'Bearer test-token': raise HTTPException(status_code=401, detail='Sign in required')
        return 'learner-a'
    metadata = metadata or Mock(return_value={'url': 's3://approved/a.txt', 'filename': 'a.txt', 'content_type': 'text/plain'})
    storage = storage or Mock(return_value=b'owned bytes')
    namespace = {'app': app, 'Optional': Optional, 'Header': Header, 'HTTPException': HTTPException, 'Response': Response, 'run_in_threadpool': run_in_threadpool, 'quote': quote, 'os': os, 'MAX_UPLOAD_FILES': 10, 'SUPPORTED_FILE_TYPES': TYPES, 'verify_user': verify, 'conversations': SimpleNamespace(get_conversation_attachment=metadata), 'upload_storage': SimpleNamespace(read_private_upload=storage, PrivateUploadTooLarge=upload_storage.PrivateUploadTooLarge), 'logger': logging.getLogger(__name__)}
    isolated('main.py', 'get_conversation_attachment_endpoint', namespace)
    return TestClient(app), metadata, storage


def request(client, index=0, auth=True):
    return client.get(f'/api/conversations/conv-a/messages/15/files/{index}', headers={'Authorization': 'Bearer test-token'} if auth else {})


def test_route_threadpool_no_store_and_safe_blob_headers():
    threads = []
    def metadata(*args):
        threads.append(threading.current_thread().name); assert args == ('conv-a', 15, 0, 'learner-a')
        return {'url': 's3://approved/photo.png', 'filename': 'Håfa\r\nphoto.png', 'content_type': 'image/png'}
    def storage(reference):
        threads.append(threading.current_thread().name); assert reference == 's3://approved/photo.png'
        return b'owned bytes'
    client, _, _ = client_for(metadata, storage); response = request(client)
    assert response.status_code == 200 and response.content == b'owned bytes'
    assert response.headers['content-type'] == 'image/png'
    assert response.headers['cache-control'] == 'no-store' and response.headers['x-content-type-options'] == 'nosniff'
    assert '%0A' not in response.headers['content-disposition'] and '%C3%A5' in response.headers['content-disposition']
    assert all('AnyIO worker thread' in name for name in threads)


@pytest.mark.parametrize('index', [-1, 10])
def test_route_invalid_index_has_no_reads(index):
    client, metadata, storage = client_for(); assert request(client, index).status_code == 404
    metadata.assert_not_called(); storage.assert_not_called()


def test_route_unowned_missing_row_has_no_storage_read():
    client, metadata, storage = client_for(metadata=Mock(return_value=None))
    assert request(client).status_code == 404
    metadata.assert_called_once_with('conv-a', 15, 0, 'learner-a'); storage.assert_not_called()


def test_route_authentication_precedes_private_reads():
    client, metadata, storage = client_for(authenticated=False)
    assert request(client, auth=False).status_code == 401
    metadata.assert_not_called(); storage.assert_not_called()


def test_route_rejects_html_without_storage_read():
    client, _, storage = client_for(metadata=Mock(return_value={'url': 's3://approved/a.html', 'content_type': 'text/html'}))
    assert request(client).status_code == 404; storage.assert_not_called()


def test_route_legacy_image_has_allowed_mime():
    client, _, _ = client_for(metadata=Mock(return_value={'url': 's3://approved/photo.png', 'type': 'image'}))
    response = request(client); assert response.status_code == 200 and response.headers['content-type'] == 'image/png'


@pytest.mark.parametrize('result,status', [(None, 404), (upload_storage.PrivateUploadTooLarge(), 413), (RuntimeError('private key detail'), 502)])
def test_route_failure_status_is_safe(result, status):
    storage = Mock(side_effect=result) if isinstance(result, Exception) else Mock(return_value=result)
    client, _, _ = client_for(storage=storage); response = request(client)
    assert response.status_code == status and 'private key detail' not in response.text
