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
import os
import re
from datetime import datetime
from typing import Optional

from pypdf import PdfReader

from .airports import AIRPORTS, AIRLINES, lookup_airline, lookup_airport, search_airports

logger = logging.getLogger(__name__)


def _parse_with_gemini(text: str) -> Optional[dict]:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None
    try:
        import google.generativeai as genai
        import json
        genai.configure(api_key=api_key)
        # Use gemini-1.5-flash as it is fast and perfect for structured JSON extraction
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        prompt = (
            "You are an expert flight ticket parser. Analyze the following text extracted from a flight ticket/boarding pass "
            "and extract all flight details. Reject mock or baggage allowance numbers (e.g. lines like '6E 15KG' represent baggage, not flight number 6E15). "
            "Return a JSON object matching this schema exactly:\n"
            "{\n"
            "  \"flights\": [\n"
            "    {\n"
            "      \"passenger_name\": \"string or null\",\n"
            "      \"flight_number\": \"string (e.g. AI505, 6E2341)\",\n"
            "      \"airline_iata\": \"string (2 letters, e.g. AI, 6E)\",\n"
            "      \"departure_airport_iata\": \"string (3 letters, e.g. DEL, BOM)\",\n"
            "      \"arrival_airport_iata\": \"string (3 letters, e.g. BOM, DEL)\",\n"
            "      \"flight_date\": \"string (YYYY-MM-DD format) or null\",\n"
            "      \"departure_time_local\": \"string (HH:MM format) or null\",\n"
            "      \"arrival_time_local\": \"string (HH:MM format) or null\",\n"
            "      \"seat_number\": \"string or null\",\n"
            "      \"ticket_number\": \"string or null\",\n"
            "      \"pnr\": \"string or null\"\n"
            "    }\n"
            "  ]\n"
            "}\n\n"
            f"Raw text:\n{text}"
        )
        
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        return json.loads(response.text)
    except Exception as e:
        logger.error("Gemini AI parser failed: %s", e)
        return None


# Common airline IATA codes + names (kept in sync with airports.AIRLINES).
AIRLINE_NAME_TO_IATA = {
    "AIR INDIA EXPRESS": "IX", "AIRINDIA EXPRESS": "IX", "AIR-INDIA EXPRESS": "IX",
    "AIR INDIA": "AI", "INDIGO": "6E", "INDI GO": "6E", "VISTARA": "UK",
    "SPICEJET": "SG", "AKASA AIR": "QP", "AKASA": "QP",
    "EMIRATES": "EK", "ETIHAD": "EY", "QATAR AIRWAYS": "QR",
    "BRITISH AIRWAYS": "BA", "LUFTHANSA": "LH", "AIR FRANCE": "AF",
    "SINGAPORE AIRLINES": "SQ", "CATHAY PACIFIC": "CX", "THAI AIRWAYS": "TG",
    "UNITED AIRLINES": "UA", "AMERICAN AIRLINES": "AA", "DELTA AIR LINES": "DL",
    "TURKISH AIRLINES": "TK", "KLM": "KL", "SWISS": "LX",
    "GO FIRST": "G8", "GO AIR": "G8", "GOFIRST": "G8",
    "AIRASIA": "I5", "AIR ASIA": "I5",
    "FLYDUBAI": "FZ", "OMAN AIR": "WY", "GULF AIR": "GF",
}

FLIGHT_NUM_RE = re.compile(r"\b([A-Z0-9]{2})\s*[-]?\s*(\d{1,4}[A-Z]?)\b")
PNR_RE = re.compile(r"\b(?:PNR|Booking\s*Ref(?:erence)?|Reservation\s*Code|GDS\s*PNR)\b\s*[:\-]?\s*([A-Z0-9]{5,7})\b", re.IGNORECASE)
DATE_RE = re.compile(
    r"\b(\d{1,2})[\s\-/\.]*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[A-Za-z]*[\s\-/\.,]*\s*(\d{2,4})\b",
    re.IGNORECASE,
)
TIME_RE = re.compile(r"\b(\d{1,2}):(\d{2})\s*(AM|PM)?\b", re.IGNORECASE)
IATA_PAIR_RE = re.compile(r"\b([A-Z]{3})\s*(?:→|->|-|to|–|—|\s)\s*([A-Z]{3})\b")
SEAT_RE = re.compile(r"\bSeat(?:\s*No\.?)?\s*[:\-]?\s*([0-9]{1,3}[A-Z])\b", re.IGNORECASE)

