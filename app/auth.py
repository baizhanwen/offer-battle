"""Small shared demo login; no plaintext credentials or browser storage."""
import hashlib
import hmac
import os
import secrets
import time
from collections import defaultdict, deque

FAILURES = defaultdict(deque)


def enabled():
    return os.getenv('LOGIN_ENABLED', 'false').lower() == 'true'


def password_hash(password):
    salt = secrets.token_hex(16)
    digest = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=16384, r=8, p=1).hex()
    return salt + ':' + digest


def verify_password(password):
    try:
        salt, expected = os.environ['LOGIN_PASSWORD_HASH'].split(':')
        actual = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=16384, r=8, p=1).hex()
        return hmac.compare_digest(actual, expected)
    except (KeyError, ValueError):
        return False


def signature(value):
    # Bind cookies to the current credential configuration, invalidating old logins.
    key = os.getenv('LOGIN_SECRET', '') + os.getenv('LOGIN_PASSWORD_HASH', '') + os.getenv('LOGIN_USER', '')
    return hmac.new(key.encode(), value.encode(), hashlib.sha256).hexdigest()


def issue():
    value = str(int(time.time()) + 43200) + '.' + secrets.token_hex(16)
    return value + '.' + signature(value)


def valid(cookie):
    if not os.getenv('LOGIN_SECRET') or not os.getenv('LOGIN_PASSWORD_HASH'):
        return False
    try:
        expiry, nonce, sig = cookie.split('.')
        return int(time.time()) < int(expiry) <= int(time.time()) + 43200 and hmac.compare_digest(sig, signature(expiry + '.' + nonce))
    except (ValueError, TypeError):
        return False


def throttled(ip):
    now = time.monotonic()
    # Bound both the failure window and the number of tracked remote addresses.
    for key, values in list(FAILURES.items()):
        while values and now - values[0] > 600:
            values.popleft()
        if not values:
            del FAILURES[key]
    if len(FAILURES) > 2000:
        return True
    return len(FAILURES.get(ip, [])) >= 8
