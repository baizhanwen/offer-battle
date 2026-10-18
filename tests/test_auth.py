import secrets
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app import auth

@pytest.fixture
def protected(monkeypatch):
    monkeypatch.setenv('LOGIN_ENABLED','true');monkeypatch.setenv('LOGIN_USER','test-campus')
    monkeypatch.setenv('LOGIN_PASSWORD_HASH',auth.password_hash('fixture-password'))
    monkeypatch.setenv('LOGIN_SECRET',secrets.token_hex(32));monkeypatch.setenv('COOKIE_SECURE','true')
    auth.FAILURES.clear()
    with TestClient(app,base_url='https://testserver') as client:yield client

def login(client, **values):
    return client.post('/api/login',json={'username':'test-campus','password':'fixture-password',**values})

def test_login_required_and_cookie_protection(protected):
    assert protected.get('/').url.path=='/login'
    assert protected.get('/api/catalog').status_code==401
    assert protected.get('/healthz').json()=={'ok':True}
    response=login(protected);assert response.status_code==200
    assert all(value in response.headers['set-cookie'] for value in ('Secure','HttpOnly','SameSite=strict'))
    assert protected.get('/api/catalog').status_code==200
    assert protected.post('/api/logout').status_code==200
    assert protected.get('/api/catalog').status_code==401

def test_invalid_cookie_password_and_cross_origin(protected):
    for username in ['test-campus','校园账号']:
        assert login(protected,username=username,password='wrong').status_code==401
    protected.cookies.set('offer_login','tampered');assert protected.get('/api/catalog').status_code==401
    assert protected.post('/api/login',headers={'Origin':'https://other.test'},json={'username':'test-campus','password':'fixture-password'}).status_code==403

def test_password_change_invalidates_cookie(protected,monkeypatch):
    login(protected);assert protected.get('/api/catalog').status_code==200
    monkeypatch.setenv('LOGIN_PASSWORD_HASH',auth.password_hash('new-fixture-password'))
    assert protected.get('/api/catalog').status_code==401

def test_failed_login_is_rate_limited(protected):
    for _ in range(8):assert login(protected,password='wrong').status_code==401
    assert login(protected).status_code==429