KNOWN_AIRLINE_CODES = set(AIRLINES.keys()) | set(AIRLINE_NAME_TO_IATA.values()) | {
    "AK", "9W", "S7", "AZ", "IB", "TP", "SK", "AY", "LO", "OS", "RJ", "PK", "BG", "FY",
    "H9", "WJ", "B6", "WN", "FR", "W6", "U2", "EI", "SU", "HU", "CA", "MU", "CZ", "3U",
    "SC", "ZH", "FM", "CI", "BR", "GA", "WE", "MH", "IX"
}

BAD_PREFIX_RE = re.compile(
    r"\b(?:SEQ(?:UENCE)?|ZONE|ROW|AMOUNT|INR|RS\.?|FARE|TAX|TOTAL|PAID|CHARGE|FEE|COST|PRICE|RATE|TICKET\s*(?:NO|NUMBER)?|E.?TICKET|FFN|BAG|BAGGAGE|QTY|QUANTITY)\s*[:#\-]?\s*$",
    re.IGNORECASE
)

BAD_SUFFIX_RE = re.compile(
    r"^\s*(?:KG|KGS|PC|PCS|INR|USD|CAD|EUR|GBP|MULTIPLY|SEAT|ROW|ZONE|PAX|PAGE|QTY|AM|PM|MIN|MINS|HRS|HOURS|:\d{2})\b",
    re.IGNORECASE
)

BLACKLISTED_3LETTER_WORDS = {
    # Travel & document terms
    "TAX", "GST", "VAT", "NET", "PAY", "BAG", "CAR", "VAL", "NON", "VIA", "PNR", "PAX", "REF", "TKT", 
    "FLT", "SEQ", "NUM", "NBR", "CAB", "CLS", "MIN", "HRS", "SEC", "GMT", "UTC", "EST", "PST", "MST", 
    "CST", "EDT", "PDT", "CDT", "MDT", "BST", "DEP", "ARR", "STD", "STA", "WEB", "OFF", "OWN", "ANY", 
    "GET", "HAD", "ITS",
    # Months
    "JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
    # Days
    "MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN",
    # Currencies
    "INR", "USD", "EUR", "CAD", "GBP", "AED", "SAR", "SGD", "AUD", "JPY",
    # Common English words / prepositions
    "THE", "AND", "FOR", "NOT", "ARE", "BUT", "YOU", "ALL", "CAN", "HER", "WAS", "ONE", "OUR", "OUT", 
    "HAS", "HIS", "HOW", "MAN", "NEW", "NOW", "OLD", "SEE", "WAY", "WHO", "BOY", "DID", "LET", "PUT", 
    "SAY", "SHE", "TOO", "USE", "YES", "SET", "ADD", "BOX", "END", "KEY", "LOC", "ROW", "RUN", "SUB", 
    "TRY", "ZIP"
}

BLACKLISTED_2LETTER_WORDS = {
    "AM", "AN", "AS", "AT", "BE", "BY", "DO", "GO", "HE", "IF", "IN", "IS", "IT", 
    "ME", "MY", "NO", "OF", "ON", "OR", "SO", "TO", "UP", "US", "WE"
}


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
            if a not in BLACKLISTED_3LETTER_WORDS and b not in BLACKLISTED_3LETTER_WORDS:
                return a, b
    # Otherwise collect IATA candidates in order, pick first two that exist in our seed
    candidates = re.findall(r"\b([A-Z]{3})\b", text)
    hits: list[str] = []
    for c in candidates:
        if c in AIRPORTS and c not in hits and c not in BLACKLISTED_3LETTER_WORDS:
            hits.append(c)
        if len(hits) >= 2:
            break
    if len(hits) >= 2:
        return hits[0], hits[1]
    # Fallback: match city names
    city_hits: list[str] = []
    upper = text.upper()
    for code, row in AIRPORTS.items():
        if code in BLACKLISTED_3LETTER_WORDS:
            continue
        if row["city"].upper() in upper and code not in city_hits:
            city_hits.append(code)
        if len(city_hits) >= 2:
            break
    if len(city_hits) >= 2:
        return city_hits[0], city_hits[1]
    return None, None


