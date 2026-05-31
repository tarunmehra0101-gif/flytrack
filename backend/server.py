"""Travel Ledger API — FastAPI server.

V1 Focus: IATA BCBP barcode decoding + optional AeroDataBox enrichment.
Auth: Google OAuth login.
Persistence: MongoDB via Motor.
"""

from __future__ import annotations

import hashlib
import logging
import os
import secrets
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

from auth import (
    build_google_auth_url,
    delete_session,
    get_current_user,
    new_oauth_state,
    session_cookie_secure,
    store_session,
    upsert_user,
    get_supabase,
)
from services.airports import AIRLINES, AIRPORTS, lookup_airline, lookup_airport, search_airlines, search_airports
from services.analytics import (
    compute_dashboard,
    compute_map_data,
    compute_monthly_stats,
    compute_wrapped,
    derive_trips_and_stays,
    segment_distance_km,
    segment_duration_source,
)
from services.bcbp_parser import parse_bcbp
from services.flight_status import flight_status_client
from services.pdf_parser import parse_pdf_ticket


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# MongoDB removed; using Supabase Postgres via get_supabase()
from db_wrapper import SupabaseDBWrapper
db = SupabaseDBWrapper(get_supabase())

app = FastAPI(title="Travel Ledger API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


# ---------- Pydantic models ----------

class SessionExchangeReq(BaseModel):
    session_id: str


class ProfileUpdate(BaseModel):
    preferred_name: Optional[str] = None
    home_city_name: Optional[str] = None
    home_airport_iata: Optional[str] = None
    home_country_code: Optional[str] = None
    work_city_name: Optional[str] = None
    theme_preference: Optional[str] = None
    units_preference: Optional[str] = None
    onboarding_completed: Optional[bool] = None
    travel_profile_type: Optional[str] = None


class BoardingPassIngestReq(BaseModel):
    barcode_string: str
    image_base64: Optional[str] = None
    original_filename: Optional[str] = None
    visible_text: Optional[str] = None
    enrich: bool = True


class SegmentUpdate(BaseModel):
    airline_name: Optional[str] = None
    airline_iata: Optional[str] = None
    flight_number: Optional[str] = None
    booking_reference: Optional[str] = None
    passenger_name: Optional[str] = None
    ticket_number: Optional[str] = None
    pnr: Optional[str] = None
    departure_airport_iata: Optional[str] = None
    arrival_airport_iata: Optional[str] = None
    departure_city_name: Optional[str] = None
    arrival_city_name: Optional[str] = None
    departure_time_utc: Optional[str] = None
    arrival_time_utc: Optional[str] = None
    departure_time_local: Optional[str] = None
    arrival_time_local: Optional[str] = None
    seat_number: Optional[str] = None
    terminal_departure: Optional[str] = None
    terminal_arrival: Optional[str] = None
    gate: Optional[str] = None


class ManualFlightReq(BaseModel):
    airline_iata: str
    flight_number: str
    departure_airport_iata: str
    arrival_airport_iata: str
    flight_date: str  # YYYY-MM-DD
    seat_number: Optional[str] = None
    booking_reference: Optional[str] = None
    passenger_name: Optional[str] = None
    ticket_number: Optional[str] = None
    flight_duration_minutes: Optional[int] = None
    aircraft_type: Optional[str] = None
    local_departure_time: Optional[str] = None


# ---------- Helpers ----------

async def _auth(request: Request) -> dict:
    return await get_current_user(request)


def _canonical_hash(segment: dict) -> str:
    key = "|".join([
        (segment.get("airline_iata") or "").upper(),
        (segment.get("flight_number") or "").upper(),
        (segment.get("departure_airport_iata") or "").upper(),
        (segment.get("arrival_airport_iata") or "").upper(),
        (segment.get("departure_time_utc") or segment.get("flight_date") or "")[:10],
    ])
    return hashlib.sha256(key.encode()).hexdigest()



def _normalize_from_bcbp_leg(leg: dict, user_id: str, artifact_id: str, confidence: float, sequence_index: int = 0) -> dict:
    """Turn a parsed BCBP leg into a parsed_segment doc."""
    dep_iata = leg.get("from_airport")
    arr_iata = leg.get("to_airport")
    airline_iata = leg.get("operating_carrier")
    flight_number_raw = leg.get("flight_number")
    airline_meta = lookup_airline(airline_iata)
    dep_meta = lookup_airport(dep_iata)
    arr_meta = lookup_airport(arr_iata)

    return {
        "id": str(uuid.uuid4()),
        "artifact_id": artifact_id,
        "user_id": user_id,
        "source_type": "boarding_pass_barcode",
        "sequence_index": sequence_index,
        "airline_name": (airline_meta or {}).get("name"),
        "airline_iata": airline_iata,
        "flight_number": f"{airline_iata}{flight_number_raw}" if airline_iata and flight_number_raw else flight_number_raw,
        "booking_reference": leg.get("pnr"),
        "pnr": leg.get("pnr"),
        "passenger_name": leg.get("passenger_name"),
        "ticket_number": None,
        "departure_airport_iata": dep_iata,
        "arrival_airport_iata": arr_iata,
        "departure_city_name": (dep_meta or {}).get("city"),
        "arrival_city_name": (arr_meta or {}).get("city"),
        "flight_date": leg.get("flight_date_iso"),
        "departure_time_local": None,
        "arrival_time_local": None,
        "departure_time_utc": None,
        "arrival_time_utc": None,
        "seat_number": leg.get("seat_number"),
        "terminal_departure": None,
        "terminal_arrival": None,
        "gate": None,
        "confidence_score": confidence,
        "needs_review": True,
        "raw_json": {"leg": leg},
        "enrichment": None,
        "status": "pending_review",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


def _apply_enrichment(segment: dict, enrichment: dict) -> dict:
    if not enrichment:
        return segment
    dep = enrichment.get("departure") or {}
    arr = enrichment.get("arrival") or {}
    # Only fill airport IATA when the source didn't already provide one, so
    # barcode/PDF/manual-entered airports are never silently overwritten.
    if not segment.get("departure_airport_iata"):
        segment["departure_airport_iata"] = dep.get("airport_iata")
    if not segment.get("arrival_airport_iata"):
        segment["arrival_airport_iata"] = arr.get("airport_iata")
    segment["departure_time_utc"] = dep.get("scheduled_time_utc") or segment.get("departure_time_utc")
    segment["arrival_time_utc"] = arr.get("scheduled_time_utc") or segment.get("arrival_time_utc")
    segment["terminal_departure"] = dep.get("terminal") or segment.get("terminal_departure")
    segment["terminal_arrival"] = arr.get("terminal") or segment.get("terminal_arrival")
    segment["gate"] = dep.get("gate") or segment.get("gate")
    segment["departure_city_name"] = segment.get("departure_city_name") or dep.get("city")
    segment["arrival_city_name"] = segment.get("arrival_city_name") or arr.get("city")
    segment["airline_name"] = enrichment.get("airline_name") or segment.get("airline_name")
    if enrichment.get("airline_iata"):
        segment["airline_iata"] = enrichment.get("airline_iata")
    segment["enrichment"] = enrichment
    segment["status_text"] = enrichment.get("status")
    if segment.get("departure_time_utc") and segment.get("arrival_time_utc"):
        try:
            dep_dt = datetime.fromisoformat(segment["departure_time_utc"].replace("Z", "+00:00"))
            arr_dt = datetime.fromisoformat(segment["arrival_time_utc"].replace("Z", "+00:00"))
            if arr_dt > dep_dt:
                segment["flight_duration_minutes"] = int((arr_dt - dep_dt).total_seconds() / 60)
        except (ValueError, TypeError):
            pass
    return segment


def _decorate_segment(segment: dict) -> dict:
    dep = lookup_airport(segment.get("departure_airport_iata")) or {}
    arr = lookup_airport(segment.get("arrival_airport_iata")) or {}
    if dep:
        segment["departure_country_code"] = dep.get("country")
        segment["departure_lat"] = dep.get("lat")
        segment["departure_lng"] = dep.get("lng")
        segment["departure_timezone"] = dep.get("tz")
        segment["departure_city_name"] = segment.get("departure_city_name") or dep.get("city")
    if arr:
        segment["arrival_country_code"] = arr.get("country")
        segment["arrival_lat"] = arr.get("lat")
        segment["arrival_lng"] = arr.get("lng")
        segment["arrival_timezone"] = arr.get("tz")
        segment["arrival_city_name"] = segment.get("arrival_city_name") or arr.get("city")
    segment["distance_km"] = segment.get("distance_km") or segment_distance_km(segment)
    if not segment.get("flight_duration_minutes") and segment.get("distance_km"):
        # Free-first fallback: great-circle distance at 800 km/h plus taxi/approach buffer.
        segment["flight_duration_minutes"] = int(round((segment["distance_km"] / 800) * 60 + 20))
    segment["duration_source"] = segment_duration_source(segment)
    segment["time_confidence"] = "scheduled" if segment.get("departure_time_utc") and segment.get("arrival_time_utc") else "estimated"
    if segment.get("departure_airport_iata") and segment.get("arrival_airport_iata"):
        segment["route"] = f"{segment['departure_airport_iata']}-{segment['arrival_airport_iata']}"
    return segment


def _segment_auto_confirmable(segment: dict) -> bool:
    required = [
        segment.get("airline_iata"),
        segment.get("flight_number"),
        segment.get("departure_airport_iata"),
        segment.get("arrival_airport_iata"),
        segment.get("flight_date") or segment.get("departure_time_utc"),
    ]
    return all(required) and float(segment.get("confidence_score") or 0) >= 0.9


async def _confirm_segment_doc(seg: dict, user_id: str, recompute: bool = True) -> tuple[dict, bool]:
    supabase = get_supabase()
    canonical = _canonical_hash(seg)
    
    # Check if this exact hash already exists and is confirmed
    res_dup = supabase.table("flights").select("*").eq("user_id", user_id).eq("canonical_hash", canonical).eq("status", "confirmed").execute()
    existing_dup = res_dup.data[0] if res_dup.data else None

    status = "duplicate" if existing_dup else "confirmed"
    
    # Update the existing parsed segment in place!
    updates = {
        "canonical_hash": canonical,
        "is_duplicate_of": existing_dup["id"] if existing_dup else None,
        "status": status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    # We also apply any manual edits the user made before confirming
    editable_fields = [
        "airline_name", "airline_iata", "flight_number", "booking_reference", 
        "pnr", "passenger_name", "ticket_number", "departure_airport_iata",
        "arrival_airport_iata", "departure_city_name", "arrival_city_name",
        "departure_time_local", "arrival_time_local", "departure_time_utc",
        "arrival_time_utc", "flight_date", "flight_duration_minutes",
        "seat_number", "terminal_departure", "terminal_arrival", "gate"
    ]
    for f in editable_fields:
        if f in seg:
            updates[f] = seg[f]
            
    res_upd = supabase.table("flights").update(updates).eq("id", seg["id"]).eq("user_id", user_id).execute()
    confirmed = res_upd.data[0] if res_upd.data else seg
    
    if recompute:
        await _recompute_for_user(user_id)
        
    return confirmed, bool(existing_dup)


async def _recompute_for_user(user_id: str) -> dict:
    supabase = get_supabase()
    res = supabase.table("flights").select("*").eq("user_id", user_id).eq("status", "confirmed").order("created_at").execute()
    raw_confirmed = res.data
    
    confirmed = []
    seen_hashes = set()
    duplicates_to_demote = []
    
    for s in raw_confirmed:
        h = _canonical_hash(s)
        if h in seen_hashes:
            duplicates_to_demote.append(s["id"])
        else:
            seen_hashes.add(h)
            confirmed.append(s)
            if s.get("canonical_hash") != h:
                supabase.table("flights").update({"canonical_hash": h}).eq("id", s["id"]).execute()
            
    if duplicates_to_demote:
        # Supabase Python doesn't have an easy update_many by id list out of the box, we can loop or use .in_()
        for dup_id in duplicates_to_demote:
            supabase.table("flights").update({"status": "duplicate"}).eq("id", dup_id).execute()

    prof_res = supabase.table("profiles").select("*").eq("id", user_id).execute()
    profile = prof_res.data[0] if prof_res.data else {}
    
    trips, stays = derive_trips_and_stays(user_id, confirmed, profile.get("home_airport_iata"))
    monthly = compute_monthly_stats(user_id, confirmed, stays)
    
    snapshot_data = {
        "user_id": user_id,
        "year": 0,  # 0 indicates 'all' years
        "dashboard": {
            "trips": trips,
            "city_stays": stays,
            "monthly_stats": monthly
        }
    }
    # upsert on (user_id, year)
    supabase.table("analytics_snapshots").upsert(snapshot_data, on_conflict="user_id,year").execute()
    
    return {"trips": len(trips), "city_stays": len(stays), "monthly_stats": len(monthly)}


# ---------- Routes: auth ----------

@api.get("/")
async def root():
    return {"name": "Travel Ledger API", "status": "ok"}


def _frontend_url() -> str:
    return os.environ.get("FRONTEND_URL", "http://localhost:3001").rstrip("/")


def _google_redirect_uri(request: Request) -> str:
    return os.environ.get("GOOGLE_REDIRECT_URI") or str(request.url_for("auth_google_callback"))


def _set_session_cookie(response: Response, token: str) -> None:
    secure = session_cookie_secure()
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=7 * 24 * 3600,
        httponly=True,
        secure=secure,
        samesite="none" if secure else "lax",
        path="/",
    )


@api.get("/auth/google/start")
async def auth_google_start(request: Request):
    state = new_oauth_state()
    redirect_uri = _google_redirect_uri(request)
    auth_url = build_google_auth_url(state, redirect_uri)
    response = RedirectResponse(auth_url, status_code=302)
    response.set_cookie(
        key=OAUTH_STATE_COOKIE_NAME,
        value=state,
        max_age=10 * 60,
        httponly=True,
        secure=session_cookie_secure(),
        samesite="lax",
        path="/",
    )
    return response


@api.get("/auth/google/callback", name="auth_google_callback")
async def auth_google_callback(request: Request, code: str = "", state: str = "", error: str = ""):
    frontend = _frontend_url()
    if error:
        return RedirectResponse(f"{frontend}/auth/callback?error={error}", status_code=302)
    expected_state = request.cookies.get(OAUTH_STATE_COOKIE_NAME)
    if not expected_state or not state or not secrets.compare_digest(expected_state, state):
        return RedirectResponse(f"{frontend}/auth/callback?error=state", status_code=302)
    try:
        profile_data = await exchange_google_code(code, _google_redirect_uri(request))
        user = await upsert_user(db, profile_data)
        session_token = f"sess_{uuid.uuid4().hex}{uuid.uuid4().hex}"
        await store_session(db, user["user_id"], session_token)
        response = RedirectResponse(f"{frontend}/auth/callback", status_code=302)
        _set_session_cookie(response, session_token)
        response.delete_cookie(OAUTH_STATE_COOKIE_NAME, path="/")
        return response
    except HTTPException as e:
        logger.warning("Google auth callback failed: %s", e.detail)
        return RedirectResponse(f"{frontend}/auth/callback?error=signin", status_code=302)


@api.post("/auth/session")
async def auth_session(payload: SessionExchangeReq, response: Response):
    raise HTTPException(status_code=410, detail="Legacy auth session exchange has been replaced by Google OAuth")


@api.get("/auth/me")
async def auth_me(user: dict = Depends(_auth)):
    supabase = get_supabase()
    res = supabase.table("profiles").select("*").eq("id", user["user_id"]).execute()
    profile = res.data[0] if res.data else {}
    return {"user": user, "profile": profile}


@api.post("/auth/logout")
async def auth_logout(request: Request, response: Response):
    # Handled by frontend via supabase.auth.signOut()
    return {"ok": True}


# ---------- Routes: profile ----------

@api.get("/profile")
async def get_profile(user: dict = Depends(_auth)):
    supabase = get_supabase()
    res = supabase.table("profiles").select("*").eq("id", user["user_id"]).execute()
    return res.data[0] if res.data else {}


@api.patch("/profile")
async def update_profile(payload: ProfileUpdate, user: dict = Depends(_auth)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if payload.home_airport_iata is not None:
        updates["home_airport_iata"] = payload.home_airport_iata.upper() if payload.home_airport_iata else None
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    supabase = get_supabase()
    supabase.table("profiles").update(updates).eq("id", user["user_id"]).execute()
    
    res = supabase.table("profiles").select("*").eq("id", user["user_id"]).execute()
    profile = res.data[0] if res.data else {}
    # If home airport changed, recompute derived data
    if "home_airport_iata" in updates:
        await _recompute_for_user(user["user_id"])
    return profile


# ---------- Routes: airports / airlines reference ----------

# In-process TTL cache for /flights/lookup — conserves RapidAPI free-tier quota
_FLIGHT_LOOKUP_CACHE: dict[str, tuple[float, dict]] = {}
_FLIGHT_LOOKUP_TTL_SECS = 600  # 10 minutes


def _lookup_cache_get(key: str) -> Optional[dict]:
    import time
    entry = _FLIGHT_LOOKUP_CACHE.get(key)
    if not entry:
        return None
    ts, value = entry
    if time.time() - ts > _FLIGHT_LOOKUP_TTL_SECS:
        _FLIGHT_LOOKUP_CACHE.pop(key, None)
        return None
    return value


def _lookup_cache_set(key: str, value: dict) -> None:
    import time
    # Simple cap to avoid unbounded growth
    if len(_FLIGHT_LOOKUP_CACHE) > 500:
        _FLIGHT_LOOKUP_CACHE.clear()
    _FLIGHT_LOOKUP_CACHE[key] = (time.time(), value)


@api.get("/airports")
async def airports_search(q: str = "", limit: int = 10):
    if not q:
        # return all as a simple list
        return list(AIRPORTS.values())[:limit]
    return search_airports(q, limit)


@api.get("/airlines")
async def airlines_list(q: str = "", limit: int = 20):
    if not q:
        return list(AIRLINES.values())[:limit]
    return search_airlines(q, limit)


@api.get("/flights/lookup")
async def flight_lookup(
    airline_iata: str,
    flight_number: str,
    date: str,
    user: dict = Depends(_auth),
):
    """Live flight lookup for the 'Fetch flight details' button in manual flow.

    Does NOT persist anything; returns what the enrichment provider knows about
    this flight on that date (plus a synthesized skeleton if enrichment fails).
    """
    airline_code = (airline_iata or "").upper()
    raw = (flight_number or "").strip()
    normalized = f"{airline_code}{raw.lstrip('0')}" if airline_code else raw
    airline_meta = lookup_airline(airline_code)

    cache_key = f"{normalized}|{date}"
    cached = _lookup_cache_get(cache_key)
    if cached is not None:
        return {**cached, "cached": True}

    enrichment = None
    if flight_status_client.enabled:
        enrichment = await flight_status_client.enrich_flight(normalized, date)
    skeleton = {
        "airline_iata": airline_code,
        "airline_name": (airline_meta or {}).get("name"),
        "flight_number": normalized,
        "flight_date": date,
        "departure_airport_iata": None,
        "arrival_airport_iata": None,
        "departure_city_name": None,
        "arrival_city_name": None,
        "departure_time_utc": None,
        "arrival_time_utc": None,
        "terminal_departure": None,
        "terminal_arrival": None,
        "gate": None,
        "status_text": None,
    }
    if enrichment:
        skeleton = _apply_enrichment(skeleton, enrichment)
    result = {
        "found": bool(enrichment),
        "provider": (enrichment or {}).get("provider"),
        "enrichment_enabled": flight_status_client.enabled,
        "flight": skeleton,
        "cached": False,
    }
    if enrichment:
        _lookup_cache_set(cache_key, {k: v for k, v in result.items() if k != "cached"})
    return result


# ---------- Routes: boarding pass ingestion ----------

@api.post("/boarding-pass/decode")
async def decode_only(payload: BoardingPassIngestReq):
    """Stateless decode endpoint — useful for 'preview before save'."""
    result = parse_bcbp(payload.barcode_string)
    return {
        "valid": result.valid,
        "confidence": result.confidence,
        "format_code": result.format_code,
        "number_of_legs": result.number_of_legs,
        "legs": result.legs,
        "error": result.error,
    }


@api.post("/boarding-pass/ingest")
async def ingest_boarding_pass(payload: BoardingPassIngestReq, user: dict = Depends(_auth)):
    """Decode + enrich + store an artifact + create a parsed_segment (pending review)."""
    result = parse_bcbp(payload.barcode_string)
    
    # Image/OCR text fallback for e-tickets uploaded as images
    if not result.valid:
        candidate_text = payload.visible_text or payload.barcode_string
        if candidate_text and len(candidate_text.strip()) > 15:
            from services.pdf_parser import parse_ticket_text
            text_result = parse_ticket_text(candidate_text)
            if text_result.get("valid") or text_result.get("confidence", 0) >= 0.4:
                artifact_id = str(uuid.uuid4())
                artifact_doc = {
                    "id": artifact_id,
                    "user_id": user["user_id"],
                    "source_type": "pdf_eticket",
                    "original_filename": payload.original_filename or "ticket_image.png",
                    "storage_path": None,
                    "mime_type": "image/*" if payload.image_base64 else "text/plain",
                    "barcode_raw": payload.barcode_string,
                    "image_base64": payload.image_base64,
                    "extracted_text": candidate_text,
                    "parser_status": "parsed" if text_result.get("valid") else "needs_review",
                    "parse_confidence": text_result.get("confidence", 0.0),
                    "parser_method": "ocr_text_regex",
                    "parser_error": text_result.get("error"),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
                await db.artifacts.insert_one(artifact_doc)
                artifact_doc.pop("_id", None)

                segments = []
                confirmed_segments = []
                duplicate_count = 0
                enrichment_applied = False
                
                for idx, seg_fields in enumerate(text_result.get("segments") or []):
                    dep_meta = lookup_airport(seg_fields.get("from_airport"))
                    arr_meta = lookup_airport(seg_fields.get("to_airport"))
                    segment = {
                        "id": str(uuid.uuid4()),
                        "artifact_id": artifact_id,
                        "user_id": user["user_id"],
                        "source_type": "pdf_eticket",
                        "sequence_index": seg_fields.get("sequence_index", idx),
                        "airline_name": seg_fields.get("airline_name"),
                        "airline_iata": seg_fields.get("airline_iata"),
                        "flight_number": seg_fields.get("flight_number"),
                        "booking_reference": seg_fields.get("pnr"),
                        "pnr": seg_fields.get("pnr"),
                        "passenger_name": seg_fields.get("passenger_name"),
                        "ticket_number": seg_fields.get("ticket_number"),
                        "departure_airport_iata": seg_fields.get("from_airport"),
                        "arrival_airport_iata": seg_fields.get("to_airport"),
                        "departure_city_name": seg_fields.get("from_city") or (dep_meta or {}).get("city"),
                        "arrival_city_name": seg_fields.get("to_city") or (arr_meta or {}).get("city"),
                        "flight_date": seg_fields.get("flight_date_iso"),
                        "departure_time_local": None,
                        "arrival_time_local": None,
                        "departure_time_utc": None,
                        "arrival_time_utc": None,
                        "seat_number": seg_fields.get("seat_number"),
                        "terminal_departure": None,
                        "terminal_arrival": None,
                        "gate": None,
                        "confidence_score": text_result.get("confidence", 0.0),
                        "needs_review": True,
                        "raw_json": {"image_ocr_parse": seg_fields, "text_length": text_result.get("text_length")},
                        "enrichment": None,
                        "status": "pending_review",
                        "created_at": datetime.now(timezone.utc).isoformat(),
                    }
                    enrichment = None
                    if segment.get("flight_number") and segment.get("flight_date"):
                        enrichment = await flight_status_client.enrich_flight(segment["flight_number"], segment["flight_date"])
                        if enrichment:
                            segment = _apply_enrichment(segment, enrichment)
                            enrichment_applied = True
                    segment = _decorate_segment(segment)
                    await db.parsed_segments.insert_one(segment)
                    segment.pop("_id", None)
                    segments.append(segment)

                artifact_resp = {k: v for k, v in artifact_doc.items() if k != "image_base64"}
                return {
                    "artifact": artifact_resp,
                    "segment": segments[0] if segments else None,
                    "segments": segments,
                    "confirmed_segments": confirmed_segments,
                    "auto_confirmed": len(confirmed_segments),
                    "duplicates": duplicate_count,
                    "enrichment_applied": enrichment_applied,
                    "enrichment_enabled": flight_status_client.enabled,
                }

    artifact_id = str(uuid.uuid4())
    artifact_doc = {
        "id": artifact_id,
        "user_id": user["user_id"],
        "source_type": "boarding_pass_barcode",
        "original_filename": payload.original_filename,
        "storage_path": None,
        "mime_type": "image/*" if payload.image_base64 else "text/plain",
        "barcode_raw": payload.barcode_string,
        "image_base64": payload.image_base64,
        "extracted_text": payload.barcode_string,
        "parser_status": "parsed" if result.valid else "needs_review",
        "parse_confidence": result.confidence,
        "parser_method": "iata_bcbp_m1",
        "parser_error": result.error,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.artifacts.insert_one(artifact_doc)
    artifact_doc.pop("_id", None)

    segments = []
    confirmed_segments = []
    duplicate_count = 0
    enrichment_applied = False
    legs = result.legs or [{}]
    for idx, leg in enumerate(legs):
        segment = _normalize_from_bcbp_leg(leg, user["user_id"], artifact_id, result.confidence, idx)
        enrichment = None
        if payload.enrich and segment.get("flight_number") and segment.get("flight_date"):
            enrichment = await flight_status_client.enrich_flight(
                segment["flight_number"], segment["flight_date"]
            )
            if enrichment:
                segment = _apply_enrichment(segment, enrichment)
                enrichment_applied = True
        segment = _decorate_segment(segment)
        await db.parsed_segments.insert_one(segment)
        segment.pop("_id", None)
        segments.append(segment)
        # Tickets/barcodes intentionally remain pending until the user reviews
        # extracted fields. OCR and airline PDFs are too variable to auto-save
        # safely, even when confidence is high.
    # Strip raw image from response to keep it small.
    artifact_resp = {k: v for k, v in artifact_doc.items() if k != "image_base64"}
    return {
        "artifact": artifact_resp,
        "segment": segments[0] if segments else None,
        "segments": segments,
        "confirmed_segments": confirmed_segments,
        "auto_confirmed": len(confirmed_segments),
        "duplicates": duplicate_count,
        "enrichment_applied": enrichment_applied,
        "enrichment_enabled": flight_status_client.enabled,
    }


@api.post("/flights/manual")
async def create_manual(payload: ManualFlightReq, user: dict = Depends(_auth)):
    """Create a flight segment from manual input (no barcode)."""
    airline = lookup_airline(payload.airline_iata)
    dep = lookup_airport(payload.departure_airport_iata)
    arr = lookup_airport(payload.arrival_airport_iata)
    artifact_id = str(uuid.uuid4())
    artifact_doc = {
        "id": artifact_id,
        "user_id": user["user_id"],
        "source_type": "manual_entry",
        "original_filename": None,
        "storage_path": None,
        "mime_type": None,
        "barcode_raw": None,
        "image_base64": None,
        "extracted_text": None,
        "parser_status": "parsed",
        "parse_confidence": 1.0,
        "parser_method": "manual",
        "parser_error": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.artifacts.insert_one(artifact_doc)
    artifact_doc.pop("_id", None)

    flight_number = f"{payload.airline_iata.upper()}{payload.flight_number.lstrip('0')}"
    duration = payload.flight_duration_minutes or 90
    local_time = payload.local_departure_time or "09:00"

    dep_utc_str = None
    arr_utc_str = None
    if payload.flight_date:
        try:
            import zoneinfo
            dep_tz_name = (dep or {}).get("tz") or "UTC"
            naive_dt = datetime.strptime(f"{payload.flight_date}T{local_time}", "%Y-%m-%dT%H:%M")
            aware_dt = naive_dt.replace(tzinfo=zoneinfo.ZoneInfo(dep_tz_name))
            dep_utc_dt = aware_dt.astimezone(timezone.utc)
            dep_utc_str = dep_utc_dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")
            arr_utc_dt = dep_utc_dt + timedelta(minutes=duration)
            arr_utc_str = arr_utc_dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")
        except Exception:
            dep_utc_str = f"{payload.flight_date}T{local_time}:00.000Z"

    segment = {
        "id": str(uuid.uuid4()),
        "artifact_id": artifact_id,
        "user_id": user["user_id"],
        "airline_name": (airline or {}).get("name"),
        "airline_iata": payload.airline_iata.upper(),
        "flight_number": flight_number,
        "booking_reference": payload.booking_reference,
        "pnr": payload.booking_reference,
        "passenger_name": payload.passenger_name,
        "ticket_number": payload.ticket_number,
        "departure_airport_iata": payload.departure_airport_iata.upper(),
        "arrival_airport_iata": payload.arrival_airport_iata.upper(),
        "departure_city_name": (dep or {}).get("city"),
        "arrival_city_name": (arr or {}).get("city"),
        "flight_date": payload.flight_date,
        "departure_time_local": local_time,
        "arrival_time_local": None,
        "departure_time_utc": dep_utc_str,
        "arrival_time_utc": arr_utc_str,
        "flight_duration_minutes": duration,
        "aircraft_type": payload.aircraft_type,
        "seat_number": payload.seat_number,
        "terminal_departure": None,
        "terminal_arrival": None,
        "gate": None,
        "confidence_score": 0.92,
        "needs_review": False,
        "raw_json": None,
        "enrichment": None,
        "status": "parsed",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    enrichment = await flight_status_client.enrich_flight(flight_number, payload.flight_date)
    if enrichment:
        segment = _apply_enrichment(segment, enrichment)
    segment = _decorate_segment(segment)
    await db.parsed_segments.insert_one(segment)
    segment.pop("_id", None)
    confirmed, duplicate = await _confirm_segment_doc(segment, user["user_id"], recompute=True)
    segment["status"] = confirmed.get("status")
    return {
        "artifact": artifact_doc,
        "segment": segment,
        "segments": [segment],
        "confirmed_segments": [confirmed],
        "auto_confirmed": 1,
        "duplicates": 1 if duplicate else 0,
        "enrichment_applied": enrichment is not None,
    }


# ---------- Routes: PDF e-ticket ingestion ----------

from fastapi import File, UploadFile


@api.post("/pdf/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    user: dict = Depends(_auth),
):
    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="Empty file")
    result = parse_pdf_ticket(pdf_bytes)
    fields = result.get("fields") or {}
    artifact_id = str(uuid.uuid4())
    artifact_doc = {
        "id": artifact_id,
        "user_id": user["user_id"],
        "source_type": "pdf_eticket",
        "original_filename": file.filename,
        "storage_path": None,
        "mime_type": file.content_type or "application/pdf",
        "barcode_raw": None,
        "image_base64": None,
        "extracted_text": None,  # intentionally not persisting raw text
        "parser_status": "parsed" if result.get("valid") else "needs_review",
        "parse_confidence": result.get("confidence", 0.0),
        "parser_method": "pypdf_regex",
        "parser_error": result.get("error"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.artifacts.insert_one(artifact_doc)
    artifact_doc.pop("_id", None)

    segments = []
    confirmed_segments = []
    duplicate_count = 0
    enrichment_applied = False
    for idx, seg_fields in enumerate(result.get("segments") or [fields]):
        dep_meta = lookup_airport(seg_fields.get("from_airport"))
        arr_meta = lookup_airport(seg_fields.get("to_airport"))
        segment = {
            "id": str(uuid.uuid4()),
            "artifact_id": artifact_id,
            "user_id": user["user_id"],
            "source_type": "pdf_eticket",
            "sequence_index": seg_fields.get("sequence_index", idx),
            "airline_name": seg_fields.get("airline_name"),
            "airline_iata": seg_fields.get("airline_iata"),
            "flight_number": seg_fields.get("flight_number"),
            "booking_reference": seg_fields.get("pnr"),
            "pnr": seg_fields.get("pnr"),
            "passenger_name": seg_fields.get("passenger_name"),
            "ticket_number": seg_fields.get("ticket_number"),
            "departure_airport_iata": seg_fields.get("from_airport"),
            "arrival_airport_iata": seg_fields.get("to_airport"),
            "departure_city_name": seg_fields.get("from_city") or (dep_meta or {}).get("city"),
            "arrival_city_name": seg_fields.get("to_city") or (arr_meta or {}).get("city"),
            "flight_date": seg_fields.get("flight_date_iso"),
            "departure_time_local": None,
            "arrival_time_local": None,
            "departure_time_utc": None,
            "arrival_time_utc": None,
            "seat_number": seg_fields.get("seat_number"),
            "terminal_departure": None,
            "terminal_arrival": None,
            "gate": None,
            "confidence_score": result.get("confidence", 0.0),
            "needs_review": True,
            "raw_json": {"pdf_parse": seg_fields, "text_length": result.get("text_length")},
            "enrichment": None,
            "status": "pending_review",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        enrichment = None
        if segment.get("flight_number") and segment.get("flight_date"):
            enrichment = await flight_status_client.enrich_flight(segment["flight_number"], segment["flight_date"])
            if enrichment:
                segment = _apply_enrichment(segment, enrichment)
                enrichment_applied = True
        segment = _decorate_segment(segment)
        await db.parsed_segments.insert_one(segment)
        segment.pop("_id", None)
        segments.append(segment)
        # Force review before confirmation for imported PDFs.
    return {
        "artifact": artifact_doc,
        "segment": segments[0] if segments else None,
        "segments": segments,
        "confirmed_segments": confirmed_segments,
        "auto_confirmed": len(confirmed_segments),
        "duplicates": duplicate_count,
        "enrichment_applied": enrichment_applied,
        "parse_confidence": result.get("confidence"),
    }


# ---------- Routes: artifacts ----------

@api.get("/artifacts")
async def list_artifacts(user: dict = Depends(_auth)):
    items = await db.artifacts.find(
        {"user_id": user["user_id"]},
        {"_id": 0, "image_base64": 0},
    ).sort("created_at", -1).to_list(200)
    return items


@api.delete("/artifacts/{artifact_id}")
async def delete_artifact(artifact_id: str, user: dict = Depends(_auth)):
    # Collect related parsed segment ids first, so we can cascade into confirmed_segments.
    related = await db.parsed_segments.find(
        {"artifact_id": artifact_id, "user_id": user["user_id"]},
        {"_id": 0, "id": 1},
    ).to_list(100)
    related_ids = [r["id"] for r in related]
    if related_ids:
        await db.confirmed_segments.delete_many(
            {"source_parsed_segment_id": {"$in": related_ids}, "user_id": user["user_id"]}
        )
    await db.parsed_segments.delete_many({"artifact_id": artifact_id, "user_id": user["user_id"]})
    await db.artifacts.delete_one({"id": artifact_id, "user_id": user["user_id"]})
    await _recompute_for_user(user["user_id"])
    return {"ok": True}


# ---------- Routes: segments (review + confirm) ----------

@api.get("/segments/pending")
async def pending_segments(user: dict = Depends(_auth)):
    items = await db.parsed_segments.find(
        {"user_id": user["user_id"], "status": "pending_review"},
        {"_id": 0, "raw_json": 0},
    ).sort("created_at", -1).to_list(200)
    return items


@api.get("/segments/{segment_id}")
async def get_segment(segment_id: str, user: dict = Depends(_auth)):
    seg = await db.parsed_segments.find_one({"id": segment_id, "user_id": user["user_id"]}, {"_id": 0})
    if not seg:
        raise HTTPException(status_code=404, detail="Segment not found")
    return seg


@api.patch("/segments/{segment_id}")
async def patch_segment(segment_id: str, payload: SegmentUpdate, user: dict = Depends(_auth)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "airline_iata" in updates:
        updates["airline_iata"] = updates["airline_iata"].upper()
    for k in ("departure_airport_iata", "arrival_airport_iata"):
        if k in updates and updates[k]:
            updates[k] = updates[k].upper()
    res = await db.parsed_segments.update_one(
        {"id": segment_id, "user_id": user["user_id"]},
        {"$set": updates},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Segment not found")
    seg = await db.parsed_segments.find_one({"id": segment_id, "user_id": user["user_id"]}, {"_id": 0})
    return seg


@api.delete("/segments/{segment_id}")
async def reject_segment(segment_id: str, user: dict = Depends(_auth)):
    res = await db.parsed_segments.update_one(
        {"id": segment_id, "user_id": user["user_id"]},
        {"$set": {"status": "rejected"}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Segment not found")
    return {"ok": True}


@api.post("/segments/{segment_id}/confirm")
async def confirm_segment(segment_id: str, user: dict = Depends(_auth)):
    seg = await db.parsed_segments.find_one({"id": segment_id, "user_id": user["user_id"]}, {"_id": 0})
    if not seg:
        raise HTTPException(status_code=404, detail="Segment not found")

    confirmed, duplicate = await _confirm_segment_doc(seg, user["user_id"], recompute=True)
    return {"confirmed_segment": confirmed, "duplicate": duplicate}


# ---------- Routes: confirmed flights / trips / dashboard ----------

@api.get("/flights")
async def list_flights(user: dict = Depends(_auth)):
    items = await db.confirmed_segments.find(
        {"user_id": user["user_id"], "status": "confirmed"},
        {"_id": 0},
    ).sort("departure_time_utc", -1).to_list(1000)
    return items


@api.delete("/flights/{flight_id}")
async def delete_flight(flight_id: str, user: dict = Depends(_auth)):
    res = await db.confirmed_segments.delete_one({"id": flight_id, "user_id": user["user_id"]})
    await _recompute_for_user(user["user_id"])
    return {"ok": res.deleted_count == 1}


@api.patch("/flights/{flight_id}")
async def patch_flight(flight_id: str, payload: dict, user: dict = Depends(_auth)):
    updates = {k: v for k, v in payload.items() if k not in ("_id", "id", "user_id") and v is not None}
    if "airline_iata" in updates and updates["airline_iata"]:
        updates["airline_iata"] = updates["airline_iata"].upper()
    for k in ("departure_airport_iata", "arrival_airport_iata"):
        if k in updates and updates[k]:
            updates[k] = updates[k].upper()
            
    res = await db.confirmed_segments.update_one(
        {"id": flight_id, "user_id": user["user_id"]},
        {"$set": updates},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Flight not found")
        
    await _recompute_for_user(user["user_id"])
    flight = await db.confirmed_segments.find_one({"id": flight_id, "user_id": user["user_id"]}, {"_id": 0})
    return flight



@api.post("/local/delete-all")
async def delete_all_data(user: dict = Depends(_auth)):
    user_id = user["user_id"]
    await db.confirmed_segments.delete_many({"user_id": user_id})
    await db.parsed_segments.delete_many({"user_id": user_id})
    await db.artifacts.delete_many({"user_id": user_id})
    await db.trips.delete_many({"user_id": user_id})
    await db.city_stays.delete_many({"user_id": user_id})
    await db.monthly_stats.delete_many({"user_id": user_id})
    
    # Reset profile metadata
    now = datetime.now(timezone.utc).isoformat()
    await db.user_profiles.update_one(
        {"user_id": user_id},
        {"$set": {
            "home_city_name": None,
            "home_airport_iata": None,
            "home_country_code": None,
            "work_city_name": None,
            "onboarding_completed": False,
            "theme_preference": "dark",
            "units_preference": "metric",
            "updated_at": now,
        }},
        upsert=True
    )
    return {"ok": True}


@api.get("/trips")
async def list_trips(user: dict = Depends(_auth)):
    supabase = get_supabase()
    res = supabase.table("analytics_snapshots").select("dashboard").eq("user_id", user["user_id"]).eq("year", 0).execute()
    if not res.data:
        return []
    items = res.data[0]["dashboard"].get("trips", [])
    # Attach segments
    for t in items:
        if t.get("segment_ids"):
            segs_res = supabase.table("flights").select("*").in_("id", t["segment_ids"]).eq("user_id", user["user_id"]).execute()
            segs = segs_res.data if segs_res.data else []
            segs.sort(key=lambda s: s.get("departure_time_utc") or s.get("flight_date") or "")
            t["segments"] = segs
    return items


@api.get("/city-stays")
async def list_city_stays(user: dict = Depends(_auth)):
    supabase = get_supabase()
    res = supabase.table("analytics_snapshots").select("dashboard").eq("user_id", user["user_id"]).eq("year", 0).execute()
    if not res.data:
        return []
    return res.data[0]["dashboard"].get("city_stays", [])


@api.get("/dashboard")
async def dashboard(user: dict = Depends(_auth)):
    supabase = get_supabase()
    res = supabase.table("analytics_snapshots").select("dashboard").eq("user_id", user["user_id"]).eq("year", 0).execute()
    if not res.data:
        return compute_dashboard([], [], [], None)
    
    dash = res.data[0]["dashboard"]
    trips = dash.get("trips", [])
    stays = dash.get("city_stays", [])
    
    res_flights = supabase.table("flights").select("*").eq("user_id", user["user_id"]).eq("status", "confirmed").execute()
    confirmed = res_flights.data if res_flights.data else []
    
    prof_res = supabase.table("profiles").select("*").eq("id", user["user_id"]).execute()
    profile = prof_res.data[0] if prof_res.data else {}
    
    return compute_dashboard(confirmed, trips, stays, profile.get("home_airport_iata"))


@api.get("/wrapped")
async def wrapped(year: Optional[str] = None, user: dict = Depends(_auth)):
    selected_year = None
    if year and year != "all":
        try:
            selected_year = int(year)
        except ValueError:
            selected_year = datetime.now(timezone.utc).year
    elif not year:
        selected_year = datetime.now(timezone.utc).year

    supabase = get_supabase()
    res = supabase.table("analytics_snapshots").select("dashboard").eq("user_id", user["user_id"]).eq("year", 0).execute()
    dash = res.data[0]["dashboard"] if res.data else {}
    
    trips = dash.get("trips", [])
    stays = dash.get("city_stays", [])
    
    res_flights = supabase.table("flights").select("*").eq("user_id", user["user_id"]).eq("status", "confirmed").execute()
    confirmed = res_flights.data if res_flights.data else []
    
    prof_res = supabase.table("profiles").select("*").eq("id", user["user_id"]).execute()
    profile = prof_res.data[0] if prof_res.data else {}
    
    return compute_wrapped(confirmed, trips, stays, profile.get("home_airport_iata"), selected_year)


@api.get("/map-data")
async def map_data(year: Optional[str] = None, user: dict = Depends(_auth)):
    parsed_year = None
    if year and year != "all":
        try:
            parsed_year = int(year)
        except ValueError:
            pass
            
    supabase = get_supabase()
    res_flights = supabase.table("flights").select("*").eq("user_id", user["user_id"]).eq("status", "confirmed").execute()
    confirmed = res_flights.data if res_flights.data else []
    
    prof_res = supabase.table("profiles").select("*").eq("id", user["user_id"]).execute()
    profile = prof_res.data[0] if prof_res.data else {}
    
    return compute_map_data(confirmed, profile.get("home_airport_iata"), parsed_year)


@api.get("/cities")
async def cities_summary(window: str = "all", user: dict = Depends(_auth)):
    """Aggregated view of cities the user has flown through.

    window: 'all' | '12m' | '6m' | '3m' | 'ytd'
    Returns per-city: days_spent, visit_count, flights_in, flights_out, is_home,
    last_visit. Useful for 'where have I been and how long' views.
    """
    from datetime import timedelta
    profile_res = get_supabase().table("profiles").select("*").eq("id", user["user_id"]).execute()
    profile = profile_res.data[0] if profile_res.data else {}
    home_iata = (profile.get("home_airport_iata") or "").upper() or None

    flights_res = get_supabase().table("flights").select("*").eq("user_id", user["user_id"]).eq("status", "confirmed").execute()
    confirmed = flights_res.data if flights_res.data else []
    
    snap_res = get_supabase().table("analytics_snapshots").select("dashboard").eq("user_id", user["user_id"]).eq("year", 0).execute()
    stays = snap_res.data[0]["dashboard"].get("city_stays", []) if snap_res.data else []

    now = datetime.now(timezone.utc)
    cutoff = None
    if window == "12m":
        cutoff = now - timedelta(days=365)
    elif window == "6m":
        cutoff = now - timedelta(days=182)
    elif window == "3m":
        cutoff = now - timedelta(days=92)
    elif window == "ytd":
        cutoff = datetime(now.year, 1, 1, tzinfo=timezone.utc)

    def _parse(v):
        if not v:
            return None
        try:
            d = datetime.fromisoformat(v.replace("Z", "+00:00"))
            if d.tzinfo is None:
                d = d.replace(tzinfo=timezone.utc)
            return d
        except (ValueError, TypeError):
            return None

    def _in_window(dt):
        return cutoff is None or (dt is not None and dt >= cutoff)

    from collections import defaultdict
    agg: dict[str, dict] = defaultdict(lambda: {
        "iata": None, "city": None, "country": None,
        "days_spent": 0.0, "minutes_spent": 0, "visits": 0,
        "flights_in": 0, "flights_out": 0,
        "first_visit": None, "last_visit": None,
        "is_home": False,
        "connected_to": set(),
    })

    for s in stays:
        start = _parse(s.get("start_time_utc"))
        end = _parse(s.get("end_time_utc"))
        if not start or not _in_window(start):
            # Partial-in-window: clip
            if start and end and cutoff and end > cutoff:
                start = max(start, cutoff)
            else:
                continue
        iata = s.get("airport_iata")
        if not iata:
            continue
        b = agg[iata]
        b["iata"] = iata
        b["city"] = s.get("city_name")
        b["country"] = s.get("country_code")
        minutes = s.get("duration_minutes", 0) or 0
        if cutoff and start and end and start < cutoff:
            minutes = max(0, int((end - cutoff).total_seconds() / 60))
        b["minutes_spent"] += minutes
        b["visits"] += 1
        if not b["first_visit"] or (start and start.isoformat() < b["first_visit"]):
            b["first_visit"] = start.isoformat() if start else None
        if not b["last_visit"] or (end and end.isoformat() > (b["last_visit"] or "")):
            b["last_visit"] = end.isoformat() if end else None
        b["is_home"] = bool(s.get("is_home"))

    for seg in confirmed:
        dep_dt = _parse(seg.get("departure_time_utc") or seg.get("flight_date"))
        if not _in_window(dep_dt):
            continue
        dep = seg.get("departure_airport_iata")
        arr = seg.get("arrival_airport_iata")
        if dep:
            b = agg[dep]
            b["iata"] = dep
            if not b["city"]:
                meta = lookup_airport(dep)
                b["city"] = (meta or {}).get("city", dep)
                b["country"] = (meta or {}).get("country")
            b["flights_out"] += 1
            if arr:
                b["connected_to"].add(arr)
        if arr:
            b = agg[arr]
            b["iata"] = arr
            if not b["city"]:
                meta = lookup_airport(arr)
                b["city"] = (meta or {}).get("city", arr)
                b["country"] = (meta or {}).get("country")
            b["flights_in"] += 1
            if dep:
                b["connected_to"].add(dep)

    result = []
    for iata, b in agg.items():
        if home_iata and iata == home_iata:
            b["is_home"] = True
        airport = lookup_airport(iata) or {}
        b["lat"] = airport.get("lat")
        b["lng"] = airport.get("lng")
        b["days_spent"] = round(b["minutes_spent"] / 60 / 24, 1)
        b["connected_to"] = sorted(list(b["connected_to"]))
        b["both_legs"] = b["flights_in"] > 0 and b["flights_out"] > 0
        # Flag missing data so the UI can nudge the user
        b["incomplete"] = b["minutes_spent"] == 0 and b["visits"] == 0 and (b["flights_in"] + b["flights_out"]) > 0
        result.append(b)

    result.sort(key=lambda x: -(x["minutes_spent"] or 0))
    return {"window": window, "home_airport_iata": home_iata, "cities": result}


@api.get("/monthly-stats")
async def monthly_stats(user: dict = Depends(_auth)):
    items = await db.monthly_stats.find({"user_id": user["user_id"]}, {"_id": 0}).sort("month_key", -1).to_list(60)
    return items


@api.post("/recompute")
async def recompute(user: dict = Depends(_auth)):
    return await _recompute_for_user(user["user_id"])


# ---------- Health ----------

@api.get("/health")
async def health():
    return {
        "ok": True,
        "airports_seeded": len(AIRPORTS),
        "airlines_seeded": len(AIRLINES),
        "flight_enrichment_enabled": flight_status_client.enabled,
    }


# ---------- App wiring ----------

app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "http://localhost:3001,http://localhost:3000").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
