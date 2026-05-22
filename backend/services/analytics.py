"""Derived analytics: trips, city-stays, dashboard KPIs, monthly stats."""

from __future__ import annotations

import math
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any
import uuid

from .airports import lookup_airport, lookup_airline


def _parse_iso(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except (ValueError, TypeError):
        return None


def _haversine_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    lat1, lng1 = a
    lat2, lng2 = b
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    h = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.asin(min(1.0, math.sqrt(h)))
    return R * c


def segment_distance_km(seg: dict) -> int:
    dep = lookup_airport(seg.get("departure_airport_iata"))
    arr = lookup_airport(seg.get("arrival_airport_iata"))
    if not dep or not arr:
        return 0
    return int(round(_haversine_km((dep["lat"], dep["lng"]), (arr["lat"], arr["lng"]))))


def _estimated_duration_min(seg: dict) -> int:
    """Estimate flight duration from great-circle distance (800 km/h + 20 min buffer)."""
    dep = lookup_airport(seg.get("departure_airport_iata"))
    arr = lookup_airport(seg.get("arrival_airport_iata"))
    if not dep or not arr:
        return 0
    km = _haversine_km((dep["lat"], dep["lng"]), (arr["lat"], arr["lng"]))
    if km <= 0:
        return 0
    return int(round(km / 800 * 60 + 20))


def _segment_depart_dt(seg: dict) -> datetime | None:
    return (
        _parse_iso(seg.get("departure_time_utc"))
        or _parse_iso(seg.get("departure_time_local"))
        or _parse_iso(seg.get("flight_date"))
    )


def _segment_arrive_dt(seg: dict) -> datetime | None:
    arr = (
        _parse_iso(seg.get("arrival_time_utc"))
        or _parse_iso(seg.get("arrival_time_local"))
    )
    if arr:
        return arr
    # Fallback: estimate arrival as departure + estimated air time.
    dep = _segment_depart_dt(seg)
    if dep:
        est = _estimated_duration_min(seg)
        if est > 0:
            from datetime import timedelta
            return dep + timedelta(minutes=est)
        return dep
    return None


def _segment_duration_min(seg: dict) -> int:
    if seg.get("flight_duration_minutes"):
        try:
            return int(seg["flight_duration_minutes"])
        except (TypeError, ValueError):
            pass
    dep = _parse_iso(seg.get("departure_time_utc"))
    arr = _parse_iso(seg.get("arrival_time_utc"))
    if dep and arr and arr > dep:
        return int((arr - dep).total_seconds() / 60)
    # Fallback: estimate from great-circle distance between the two airports.
    return _estimated_duration_min(seg)


def segment_duration_source(seg: dict) -> str:
    if seg.get("flight_duration_minutes"):
        return "provider"
    dep = _parse_iso(seg.get("departure_time_utc"))
    arr = _parse_iso(seg.get("arrival_time_utc"))
    if dep and arr and arr > dep:
        return "scheduled"
    if _estimated_duration_min(seg):
        return "estimated_distance"
    return "unknown"


def _clip_window(start: datetime, end: datetime, year: int | None) -> tuple[datetime, datetime] | None:
    if not year:
        return start, end
    y0 = datetime(year, 1, 1, tzinfo=timezone.utc)
    y1 = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    start = max(start, y0)
    end = min(end, y1)
    if end <= start:
        return None
    return start, end


def build_presence_windows(
    confirmed_segments: list[dict],
    home_airport_iata: str | None,
    year: int | None = None,
    now: datetime | None = None,
) -> list[dict]:
    """Build air, airport, home, and away windows from confirmed flights."""
    now = now or datetime.now(timezone.utc)
    home = (home_airport_iata or "").upper() or None
    segments = [s for s in confirmed_segments if s.get("departure_airport_iata") and s.get("arrival_airport_iata")]
    segments.sort(key=lambda s: _segment_depart_dt(s) or datetime.max.replace(tzinfo=timezone.utc))
    windows: list[dict] = []

    def add_window(kind: str, start: datetime | None, end: datetime | None, **extra):
        if not start or not end or end <= start:
            return
        clipped = _clip_window(start, end, year)
        if not clipped:
            return
        s, e = clipped
        windows.append({
            "id": f"win_{uuid.uuid4().hex[:12]}",
            "type": kind,
            "start_time_utc": s.isoformat(),
            "end_time_utc": e.isoformat(),
            "duration_minutes": int((e - s).total_seconds() / 60),
            **extra,
        })

    if segments and home:
        first_seg = segments[0]
        first_dep = _segment_depart_dt(first_seg)
        if first_dep:
            start_dt = first_dep - timedelta(days=365)
            buffer_start = first_dep - timedelta(minutes=90)
            dep_meta = lookup_airport(home) or {}
            add_window(
                "home",
                start_dt,
                buffer_start,
                airport_iata=home,
                city_name=dep_meta.get("city") or home,
                country_code=dep_meta.get("country"),
                is_home=True,
                estimated=True,
            )

    for idx, seg in enumerate(segments):
        dep = _segment_depart_dt(seg)
        arr = _segment_arrive_dt(seg)
        duration = _segment_duration_min(seg)
        if dep and (not arr or arr <= dep) and duration:
            arr = dep + timedelta(minutes=duration)
        dep_iata = seg.get("departure_airport_iata")
        arr_iata = seg.get("arrival_airport_iata")
        dep_meta = lookup_airport(dep_iata) or {}
        arr_meta = lookup_airport(arr_iata) or {}
        prev_seg = segments[idx - 1] if idx > 0 else None
        prev_arr = _segment_arrive_dt(prev_seg) if prev_seg else None
        next_seg = segments[idx + 1] if idx + 1 < len(segments) else None
        next_dep = _segment_depart_dt(next_seg) if next_seg else None
        inbound_layover = bool(prev_arr and dep and dep - prev_arr <= timedelta(hours=12))
        outbound_layover = bool(arr and next_dep and next_dep - arr <= timedelta(hours=12))

        add_window(
            "flight",
            dep,
            arr,
            segment_id=seg.get("id"),
            route=f"{dep_iata}-{arr_iata}" if dep_iata and arr_iata else None,
            city_name=None,
            airport_iata=None,
            is_home=False,
            estimated=segment_duration_source(seg).startswith("estimated"),
        )

        # Free-first estimate: 90 min pre-departure and 30 min post-arrival airport time.
        if not inbound_layover:
            add_window(
                "airport",
                dep - timedelta(minutes=90) if dep else None,
                dep,
                segment_id=seg.get("id"),
                airport_iata=dep_iata,
                city_name=dep_meta.get("city"),
                is_home=bool(home and dep_iata == home),
                estimated=True,
            )
        if not outbound_layover:
            add_window(
                "airport",
                arr,
                arr + timedelta(minutes=30) if arr else None,
                segment_id=seg.get("id"),
                airport_iata=arr_iata,
                city_name=arr_meta.get("city"),
                is_home=bool(home and arr_iata == home),
                estimated=True,
            )

        stay_end = next_dep or now
        if arr and stay_end > arr:
            airport_buffer_end = arr + timedelta(minutes=30)
            next_airport_start = next_dep - timedelta(minutes=90) if next_dep else stay_end
            if next_dep and next_dep - arr <= timedelta(hours=12):
                add_window(
                    "airport",
                    arr,
                    next_dep,
                    airport_iata=arr_iata,
                    city_name=arr_meta.get("city"),
                    is_home=bool(home and arr_iata == home),
                    estimated=True,
                    layover=True,
                )
            else:
                add_window(
                    "home" if home and arr_iata == home else "city",
                    airport_buffer_end,
                    next_airport_start,
                    airport_iata=arr_iata,
                    city_name=seg.get("arrival_city_name") or arr_meta.get("city") or arr_iata,
                    country_code=arr_meta.get("country"),
                    is_home=bool(home and arr_iata == home),
                    estimated=not bool(seg.get("arrival_time_utc") and (next_seg or next_dep)),
                )
    windows.sort(key=lambda w: w.get("start_time_utc") or "")
    return windows


def _segments_for_year(segments: list[dict], year: int) -> list[dict]:
    out = []
    start = datetime(year, 1, 1, tzinfo=timezone.utc)
    end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    for s in segments:
        dep = _segment_depart_dt(s)
        if dep and start <= dep < end:
            out.append(s)
    return out


def compute_map_data(confirmed_segments: list[dict], home_airport_iata: str | None, year: int | None = None) -> dict:
    segments = _segments_for_year(confirmed_segments, year) if year else list(confirmed_segments)
    home = (home_airport_iata or "").upper() or None
    airport_counts: Counter = Counter()
    route_counts: Counter = Counter()
    for s in segments:
        dep = s.get("departure_airport_iata")
        arr = s.get("arrival_airport_iata")
        if dep and lookup_airport(dep):
            airport_counts[dep] += 1
        if arr and lookup_airport(arr):
            airport_counts[arr] += 1
        if dep and arr and lookup_airport(dep) and lookup_airport(arr):
            route_counts[f"{dep}-{arr}"] += 1
    airport_markers = []
    for code, count in airport_counts.items():
        meta = lookup_airport(code) or {}
        airport_markers.append({
            "iata": code,
            "city": meta.get("city"),
            "country": meta.get("country"),
            "lat": meta.get("lat"),
            "lng": meta.get("lng"),
            "count": count,
            "is_home": bool(home and code == home),
        })
    routes = []
    for route, count in route_counts.items():
        dep_code, arr_code = route.split("-")
        dep = lookup_airport(dep_code) or {}
        arr = lookup_airport(arr_code) or {}
        routes.append({
            "route": route,
            "count": count,
            "from": {"iata": dep_code, "city": dep.get("city"), "lat": dep.get("lat"), "lng": dep.get("lng")},
            "to": {"iata": arr_code, "city": arr.get("city"), "lat": arr.get("lat"), "lng": arr.get("lng")},
        })
    return {
        "year": year,
        "total_flights": len(segments),
        "airport_markers": sorted(airport_markers, key=lambda x: (-x["count"], x["iata"])),
        "routes": sorted(routes, key=lambda x: (-x["count"], x["route"])),
    }


def compute_wrapped(
    confirmed_segments: list[dict],
    trips: list[dict],
    city_stays: list[dict],
    home_airport_iata: str | None,
    year: int | None,
) -> dict:
    segments = _segments_for_year(confirmed_segments, year) if year else list(confirmed_segments)
    windows = build_presence_windows(confirmed_segments, home_airport_iata, year)
    flight_minutes = sum(w["duration_minutes"] for w in windows if w["type"] == "flight")
    airport_minutes = sum(w["duration_minutes"] for w in windows if w["type"] == "airport")
    home_minutes = sum(w["duration_minutes"] for w in windows if w.get("is_home") and w["type"] in {"home", "city"})
    away_minutes = sum(w["duration_minutes"] for w in windows if not w.get("is_home") and w["type"] == "city")
    city_counter: Counter = Counter()
    country_counter: Counter = Counter()
    airport_counter: Counter = Counter()
    route_counter: Counter = Counter()
    airline_counter: Counter = Counter()
    monthly: dict[str, dict] = defaultdict(lambda: {"month": "", "flights": 0, "air_minutes": 0})
    longest = None

    for s in segments:
        dep = _segment_depart_dt(s)
        key = dep.strftime("%Y-%m") if dep else f"{year or 'all'}-unknown"
        monthly[key]["month"] = key
        monthly[key]["flights"] += 1
        monthly[key]["air_minutes"] += _segment_duration_min(s)
        dep_iata = s.get("departure_airport_iata")
        arr_iata = s.get("arrival_airport_iata")
        if arr_iata:
            airport_counter[arr_iata] += 1
            meta = lookup_airport(arr_iata) or {}
            if meta.get("city"):
                city_counter[meta["city"]] += 1
            if meta.get("country"):
                country_counter[meta["country"]] += 1
        if dep_iata:
            airport_counter[dep_iata] += 1
        if dep_iata and arr_iata:
            route_counter[f"{dep_iata}-{arr_iata}"] += 1
        if s.get("airline_iata"):
            airline_counter[s["airline_iata"]] += 1
        if not longest or _segment_duration_min(s) > _segment_duration_min(longest):
            longest = s

    travel_personality = "Grounded"
    if len(segments) >= 24:
        travel_personality = "Frequent Flyer"
    elif airport_minutes > flight_minutes and airport_minutes > 0:
        travel_personality = "Hub Hopper"
    elif flight_minutes >= 24 * 60:
        travel_personality = "Long-Haul Regular"
    elif len(segments) >= 6:
        travel_personality = "Weekend Nomad"

    year_str = "All-Time" if year is None else str(year)
    cards = [
        {"kind": "hero", "title": f"Your {year_str} in motion", "value": f"{len(segments)} flights"},
        {"kind": "air", "title": "Time above the clouds", "value": f"{round(flight_minutes / 60, 1)} hours"},
        {"kind": "home", "title": "Time at home", "value": f"{round(home_minutes / 60 / 24, 1)} days"},
        {"kind": "away", "title": "Time away", "value": f"{round(away_minutes / 60 / 24, 1)} days"},
    ]
    if route_counter:
        route, count = route_counter.most_common(1)[0]
        cards.append({"kind": "route", "title": "Your signature route", "value": route, "detail": f"{count} flights"})
    if city_counter:
        city, count = city_counter.most_common(1)[0]
        cards.append({"kind": "city", "title": "Most returned-to city", "value": city, "detail": f"{count} arrivals"})

    return {
        "year": year or "all",
        "total_flights": len(segments),
        "total_air_minutes": flight_minutes,
        "total_air_hours": round(flight_minutes / 60, 1),

        "airport_minutes": airport_minutes,
        "airport_hours": round(airport_minutes / 60, 1),
        "home_minutes": home_minutes,
        "home_days": round(home_minutes / 60 / 24, 1),
        "away_minutes": away_minutes,
        "away_days": round(away_minutes / 60 / 24, 1),
        "cities": [{"city": k, "count": v} for k, v in city_counter.most_common()],
        "countries": [{"country": k, "count": v} for k, v in country_counter.most_common()],
        "airports": [{"iata": k, "count": v} for k, v in airport_counter.most_common()],
        "top_route": route_counter.most_common(1)[0][0] if route_counter else None,
        "top_airline": airline_counter.most_common(1)[0][0] if airline_counter else None,
        "top_airline_name": (lookup_airline(airline_counter.most_common(1)[0][0]) or {}).get("name") if airline_counter else None,
        "longest_flight": longest,
        "monthly_rhythm": [monthly[k] for k in sorted(monthly.keys())],
        "travel_personality": travel_personality,
        "milestones": [
            f"{len(airport_counter)} airports touched",
            f"{len(city_counter)} destination cities",
            f"{round(airport_minutes / 60, 1)} estimated airport hours",
        ],
        "presence_windows": windows,
        "wrapped_cards": cards,
        "map": compute_map_data(segments, home_airport_iata, year=None),
    }


def derive_trips_and_stays(
    user_id: str,
    confirmed_segments: list[dict],
    home_airport_iata: str | None,
) -> tuple[list[dict], list[dict]]:
    """Given a user's confirmed segments, compute trips and city-stays.

    A trip starts when the user departs their home airport and ends when they
    return. If home is unknown, every segment becomes its own trip.
    """
    segments = [s for s in confirmed_segments if s.get("departure_airport_iata") and s.get("arrival_airport_iata")]
    segments.sort(key=lambda s: _segment_depart_dt(s) or datetime.min.replace(tzinfo=timezone.utc))

    trips: list[dict] = []
    city_stays: list[dict] = []
    home = (home_airport_iata or "").upper() or None

    if segments and home:
        first_seg = segments[0]
        first_dep = _segment_depart_dt(first_seg)
        if first_dep:
            start_dt = first_dep - timedelta(days=365)
            stay_end = first_dep
            dep_meta = lookup_airport(home) or {}
            city_stays.append({
                "id": f"stay_{uuid.uuid4().hex[:12]}",
                "user_id": user_id,
                "city_name": dep_meta.get("city") or home,
                "airport_iata": home,
                "country_code": dep_meta.get("country"),
                "start_time_utc": start_dt.isoformat(),
                "end_time_utc": stay_end.isoformat(),
                "duration_minutes": int((stay_end - start_dt).total_seconds() / 60),
                "is_home": True,
                "derived_from_method": "initial_home_stay",
                "created_at": datetime.now(timezone.utc).isoformat(),
            })

    current_trip: dict | None = None
    current_trip_segments: list[dict] = []

    def _close_trip(last_arrival_city: str | None, last_arrival_time: datetime | None, returned_home: bool):
        nonlocal current_trip, current_trip_segments
        if current_trip is None:
            return
        current_trip["end_city_name"] = last_arrival_city or current_trip.get("end_city_name")
        current_trip["end_time_utc"] = (last_arrival_time or datetime.now(timezone.utc)).isoformat()
        current_trip["returned_home"] = returned_home
        current_trip["total_segments"] = len(current_trip_segments)
        current_trip["total_air_minutes"] = sum(_segment_duration_min(s) for s in current_trip_segments)
        current_trip["segment_ids"] = [s["id"] for s in current_trip_segments]
        trips.append(current_trip)
        current_trip = None
        current_trip_segments = []

    for i, seg in enumerate(segments):
        dep = _segment_depart_dt(seg)
        arr = _segment_arrive_dt(seg)
        dep_iata = seg.get("departure_airport_iata")
        arr_iata = seg.get("arrival_airport_iata")
        dep_city = seg.get("departure_city_name") or (lookup_airport(dep_iata) or {}).get("city") or dep_iata
        arr_city = seg.get("arrival_city_name") or (lookup_airport(arr_iata) or {}).get("city") or arr_iata

        # Start a new trip if needed.
        if current_trip is None:
            started_from_home = home is not None and dep_iata == home
            current_trip = {
                "id": f"trip_{uuid.uuid4().hex[:12]}",
                "user_id": user_id,
                "trip_name": f"{dep_city} → ?",
                "start_time_utc": (dep or datetime.now(timezone.utc)).isoformat(),
                "end_time_utc": None,
                "start_city_name": dep_city,
                "end_city_name": arr_city,
                "started_from_home": bool(started_from_home),
                "returned_home": False,
                "total_segments": 0,
                "total_air_minutes": 0,
                "segment_ids": [],
                "created_at": datetime.now(timezone.utc).isoformat(),
            }

        current_trip_segments.append(seg)
        current_trip["trip_name"] = f"{current_trip['start_city_name']} → {arr_city}"

        # City-stay: from this arrival until the next departure (or open-ended)
        next_dep_dt = None
        if i + 1 < len(segments):
            next_dep_dt = _segment_depart_dt(segments[i + 1])
        stay_end = next_dep_dt or datetime.now(timezone.utc)
        if arr and stay_end > arr:
            city_stays.append({
                "id": f"stay_{uuid.uuid4().hex[:12]}",
                "user_id": user_id,
                "city_name": arr_city,
                "airport_iata": arr_iata,
                "country_code": (lookup_airport(arr_iata) or {}).get("country"),
                "start_time_utc": arr.isoformat(),
                "end_time_utc": stay_end.isoformat(),
                "duration_minutes": int((stay_end - arr).total_seconds() / 60),
                "is_home": bool(home and arr_iata == home),
                "derived_from_method": "segment_arrival",
                "created_at": datetime.now(timezone.utc).isoformat(),
            })

        # Close trip if we've returned home (and home is known).
        if home and arr_iata == home and current_trip and current_trip.get("started_from_home"):
            _close_trip(arr_city, arr, returned_home=True)

    # Close any open trip (user still away)
    if current_trip is not None:
        last_seg = current_trip_segments[-1] if current_trip_segments else None
        last_arr_city = last_seg.get("arrival_city_name") if last_seg else None
        last_arr_time = _segment_arrive_dt(last_seg) if last_seg else None
        _close_trip(last_arr_city, last_arr_time, returned_home=False)

    return trips, city_stays


def compute_dashboard(
    confirmed_segments: list[dict],
    trips: list[dict],
    city_stays: list[dict],
    home_airport_iata: str | None,
) -> dict:
    total_flights = len(confirmed_segments)
    total_air_minutes = sum(_segment_duration_min(s) for s in confirmed_segments)

    home = (home_airport_iata or "").upper() or None
    home_minutes = sum(s["duration_minutes"] for s in city_stays if s.get("is_home"))
    away_minutes = sum(s["duration_minutes"] for s in city_stays if not s.get("is_home"))

    # Cities visited (unique non-home arrival cities)
    away_cities = {s["city_name"] for s in city_stays if s.get("city_name") and not s.get("is_home")}
    cities_visited = len(away_cities)

    # Top route
    route_counter: Counter = Counter()
    airline_counter: Counter = Counter()
    city_time: dict[str, int] = defaultdict(int)
    for s in confirmed_segments:
        a = s.get("departure_airport_iata")
        b = s.get("arrival_airport_iata")
        if a and b:
            route_counter[f"{a}-{b}"] += 1
        airline = s.get("airline_iata") or s.get("airline_name")
        if airline:
            airline_counter[airline] += 1
    for s in city_stays:
        if s.get("city_name") and not s.get("is_home"):
            city_time[s["city_name"]] += s.get("duration_minutes", 0)

    top_route = route_counter.most_common(1)[0] if route_counter else (None, 0)
    top_airline_key = airline_counter.most_common(1)[0][0] if airline_counter else None
    top_airline_name = None
    if top_airline_key:
        a = lookup_airline(top_airline_key)
        top_airline_name = a["name"] if a else top_airline_key

    # Monthly flights chart (last 12 months)
    monthly: dict[str, int] = defaultdict(int)
    monthly_air: dict[str, int] = defaultdict(int)
    for s in confirmed_segments:
        dep = _segment_depart_dt(s)
        if dep:
            key = dep.strftime("%Y-%m")
            monthly[key] += 1
            monthly_air[key] += _segment_duration_min(s)

    monthly_series = [
        {"month": k, "flights": v, "air_minutes": monthly_air.get(k, 0)}
        for k, v in sorted(monthly.items())
    ][-12:]

    # Top cities leaderboard
    top_cities = [
        {"city": city, "minutes": minutes, "days": round(minutes / 60 / 24, 1)}
        for city, minutes in sorted(city_time.items(), key=lambda x: -x[1])[:5]
    ]

    # Airline split
    airline_split = [
        {"airline": k, "name": (lookup_airline(k) or {}).get("name", k), "count": v}
        for k, v in airline_counter.most_common(6)
    ]

    # Route frequency
    route_frequency = [{"route": k, "count": v} for k, v in route_counter.most_common(6)]

    # Longest trip
    longest_trip = None
    if trips:
        sorted_trips = sorted(trips, key=lambda t: t.get("total_air_minutes", 0), reverse=True)
        longest_trip = sorted_trips[0]

    # Insight cards (contextual)
    insights: list[str] = []
    if top_cities:
        c = top_cities[0]
        insights.append(f"You spent {c['days']} days in {c['city']} recently.")
    if top_route[0]:
        a, b = top_route[0].split("-")
        insights.append(f"Your most frequent route was {a} → {b}.")
    if away_minutes > home_minutes and (away_minutes + home_minutes) > 0:
        insights.append("You spent more time away than at home this period.")
    if total_flights:
        insights.append(f"You took {total_flights} flights and flew {round(total_air_minutes/60)} hours so far.")

    return {
        "total_flights": total_flights,
        "total_air_minutes": total_air_minutes,
        "total_air_hours": round(total_air_minutes / 60, 1),
        "home_minutes": home_minutes,
        "home_days": round(home_minutes / 60 / 24, 1),
        "away_minutes": away_minutes,
        "away_days": round(away_minutes / 60 / 24, 1),
        "cities_visited": cities_visited,
        "top_route": top_route[0],
        "top_route_count": top_route[1],
        "top_airline": top_airline_key,
        "top_airline_name": top_airline_name,
        "longest_trip": longest_trip,
        "monthly_series": monthly_series,
        "top_cities": top_cities,
        "airline_split": airline_split,
        "route_frequency": route_frequency,
        "insights": insights,
        "home_airport_iata": home,
    }


def compute_monthly_stats(user_id: str, confirmed_segments: list[dict], city_stays: list[dict]) -> list[dict]:
    """Precomputed per-month rollup saved to monthly_stats collection."""
    by_month: dict[str, dict] = defaultdict(lambda: {
        "total_flights": 0,
        "total_air_minutes": 0,
        "airports": Counter(),
        "airlines": Counter(),
        "routes": Counter(),
        "home_minutes": 0,
        "away_minutes": 0,
    })

    for s in confirmed_segments:
        dep = _segment_depart_dt(s)
        if not dep:
            continue
        key = dep.strftime("%Y-%m")
        bucket = by_month[key]
        bucket["total_flights"] += 1
        bucket["total_air_minutes"] += _segment_duration_min(s)
        if s.get("arrival_airport_iata"):
            bucket["airports"][s["arrival_airport_iata"]] += 1
        if s.get("airline_iata"):
            bucket["airlines"][s["airline_iata"]] += 1
        if s.get("departure_airport_iata") and s.get("arrival_airport_iata"):
            bucket["routes"][f"{s['departure_airport_iata']}-{s['arrival_airport_iata']}"] += 1

    for stay in city_stays:
        start = _parse_iso(stay.get("start_time_utc"))
        if not start:
            continue
        key = start.strftime("%Y-%m")
        bucket = by_month[key]
        if stay.get("is_home"):
            bucket["home_minutes"] += stay.get("duration_minutes", 0)
        else:
            bucket["away_minutes"] += stay.get("duration_minutes", 0)

    rollups = []
    for month, b in by_month.items():
        primary_city = b["airports"].most_common(1)[0][0] if b["airports"] else None
        primary_route = b["routes"].most_common(1)[0][0] if b["routes"] else None
        most_used_airline = b["airlines"].most_common(1)[0][0] if b["airlines"] else None
        rollups.append({
            "id": f"ms_{user_id}_{month}",
            "user_id": user_id,
            "month_key": month,
            "total_flights": b["total_flights"],
            "total_air_minutes": b["total_air_minutes"],
            "total_home_minutes": b["home_minutes"],
            "total_away_minutes": b["away_minutes"],
            "total_cities": len(b["airports"]),
            "primary_city": primary_city,
            "primary_route": primary_route,
            "most_used_airline": most_used_airline,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
    return rollups
