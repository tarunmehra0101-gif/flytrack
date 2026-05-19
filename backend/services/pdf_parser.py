"""Lightweight PDF e-ticket parser.

Extracts flight details from common Indian OTA / airline e-tickets using
regex heuristics on PDF text. Deliberately conservative — if we cannot find
something confidently, we leave it empty and flag `needs_review=True`.

Designed to work for typical MakeMyTrip, Cleartrip, IndiGo, Air India,
Vistara, Emirates, and similar ticket layouts.
"""

from __future__ import annotations

import io
import logging
import re
from datetime import datetime
from typing import Optional

from pypdf import PdfReader

from .airports import AIRPORTS, lookup_airline, lookup_airport, search_airports

logger = logging.getLogger(__name__)

# Common airline IATA codes + names (kept in sync with airports.AIRLINES).
AIRLINE_NAME_TO_IATA = {
    "AIR INDIA": "AI", "INDIGO": "6E", "INDI GO": "6E", "VISTARA": "UK",
    "SPICEJET": "SG", "AKASA AIR": "QP", "AKASA": "QP",
    "EMIRATES": "EK", "ETIHAD": "EY", "QATAR AIRWAYS": "QR",
    "BRITISH AIRWAYS": "BA", "LUFTHANSA": "LH", "AIR FRANCE": "AF",
    "SINGAPORE AIRLINES": "SQ", "CATHAY PACIFIC": "CX", "THAI AIRWAYS": "TG",
    "UNITED AIRLINES": "UA", "AMERICAN AIRLINES": "AA", "DELTA AIR LINES": "DL",
    "TURKISH AIRLINES": "TK", "KLM": "KL", "SWISS": "LX",
}

FLIGHT_NUM_RE = re.compile(r"\b([A-Z0-9]{2})\s*[-]?\s*(\d{1,4}[A-Z]?)\b")
PNR_RE = re.compile(r"\b(?:PNR|Booking\s*Ref(?:erence)?|Reservation\s*Code|GDS\s*PNR)\s*[:\-]?\s*([A-Z0-9]{5,7})\b", re.IGNORECASE)
DATE_RE = re.compile(
    r"\b(\d{1,2})[\s\-/\.]*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[A-Za-z]*[\s\-/\.,]*\s*(\d{2,4})\b",
    re.IGNORECASE,
)
TIME_RE = re.compile(r"\b(\d{1,2}):(\d{2})\s*(AM|PM)?\b", re.IGNORECASE)
IATA_PAIR_RE = re.compile(r"\b([A-Z]{3})\s*(?:→|->|-|to|–|—|\s)\s*([A-Z]{3})\b")
SEAT_RE = re.compile(r"\bSeat(?:\s*No\.?)?\s*[:\-]?\s*([0-9]{1,3}[A-Z])\b", re.IGNORECASE)


def _extract_pdf_text(pdf_bytes: bytes) -> str:
    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
    except Exception as e:  # noqa: BLE001
        logger.warning("pypdf read failed: %s", e)
        return ""
    chunks = []
    for page in reader.pages:
        try:
            chunks.append(page.extract_text() or "")
        except Exception:  # noqa: BLE001
            continue
    return "\n".join(chunks)


def _detect_airline_iata(text: str) -> Optional[str]:
    upper = text.upper()
    for name, code in AIRLINE_NAME_TO_IATA.items():
        if name in upper:
            return code
    return None


def _normalize_date(raw: tuple[str, str, str]) -> Optional[str]:
    day, month, year = raw
    try:
        if len(year) == 2:
            year = "20" + year
        dt = datetime.strptime(f"{day} {month[:3]} {year}", "%d %b %Y")
        return dt.strftime("%Y-%m-%d")
    except ValueError:
        return None


def _find_airports(text: str) -> tuple[Optional[str], Optional[str]]:
    """Find two IATA codes indicating departure → arrival."""
    # First try explicit "XXX → YYY" pattern
    m = IATA_PAIR_RE.search(text)
    if m:
        a, b = m.group(1), m.group(2)
        if a in AIRPORTS and b in AIRPORTS:
            return a, b
    # Otherwise collect IATA candidates in order, pick first two that exist in our seed
    candidates = re.findall(r"\b([A-Z]{3})\b", text)
    hits: list[str] = []
    for c in candidates:
        if c in AIRPORTS and c not in hits:
            hits.append(c)
        if len(hits) >= 2:
            break
    if len(hits) >= 2:
        return hits[0], hits[1]
    # Fallback: match city names
    city_hits: list[str] = []
    upper = text.upper()
    for code, row in AIRPORTS.items():
        if row["city"].upper() in upper and code not in city_hits:
            city_hits.append(code)
        if len(city_hits) >= 2:
            break
    if len(city_hits) >= 2:
        return city_hits[0], city_hits[1]
    return None, None


