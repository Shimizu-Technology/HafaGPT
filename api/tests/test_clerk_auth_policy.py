from typing import Any

import pytest

from api.auth_policy import (
    configured_authorized_parties,
    configured_clerk_issuer,
    validate_clerk_session_claims,
)


def test_authorized_parties_prefer_explicit_clerk_setting(monkeypatch):
    monkeypatch.setenv(
        "CLERK_AUTHORIZED_PARTIES",
        "https://hafagpt.com/, http://127.0.0.1:5185,https://hafagpt.com",
    )
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://wrong.example")

    assert configured_authorized_parties() == (
        "https://hafagpt.com",
        "http://127.0.0.1:5185",
    )


def test_production_defaults_never_include_localhost(monkeypatch):
    monkeypatch.delenv("CLERK_AUTHORIZED_PARTIES", raising=False)
    monkeypatch.delenv("ALLOWED_ORIGINS", raising=False)
    monkeypatch.setenv("SENTRY_ENVIRONMENT", "production")

    parties = configured_authorized_parties()

    assert "https://hafagpt.com" in parties
    assert all("localhost" not in origin and "127.0.0.1" not in origin for origin in parties)


@pytest.mark.parametrize("claims", [{}, {"azp": ""}, {"azp": None}])
def test_rejects_missing_authorized_party(claims):
    with pytest.raises(ValueError, match="missing"):
        validate_clerk_session_claims(claims, ("https://hafagpt.com",))


def test_rejects_wrong_authorized_party():
    with pytest.raises(ValueError, match="unauthorized"):
        validate_clerk_session_claims(
            {"azp": "https://attacker.example"},
            ("https://hafagpt.com",),
        )


def test_accepts_authorized_party_with_trailing_slash():
    validate_clerk_session_claims(
        {"azp": "https://hafagpt.com/"},
        ("https://hafagpt.com",),
    )


def test_optional_issuer_is_normalized(monkeypatch):
    monkeypatch.setenv("CLERK_ISSUER", "https://example.clerk.accounts.dev/")
    assert configured_clerk_issuer() == "https://example.clerk.accounts.dev"


def test_clerk_verifier_accepts_real_rs256_and_rejects_der_hmac_forgery(monkeypatch: pytest.MonkeyPatch) -> None:
    import ast
    import base64
    import hashlib
    import hmac
    import json
    import logging
    import time
    from pathlib import Path
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    from fastapi import HTTPException
    from jose import jwk, jwt
    from jose.exceptions import JWTError

    # Execute the production verifier without importing model/DB startup code.
    tree = ast.parse((Path(__file__).parents[1] / 'api/main.py').read_text())
    function = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == '_decode_clerk_token')
    private = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pem = private.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())
    public_pem = private.public_key().public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo)
    public_der = private.public_key().public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)
    key = jwk.construct(public_pem, algorithm='RS256').to_dict()
    key['kid'] = 'trusted-key'
    key_reads = []
    def get_keys(force_refresh: bool = False) -> list[dict[str, Any]]:
        key_reads.append(force_refresh)
        return [key]
    namespace = {'_get_clerk_jwks': get_keys, '_key_to_dict': lambda value: value,
                 'CLERK_ISSUER': 'https://auth.example', 'CLERK_AUTHORIZED_PARTIES': ('https://hafagpt.com',),
                 'validate_clerk_session_claims': validate_clerk_session_claims,
                 'HTTPException': HTTPException, 'logger': logging.getLogger(__name__)}
    exec(compile(ast.Module(body=[function], type_ignores=[]), '<production verifier>', 'exec'), namespace)
    claims = {'sub': 'real-learner', 'iss': 'https://auth.example', 'azp': 'https://hafagpt.com', 'exp': int(time.time()) + 60}
    calls = []
    decode = jwt.decode
    def tracked_decode(*args: Any, **kwargs: Any) -> dict[str, Any]:
        calls.append(kwargs)
        return decode(*args, **kwargs)
    monkeypatch.setattr(jwt, 'decode', tracked_decode)
    token = jwt.encode(claims, pem, algorithm='RS256', headers={'kid': 'trusted-key'})
    assert namespace['_decode_clerk_token'](token)['sub'] == 'real-learner'
    assert calls[0]['algorithms'] == ['RS256']
    reads_before_forgery = len(key_reads)
    b64 = lambda value: base64.urlsafe_b64encode(value).rstrip(b'=')
    signing_input = b'.'.join([b64(json.dumps({'alg': 'HS256', 'kid': 'trusted-key', 'typ': 'JWT'}).encode()), b64(json.dumps(claims).encode())])
    forged = (signing_input + b'.' + b64(hmac.new(public_der, signing_input, hashlib.sha256).digest())).decode()
    with pytest.raises(JWTError, match='RS256'):
        namespace['_decode_clerk_token'](forged)
    assert len(key_reads) == reads_before_forgery
    assert len(calls) == 1
