"""Google OAuth and app-session helpers."""

from __future__ import annotations

import logging
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import urlencode

import httpx
from fastapi import HTTPException, Request, Depends
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from supabase import create_client, Client

logger = logging.getLogger(__name__)

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"

def get_supabase() -> Client:
    supabase_url = _required_env("SUPABASE_URL")
    supabase_key = _required_env("SUPABASE_SERVICE_ROLE_KEY")
    return create_client(supabase_url, supabase_key)


def _required_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise HTTPException(status_code=500, detail=f"Missing {name}")
    return value


def session_cookie_secure() -> bool:
    return os.environ.get("SESSION_COOKIE_SECURE", "false").lower() in {"1", "true", "yes"}


def new_oauth_state() -> str:
    return secrets.token_urlsafe(32)


def build_google_auth_url(state: str, redirect_uri: str) -> str:
    client_id = _required_env("GOOGLE_CLIENT_ID")
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "prompt": "select_account",
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


async def exchange_google_code(code: str, redirect_uri: str) -> dict:
    """Exchange a Google OAuth code and return normalized profile data."""
    if not code:
        raise HTTPException(status_code=400, detail="Missing OAuth code")
    client_id = _required_env("GOOGLE_CLIENT_ID")
    client_secret = _required_env("GOOGLE_CLIENT_SECRET")
    async with httpx.AsyncClient(timeout=12.0) as client:
        resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
    if resp.status_code != 200:
        logger.warning("Google token exchange failed: %s %s", resp.status_code, resp.text[:200])
        raise HTTPException(status_code=401, detail="Google sign-in failed")
    token_payload = resp.json()
    raw_id_token = token_payload.get("id_token")
    if not raw_id_token:
        raise HTTPException(status_code=502, detail="Google did not return an id_token")
    try:
        claims = id_token.verify_oauth2_token(
            raw_id_token,
            google_requests.Request(),
            client_id,
        )
    except ValueError as e:
        logger.warning("Google id_token verification failed: %s", e)
        raise HTTPException(status_code=401, detail="Invalid Google identity token")
    if not claims.get("email"):
        raise HTTPException(status_code=502, detail="Google profile missing email")
    return {
        "email": claims["email"],
        "name": claims.get("name") or claims["email"].split("@")[0],
        "picture": claims.get("picture"),
        "google_sub": claims.get("sub"),
    }


async def upsert_user(profile: dict) -> dict:
    # Deprecated: Frontend uses Supabase Auth directly now.
    pass

async def store_session(user_id: str, session_token: str) -> None:
    # Deprecated: Frontend uses Supabase Auth directly now.
    pass

def _extract_token(request: Request) -> Optional[str]:
    auth = request.headers.get("Authorization") or request.headers.get("authorization")
    if auth and auth.lower().startswith("bearer "):
        return auth.split(" ", 1)[1].strip()
    return None

async def get_current_user(request: Request) -> dict:
    token = _extract_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    supabase = get_supabase()
    user_res = supabase.auth.get_user(token)
    if not user_res or not user_res.user:
        raise HTTPException(status_code=401, detail="Invalid session")
        
    return {"user_id": user_res.user.id, "email": user_res.user.email}

async def delete_session(token: str) -> None:
    pass