def parse_pdf_ticket(pdf_bytes: bytes) -> dict:
    """Parse a PDF e-ticket and return a partial flight dict + confidence.

    Returns: {
      "text_length": int,
      "confidence": float 0..1,
      "fields": {airline_iata, flight_number, from_airport, to_airport,
                 flight_date_iso, pnr, seat_number, passenger_name, raw_flight_number}
      "valid": bool,
      "error": Optional[str]
    }
    """
    text = _extract_pdf_text(pdf_bytes)
    if not text or len(text) < 40:
        return {"text_length": len(text), "confidence": 0.0, "fields": {}, "valid": False, "error": "PDF has no readable text"}

    airline_iata = _detect_airline_iata(text)
    from_iata, to_iata = _find_airports(text)

    # Flight number — look for patterns near the airline code if we have it.
    flight_num = None
    flight_raw = None
    if airline_iata:
        m = re.search(rf"\b{airline_iata}\s*[-]?\s*(\d{{1,4}}[A-Z]?)\b", text)
        if m:
            flight_raw = m.group(1)
            flight_num = f"{airline_iata}{flight_raw}"
    if not flight_num:
        m = FLIGHT_NUM_RE.search(text)
        if m and m.group(1).isalpha():
            airline_iata = airline_iata or m.group(1)
            flight_raw = m.group(2)
            flight_num = f"{airline_iata}{flight_raw}"

    # Date
    date_iso = None
    for m in DATE_RE.finditer(text):
        date_iso = _normalize_date(m.groups())
        if date_iso:
            break

    # PNR
    pnr_m = PNR_RE.search(text)
    pnr = pnr_m.group(1).upper() if pnr_m else None

    # Seat
    seat_m = SEAT_RE.search(text)
    seat = seat_m.group(1).upper() if seat_m else None

    # Passenger name (heuristic: "Passenger Name: FOO BAR" or "Mr. FOO BAR")
    passenger_name = None
    pax_m = re.search(r"Passenger(?:\s*Name)?\s*[:\-]\s*([A-Z][A-Z\s\./\-]{3,40})", text, re.IGNORECASE)
    if pax_m:
        passenger_name = pax_m.group(1).strip()

    fields = {
        "airline_iata": airline_iata,
        "airline_name": (lookup_airline(airline_iata) or {}).get("name") if airline_iata else None,
        "flight_number": flight_num,
        "from_airport": from_iata,
        "to_airport": to_iata,
        "flight_date_iso": date_iso,
        "pnr": pnr,
        "seat_number": seat,
        "passenger_name": passenger_name,
        "from_city": (lookup_airport(from_iata) or {}).get("city") if from_iata else None,
        "to_city": (lookup_airport(to_iata) or {}).get("city") if to_iata else None,
    }

    # Multi-ticket PDFs often repeat the same compact pattern for each segment.
    # Keep this conservative: reuse the best route/date/PNR context unless the
    # text also exposes explicit IATA pairs.
    route_pairs = []
    for m in IATA_PAIR_RE.finditer(text):
        a, b = m.group(1), m.group(2)
        if a in AIRPORTS and b in AIRPORTS:
            route_pairs.append((a, b))
    if not route_pairs and from_iata and to_iata:
        route_pairs.append((from_iata, to_iata))

    seen_flights = []
    for m in FLIGHT_NUM_RE.finditer(text):
        code, num = m.group(1), m.group(2)
        if not code.isalpha() and not code[0].isdigit():
            continue
        candidate_airline = code if code.isalpha() else airline_iata
        if not candidate_airline:
            continue
        candidate = f"{candidate_airline}{num}"
        if candidate not in seen_flights:
            seen_flights.append(candidate)
    if flight_num and flight_num not in seen_flights:
        seen_flights.insert(0, flight_num)

    segments = []
    for idx, fn in enumerate(seen_flights or ([flight_num] if flight_num else [])):
        pair = route_pairs[idx] if idx < len(route_pairs) else (route_pairs[0] if route_pairs else (from_iata, to_iata))
        seg_airline = re.match(r"^([A-Z0-9]{2})", fn or "")
        seg_iata = seg_airline.group(1) if seg_airline else airline_iata
        seg_from, seg_to = pair
        segments.append({
            **fields,
            "airline_iata": seg_iata,
            "airline_name": (lookup_airline(seg_iata) or {}).get("name") if seg_iata else fields.get("airline_name"),
            "flight_number": fn,
            "from_airport": seg_from,
            "to_airport": seg_to,
            "from_city": (lookup_airport(seg_from) or {}).get("city") if seg_from else None,
            "to_city": (lookup_airport(seg_to) or {}).get("city") if seg_to else None,
            "sequence_index": idx,
        })
    if not segments:
        segments = [{**fields, "sequence_index": 0}]

    critical = [airline_iata, flight_num, from_iata, to_iata, date_iso]
    confidence = sum(1 for c in critical if c) / len(critical)
    return {
        "text_length": len(text),
        "confidence": round(confidence, 2),
        "fields": fields,
        "segments": segments,
        "valid": confidence >= 0.6,
        "error": None if confidence >= 0.6 else "Could not confidently extract all flight fields",
    }