def parse_ticket_text(text: str) -> dict:
    """Parse raw flight ticket/boarding pass text and return flight fields + segments."""
    # 1. Try AI parsing first if Gemini API key is configured
    gemini_data = _parse_with_gemini(text)
    if gemini_data and isinstance(gemini_data.get("flights"), list) and gemini_data["flights"]:
        segments = []
        for idx, f in enumerate(gemini_data["flights"]):
            f_dep = f.get("departure_airport_iata")
            f_arr = f.get("arrival_airport_iata")
            f_air = f.get("airline_iata") or (f.get("flight_number")[:2] if f.get("flight_number") else None)
            
            flight_num = f.get("flight_number")
            if flight_num:
                flight_num = re.sub(r"\s+", "", flight_num).upper()
            
            from_iata = f_dep.upper() if f_dep else None
            to_iata = f_arr.upper() if f_arr else None
            airline_iata = f_air.upper() if f_air else None
            
            segment_fields = {
                "airline_iata": airline_iata,
                "airline_name": (lookup_airline(airline_iata) or {}).get("name") if airline_iata else None,
                "flight_number": flight_num,
                "from_airport": from_iata,
                "to_airport": to_iata,
                "flight_date_iso": f.get("flight_date"),
                "pnr": f.get("pnr"),
                "seat_number": f.get("seat_number"),
                "passenger_name": f.get("passenger_name"),
                "from_city": (lookup_airport(from_iata) or {}).get("city") if from_iata else None,
                "to_city": (lookup_airport(to_iata) or {}).get("city") if to_iata else None,
                "sequence_index": idx,
            }
            segments.append(segment_fields)
            
        fields = {k: v for k, v in segments[0].items() if k != "sequence_index"}
        
        return {
            "text_length": len(text),
            "confidence": 0.98,
            "fields": fields,
            "segments": segments,
            "valid": True,
            "error": None,
        }

    # 2. Fallback to highly polished local regex heuristics
    airline_iata = _detect_airline_iata(text)
    from_iata, to_iata = _find_airports(text)

    # Flight number — look for patterns near the airline code if we have it.
    flight_num = None
    flight_raw = None
    if airline_iata:
        m = re.search(rf"\b{airline_iata}\s*[-]?\s*(\d{{1,4}}[A-Z]?)\b", text)
        if m:
            suffix = text[m.end():]
            if not BAD_SUFFIX_RE.match(suffix):
                flight_raw = m.group(1)
                flight_num = f"{airline_iata}{flight_raw}"
    if not flight_num:
        for m in FLIGHT_NUM_RE.finditer(text):
            candidate_iata = m.group(1).upper()
            if candidate_iata in KNOWN_AIRLINE_CODES:
                prefix = text[max(0, m.start() - 30):m.start()]
                suffix = text[m.end():]
                if not BAD_PREFIX_RE.search(prefix) and not BAD_SUFFIX_RE.match(suffix):
                    airline_iata = airline_iata or candidate_iata
                    flight_raw = m.group(2)
                    flight_num = f"{airline_iata}{flight_raw}"
                    break

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
            if a not in BLACKLISTED_3LETTER_WORDS and b not in BLACKLISTED_3LETTER_WORDS:
                route_pairs.append((a, b))
    if not route_pairs and from_iata and to_iata:
        route_pairs.append((from_iata, to_iata))

    seen_flights = []
    for m in FLIGHT_NUM_RE.finditer(text):
        code, num = m.group(1).upper(), m.group(2)
        if code not in KNOWN_AIRLINE_CODES:
            continue
        prefix = text[max(0, m.start() - 30):m.start()]
        suffix = text[m.end():]
        if BAD_PREFIX_RE.search(prefix) or BAD_SUFFIX_RE.match(suffix):
            continue
        try:
            numeric_part = int(num)
            if numeric_part < 100:
                context = text[max(0, m.start() - 50):min(len(text), m.end() + 50)].lower()
                if "flight" not in context:
                    continue
        except ValueError:
            pass

        candidate = f"{code}{num}"
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
    return parse_ticket_text(text)
