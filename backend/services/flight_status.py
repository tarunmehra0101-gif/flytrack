"""Flight status enrichment adapter.

Wraps AeroDataBox (via RapidAPI) as the v1 provider. Designed as a pluggable
adapter: if no API key is configured, `enrich_flight` returns None without
throwing so the core save flow is never blocked.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Optional

import httpx
from dotenv import load_dotenv

# Load .env here so module-level singleton reads the key correctly regardless
# of import order.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

logger = logging.getLogger(__name__)


class FlightStatusClient:
    """Adapter around a flight status provider.

    Primary provider: AeroDataBox (RapidAPI).
    Fallback: AviationStack (when AVIATIONSTACK_KEY is set).
    Swap provider by changing the base URL, headers, and `_parse_response`.
    """

    def __init__(self) -> None:
        self.api_key = os.environ.get("RAPIDAPI_KEY")
        self.host = os.environ.get("AERODATABOX_HOST", "aerodatabox.p.rapidapi.com")
        self.aviationstack_key = os.environ.get("AVIATIONSTACK_KEY")
        self.enabled = bool(self.api_key or self.aviationstack_key)
        self.primary_enabled = bool(self.api_key)
        self.fallback_enabled = bool(self.aviationstack_key)

    async def enrich_flight(self, flight_number: str, flight_date_iso: str) -> Optional[dict]:
        """Look up flight by IATA flight number and date.

        flight_number: e.g. "AI101" (airline code + number, no spaces)
        flight_date_iso: "YYYY-MM-DD"
        Returns a normalised status dict or None if disabled / not found.
        """
        if not flight_number or not flight_date_iso:
            return None

        # Try primary (AeroDataBox) first
        if self.primary_enabled:
            data = await self._call_aerodatabox(flight_number, flight_date_iso)
            if data:
                return data

        # Fallback to AviationStack
        if self.fallback_enabled:
            data = await self._call_aviationstack(flight_number, flight_date_iso)
            if data:
                return data

        return None

    async def _call_aerodatabox(self, flight_number: str, flight_date_iso: str) -> Optional[dict]:
        url = f"https://{self.host}/flights/number/{flight_number}/{flight_date_iso}"
        headers = {
            "X-RapidAPI-Key": self.api_key,
            "X-RapidAPI-Host": self.host,
        }
        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                resp = await client.get(url, headers=headers)
            if resp.status_code != 200:
                logger.info("AeroDataBox %s -> %s", flight_number, resp.status_code)
                return None
            data = resp.json()
        except Exception as e:  # noqa: BLE001
            logger.warning("AeroDataBox enrichment failed: %s", e)
            return None
        if isinstance(data, list) and data:
            data = data[0]
        if not isinstance(data, dict):
            return None
        return self._parse_response(data)

    async def _call_aviationstack(self, flight_number: str, flight_date_iso: str) -> Optional[dict]:
        url = "http://api.aviationstack.com/v1/flights"
        params = {
            "access_key": self.aviationstack_key,
            "flight_iata": flight_number,
            "flight_date": flight_date_iso,
            "limit": 1,
        }
        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                resp = await client.get(url, params=params)
            if resp.status_code != 200:
                return None
            payload = resp.json()
        except Exception as e:  # noqa: BLE001
            logger.warning("AviationStack enrichment failed: %s", e)
            return None
        data_list = payload.get("data") if isinstance(payload, dict) else None
        if not data_list:
            return None
        row = data_list[0]
        dep = row.get("departure") or {}
        arr = row.get("arrival") or {}
        airline = row.get("airline") or {}
        return {
            "provider": "aviationstack",
            "status": row.get("flight_status"),
            "airline_name": airline.get("name"),
            "airline_iata": airline.get("iata"),
            "aircraft_model": None,
            "departure": {
                "airport_iata": dep.get("iata"),
                "airport_name": dep.get("airport"),
                "city": None,
                "country": None,
                "terminal": dep.get("terminal"),
                "gate": dep.get("gate"),
                "scheduled_time_utc": dep.get("scheduled"),
                "actual_time_utc": dep.get("actual"),
                "runway_time_utc": None,
            },
            "arrival": {
                "airport_iata": arr.get("iata"),
                "airport_name": arr.get("airport"),
                "city": None,
                "country": None,
                "terminal": arr.get("terminal"),
                "gate": arr.get("gate"),
                "scheduled_time_utc": arr.get("scheduled"),
                "actual_time_utc": arr.get("actual"),
                "runway_time_utc": None,
            },
            "great_circle_distance_km": None,
            "raw": row,
        }

    @staticmethod
    def _parse_response(data: dict) -> dict:
        dep = data.get("departure") or {}
        arr = data.get("arrival") or {}
        dep_airport = dep.get("airport") or {}
        arr_airport = arr.get("airport") or {}
        airline = data.get("airline") or {}
        aircraft = data.get("aircraft") or {}

        def _best_time(slot: dict) -> Optional[str]:
            times = slot.get("scheduledTime") or {}
            return times.get("utc") or times.get("local")

        return {
            "provider": "aerodatabox",
            "status": data.get("status"),
            "airline_name": airline.get("name"),
            "airline_iata": airline.get("iata"),
            "aircraft_model": aircraft.get("model"),
            "departure": {
                "airport_iata": dep_airport.get("iata"),
                "airport_name": dep_airport.get("name"),
                "city": dep_airport.get("municipalityName"),
                "country": dep_airport.get("countryCode"),
                "terminal": dep.get("terminal"),
                "gate": dep.get("gate"),
                "scheduled_time_utc": _best_time(dep),
                "actual_time_utc": (dep.get("actualTime") or {}).get("utc"),
                "runway_time_utc": (dep.get("runwayTime") or {}).get("utc"),
            },
            "arrival": {
                "airport_iata": arr_airport.get("iata"),
                "airport_name": arr_airport.get("name"),
                "city": arr_airport.get("municipalityName"),
                "country": arr_airport.get("countryCode"),
                "terminal": arr.get("terminal"),
                "gate": arr.get("gate"),
                "scheduled_time_utc": _best_time(arr),
                "actual_time_utc": (arr.get("actualTime") or {}).get("utc"),
                "runway_time_utc": (arr.get("runwayTime") or {}).get("utc"),
            },
            "great_circle_distance_km": (data.get("greatCircleDistance") or {}).get("km"),
            "raw": data,
        }


flight_status_client = FlightStatusClient()
