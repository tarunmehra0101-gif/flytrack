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
from fastapi import HTTPException, Request
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

logger = logging.getLogger(__name__)

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
SESSION_COOKIE_NAME = "session_token"
OAUTH_STATE_COOKIE_NAME = "oauth_state"
SESSION_TTL_DAYS = 7


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


async def upsert_user(db, profile: dict) -> dict:
    email = profile["email"].lower()
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    now = datetime.now(timezone.utc).isoformat()
    if existing:
        await db.users.update_one(
            {"email": email},
            {"$set": {
                "name": profile.get("name") or existing.get("name"),
                "picture": profile.get("picture") or existing.get("picture"),
                "google_sub": profile.get("google_sub") or existing.get("google_sub"),
                "updated_at": now,
            }},
        )
        return await db.users.find_one({"email": email}, {"_id": 0})
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    doc = {
        "user_id": user_id,
        "email": email,
        "name": profile.get("name"),
        "picture": profile.get("picture"),
        "google_sub": profile.get("google_sub"),
        "created_at": now,
        "updated_at": now,
    }
    await db.users.insert_one(doc)
    # Ensure an empty profile row exists
    await db.user_profiles.insert_one({
        "user_id": user_id,
        "preferred_name": (profile.get("name") or "").split(" ")[0],
        "home_city_name": None,
        "home_airport_iata": None,
        "home_country_code": None,
        "work_city_name": None,
        "onboarding_completed": False,
        "theme_preference": "dark",
        "units_preference": "metric",
        "created_at": now,
        "updated_at": now,
    })
    return await db.users.find_one({"email": email}, {"_id": 0})


async def store_session(db, user_id: str, session_token: str) -> None:
    expires_at = datetime.now(timezone.utc) + timedelta(days=SESSION_TTL_DAYS)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })


def _extract_token(request: Request) -> Optional[str]:
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if token:
        return token
    auth = request.headers.get("Authorization") or request.headers.get("authorization")
    if auth and auth.lower().startswith("bearer "):
        return auth.split(" ", 1)[1].strip()
    return None


async def get_current_user(request: Request, db) -> dict:
    token = _extract_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        try:
            expires_at_dt = datetime.fromisoformat(expires_at)
        except ValueError:
            raise HTTPException(status_code=401, detail="Invalid session expiry")
    else:
        expires_at_dt = expires_at
    if expires_at_dt and expires_at_dt.tzinfo is None:
        expires_at_dt = expires_at_dt.replace(tzinfo=timezone.utc)
    if expires_at_dt and expires_at_dt < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def delete_session(db, token: str) -> None:
    if token:
        await db.user_sessions.delete_one({"session_token": token})
