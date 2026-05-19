"""IATA BCBP (Bar Coded Boarding Pass) parser.

Decodes the mandatory section (and partial conditional section) of an IATA
BCBP string as produced by PDF417 or Aztec barcodes on airline boarding passes.

Format reference: IATA Resolution 792 (Passenger and Airport Data Interchange
Standards), 9-bit encoded boarding passes.

Layout (M1 mandatory section, per leg):
  'M'                1   Format Code
  <num_legs>         1   Number of legs encoded (1..9)
  passenger_name     20
  'E' / 'L'          1   Electronic ticket indicator
  PNR                7   Operating carrier PNR code
  from_airport       3   3-letter IATA code
  to_airport         3   3-letter IATA code
  carrier            3   Operating carrier (IATA designator, space-padded)
  flight_number      5   (4 digits + optional alpha suffix, space-padded)
  julian_date        3   Day of year (001..366)
  compartment        1   Compartment code (cabin class)
  seat_number        4   (e.g. 012A)
  check_in_sequence  5
  passenger_status   1
  field_size_hex     2   Size of conditional items for this leg (hex)
"""

from __future__ import annotations

from dataclasses import dataclass, asdict
from datetime import datetime, date, timezone
from typing import Optional


@dataclass
class BCBPLeg:
    passenger_name: Optional[str]
    pnr: Optional[str]
    from_airport: Optional[str]
    to_airport: Optional[str]
    operating_carrier: Optional[str]
    flight_number: Optional[str]
    julian_date: Optional[int]
    flight_date_iso: Optional[str]
    compartment: Optional[str]
    seat_number: Optional[str]
    check_in_sequence: Optional[str]
    passenger_status: Optional[str]


@dataclass
class BCBPResult:
    raw: str
    format_code: str
    number_of_legs: int
    legs: list
    valid: bool
    confidence: float
    error: Optional[str] = None


def _clean(s: str) -> Optional[str]:
    s = (s or "").strip()
    return s or None


def _julian_to_date(julian: int, reference_year: Optional[int] = None) -> Optional[str]:
    """Convert a Julian day-of-year into an ISO date (YYYY-MM-DD).

    Boarding passes only encode day-of-year, so we anchor to the current year.
    If the julian day would place the date more than 30 days in the past, we
    assume it belongs to the next year (common when scanning in late December).
    """
    if julian is None or julian < 1 or julian > 366:
        return None
    today = datetime.now(timezone.utc).date()
    year = reference_year or today.year
    try:
        d = date.fromordinal(date(year, 1, 1).toordinal() + julian - 1)
    except (ValueError, OverflowError):
        return None
    # Roll over if the boarding pass is clearly next year.
    days_back = (today - d).days
    if days_back > 60:
        try:
            d = date.fromordinal(date(year + 1, 1, 1).toordinal() + julian - 1)
        except (ValueError, OverflowError):
            pass
    return d.isoformat()


def parse_bcbp(raw: str) -> BCBPResult:
    """Parse an IATA BCBP string. Returns a structured result; never raises."""
    if not raw or not isinstance(raw, str):
        return BCBPResult(raw=raw or "", format_code="", number_of_legs=0, legs=[], valid=False, confidence=0.0, error="Empty barcode string")

    s = raw.strip()
    if len(s) < 60 or s[0] != "M":
        return BCBPResult(raw=s, format_code=s[:1], number_of_legs=0, legs=[], valid=False, confidence=0.0, error="Not an M1 boarding pass")

    try:
        num_legs = int(s[1])
    except ValueError:
        return BCBPResult(raw=s, format_code="M", number_of_legs=0, legs=[], valid=False, confidence=0.0, error="Invalid number of legs")

    idx = 2
    passenger_name = _clean(s[idx:idx + 20]); idx += 20

    legs: list[BCBPLeg] = []
    for _leg in range(num_legs):
        if idx + 35 > len(s):
            break
        electronic = s[idx:idx + 1]; idx += 1  # noqa: F841
        pnr = _clean(s[idx:idx + 7]); idx += 7
        from_airport = _clean(s[idx:idx + 3]); idx += 3
        to_airport = _clean(s[idx:idx + 3]); idx += 3
        carrier = _clean(s[idx:idx + 3]); idx += 3
        flight_number = _clean(s[idx:idx + 5]); idx += 5
        julian_raw = _clean(s[idx:idx + 3]); idx += 3
        compartment = _clean(s[idx:idx + 1]); idx += 1
        seat_number = _clean(s[idx:idx + 4]); idx += 4
        check_in_sequence = _clean(s[idx:idx + 5]); idx += 5
        passenger_status = _clean(s[idx:idx + 1]); idx += 1

        # Conditional field size for this leg (hex).
        try:
            cond_size = int(s[idx:idx + 2], 16)
        except (ValueError, IndexError):
            cond_size = 0
        idx += 2
        idx += cond_size  # skip conditional section

        julian = None
        if julian_raw and julian_raw.isdigit():
            julian = int(julian_raw)

        flight_iso = _julian_to_date(julian) if julian else None

        # Clean flight number: strip leading spaces/zeros for display.
        fn_clean = None
        if flight_number:
            fn_clean = flight_number.strip().lstrip("0") or flight_number.strip()

        legs.append(BCBPLeg(
            passenger_name=passenger_name,
            pnr=pnr,
            from_airport=from_airport,
            to_airport=to_airport,
            operating_carrier=carrier,
            flight_number=fn_clean,
            julian_date=julian,
            flight_date_iso=flight_iso,
            compartment=compartment,
            seat_number=seat_number,
            check_in_sequence=check_in_sequence,
            passenger_status=passenger_status,
        ))

    if not legs:
        return BCBPResult(raw=s, format_code="M", number_of_legs=num_legs, legs=[], valid=False, confidence=0.2, error="No legs decoded")

    # Confidence based on how many critical fields we got for leg 1.
    critical = [legs[0].from_airport, legs[0].to_airport, legs[0].operating_carrier, legs[0].flight_number, legs[0].flight_date_iso]
    score = sum(1 for c in critical if c) / len(critical)
    # Penalise missing seat/pnr slightly.
    if legs[0].seat_number:
        score = min(1.0, score + 0.05)
    if legs[0].pnr:
        score = min(1.0, score + 0.05)

    return BCBPResult(
        raw=s,
        format_code="M",
        number_of_legs=num_legs,
        legs=[asdict(leg) for leg in legs],
        valid=score >= 0.8,
        confidence=round(score, 2),
    )
