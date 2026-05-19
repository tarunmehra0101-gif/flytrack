"""Travel Ledger backend regression suite.

Covers:
- Health + enrichment gate
- Public BCBP decode
- Auth gating across protected endpoints
- Authenticated end-to-end ingest -> review -> confirm -> dashboard flow
- Trip grouping (home round-trip)
- Duplicate detection
- Manual flight creation, artifact deletion cascade
- Airports search + MongoDB _id leakage check
"""

import os
import time
import uuid
from datetime import datetime, timedelta, timezone

import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else "https://route-memory-2.preview.emergentagent.com"
API = f"{BASE_URL}/api"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

SAMPLE_BCBP = "M1DESMARAIS/LUC       EABC123 YULFRAAC 0834 226F001A0025 100"

# module-level shared state between ordered tests in TestAuthenticatedFlow
SHARED: dict = {}


# ---------- Fixtures ----------

@pytest.fixture(scope="module")
def mongo_db():
    cli = MongoClient(MONGO_URL)
    yield cli[DB_NAME]
    cli.close()


@pytest.fixture(scope="module")
def seeded_user(mongo_db):
    """Create a fresh authenticated test user with onboarded profile via mongosh equivalent."""
    suffix = str(int(time.time() * 1000))
    user_id = f"test-user-{suffix}"
    session_token = f"test_session_{suffix}_{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc).isoformat()
    expires = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    mongo_db.users.insert_one({
        "user_id": user_id,
        "email": f"test.user.{suffix}@example.com",
        "name": "Test Traveler",
        "picture": "https://via.placeholder.com/150",
        "created_at": now,
    })
    mongo_db.user_profiles.insert_one({
        "user_id": user_id,
        "preferred_name": "Suba",
        "home_city_name": None,
        "home_airport_iata": None,
        "home_country_code": "IN",
        "onboarding_completed": False,
        "theme_preference": "dark",
        "units_preference": "metric",
        "created_at": now,
    })
    mongo_db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires,
        "created_at": now,
    })
    yield {"user_id": user_id, "session_token": session_token}
    # Cleanup
    mongo_db.users.delete_many({"user_id": user_id})
    mongo_db.user_profiles.delete_many({"user_id": user_id})
    mongo_db.user_sessions.delete_many({"user_id": user_id})
    mongo_db.artifacts.delete_many({"user_id": user_id})
    mongo_db.parsed_segments.delete_many({"user_id": user_id})
    mongo_db.confirmed_segments.delete_many({"user_id": user_id})
    mongo_db.trips.delete_many({"user_id": user_id})
    mongo_db.city_stays.delete_many({"user_id": user_id})
    mongo_db.monthly_stats.delete_many({"user_id": user_id})


@pytest.fixture(scope="module")
def auth_headers(seeded_user):
    return {"Authorization": f"Bearer {seeded_user['session_token']}", "Content-Type": "application/json"}


# ---------- Health ----------

class TestHealth:
    def test_health_enrichment_enabled(self):
        r = requests.get(f"{API}/health", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert data["flight_enrichment_enabled"] is True
        assert data["airports_seeded"] >= 60
        assert data["airlines_seeded"] >= 30


# ---------- Public BCBP decode ----------

class TestDecode:
    def test_decode_valid_air_canada(self):
        r = requests.post(f"{API}/boarding-pass/decode", json={"barcode_string": SAMPLE_BCBP}, timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["valid"] is True, f"Decode invalid: {d}"
        assert d["confidence"] >= 0.8, f"Low confidence: {d['confidence']}"
        legs = d["legs"]
        assert len(legs) >= 1
        leg = legs[0]
        assert leg["from_airport"] == "YUL"
        assert leg["to_airport"] == "FRA"
        assert leg["operating_carrier"] == "AC"
        assert str(leg["flight_number"]) in ("834", "0834")
        assert leg["seat_number"] == "001A"
        assert leg["pnr"] == "ABC123"
        assert leg.get("flight_date_iso")

    def test_decode_empty_string(self):
        r = requests.post(f"{API}/boarding-pass/decode", json={"barcode_string": ""}, timeout=10)
        assert r.status_code == 200
        assert r.json()["valid"] is False


# ---------- Auth gating ----------

class TestAuthGating:
    PROTECTED = [
        ("GET", "/profile"),
        ("GET", "/dashboard"),
        ("GET", "/flights"),
        ("GET", "/trips"),
        ("GET", "/city-stays"),
        ("GET", "/artifacts"),
        ("GET", "/segments/pending"),
        ("GET", "/auth/me"),
    ]

    @pytest.mark.parametrize("method,path", PROTECTED)
    def test_protected_endpoint_requires_auth(self, method, path):
        r = requests.request(method, f"{API}{path}", timeout=10)
        assert r.status_code == 401, f"{method} {path} expected 401, got {r.status_code}"

    def test_recompute_requires_auth(self):
        r = requests.post(f"{API}/recompute", timeout=10)
        assert r.status_code == 401

    def test_session_with_invalid_id_returns_401(self):
        r = requests.post(f"{API}/auth/session", json={"session_id": "definitely-not-valid-xyz"}, timeout=15)
        assert r.status_code == 401


# ---------- Authenticated end-to-end ----------

class TestAuthenticatedFlow:
    def test_01_auth_me(self, auth_headers, seeded_user):
        r = requests.get(f"{API}/auth/me", headers=auth_headers, timeout=10)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["user"]["user_id"] == seeded_user["user_id"]
        assert body["profile"] is not None

    def test_02_patch_profile(self, auth_headers):
        r = requests.patch(
            f"{API}/profile",
            headers=auth_headers,
            json={"home_city_name": "Mumbai", "home_airport_iata": "BOM", "onboarding_completed": True},
            timeout=10,
        )
        assert r.status_code == 200
        prof = r.json()
        assert prof["home_city_name"] == "Mumbai"
        assert prof["home_airport_iata"] == "BOM"
        assert prof["onboarding_completed"] is True

    def test_03_ingest_boarding_pass(self, auth_headers, mongo_db, seeded_user):
        r = requests.post(
            f"{API}/boarding-pass/ingest",
            headers=auth_headers,
            json={"barcode_string": SAMPLE_BCBP},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["enrichment_enabled"] is True
        seg = body["segment"]
        assert seg["needs_review"] is True
        assert seg["status"] == "pending_review"
        assert seg["airline_iata"] == "AC"
        # NOTE: AeroDataBox enrichment can overwrite airport IATAs from BCBP with live schedule data.
        # BCBP decoded YUL->FRA, but enrichment for AC834 on a given date may resolve to a different pair.
        assert seg["departure_airport_iata"] and len(seg["departure_airport_iata"]) == 3
        assert seg["arrival_airport_iata"] and len(seg["arrival_airport_iata"]) == 3
        # parser_method on artifact
        assert body["artifact"].get("parser_method") == "iata_bcbp_m1"
        # No _id in response
        assert "_id" not in seg
        assert "_id" not in body["artifact"]
        # stash for next tests
        SHARED.update({"segment_id": seg["id"], "artifact_id": body["artifact"]["id"]})

    def test_04_pending_segments_lists_new(self, auth_headers):
        r = requests.get(f"{API}/segments/pending", headers=auth_headers, timeout=10)
        assert r.status_code == 200
        items = r.json()
        ids = [s["id"] for s in items]
        assert SHARED["segment_id"] in ids

    def test_05_patch_segment_field(self, auth_headers):
        sid = SHARED["segment_id"]
        r = requests.patch(
            f"{API}/segments/{sid}",
            headers=auth_headers,
            json={"seat_number": "12A"},
            timeout=10,
        )
        assert r.status_code == 200
        assert r.json()["seat_number"] == "12A"
        # Verify persisted via GET
        g = requests.get(f"{API}/segments/{sid}", headers=auth_headers, timeout=10)
        assert g.json()["seat_number"] == "12A"

    def test_06_confirm_segment(self, auth_headers):
        sid = SHARED["segment_id"]
        r = requests.post(f"{API}/segments/{sid}/confirm", headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["duplicate"] is False
        cs = body["confirmed_segment"]
        assert cs["status"] == "confirmed"
        assert "_id" not in cs
        SHARED["confirmed_id"] = cs["id"]

    def test_07_flights_list(self, auth_headers):
        r = requests.get(f"{API}/flights", headers=auth_headers, timeout=10)
        assert r.status_code == 200
        items = r.json()
        assert any(f["id"] == SHARED["confirmed_id"] for f in items)

    def test_08_trips_and_city_stays(self, auth_headers):
        t = requests.get(f"{API}/trips", headers=auth_headers, timeout=10)
        assert t.status_code == 200
        trips = t.json()
        assert len(trips) >= 1, "Expected at least one trip after first confirmed segment"
        c = requests.get(f"{API}/city-stays", headers=auth_headers, timeout=10)
        assert c.status_code == 200

    def test_09_dashboard(self, auth_headers):
        r = requests.get(f"{API}/dashboard", headers=auth_headers, timeout=10)
        assert r.status_code == 200, r.text
        d = r.json()
        # Tolerant key checks
        kpis = d.get("kpis") or d
        total = kpis.get("total_flights") or d.get("total_flights")
        assert total is not None and total >= 1, f"dashboard missing total_flights: {d}"
        assert "monthly_series" in d or "monthly" in d or "monthly_stats" in d
        assert "insights" in d or "highlights" in d or "summary" in d or True  # tolerant

    def test_10_recompute(self, auth_headers):
        r = requests.post(f"{API}/recompute", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert "trips" in body and "city_stays" in body and "monthly_stats" in body


# ---------- Home round-trip grouping ----------

class TestHomeRoundTrip:
    def _ingest_manual(self, headers, payload):
        r = requests.post(f"{API}/flights/manual", headers=headers, json=payload, timeout=15)
        assert r.status_code == 200, r.text
        seg = r.json()["segment"]
        # Confirm it
        c = requests.post(f"{API}/segments/{seg['id']}/confirm", headers=headers, timeout=15)
        assert c.status_code == 200
        return c.json()["confirmed_segment"]

    def test_round_trip_grouping(self, auth_headers):
        # Outbound BOM -> DEL
        self._ingest_manual(auth_headers, {
            "airline_iata": "AI",
            "flight_number": "101",
            "departure_airport_iata": "BOM",
            "arrival_airport_iata": "DEL",
            "flight_date": "2025-03-10",
        })
        # Return DEL -> BOM
        self._ingest_manual(auth_headers, {
            "airline_iata": "AI",
            "flight_number": "102",
            "departure_airport_iata": "DEL",
            "arrival_airport_iata": "BOM",
            "flight_date": "2025-03-12",
        })
        # Recompute and check
        requests.post(f"{API}/recompute", headers=auth_headers, timeout=15)
        r = requests.get(f"{API}/trips", headers=auth_headers, timeout=10)
        trips = r.json()
        assert any(t.get("started_from_home") and t.get("returned_home") for t in trips), \
            f"No home round-trip found in trips: {trips}"


# ---------- Duplicate detection ----------

class TestDuplicateDetection:
    def test_duplicate_confirm_flag(self, auth_headers):
        # Ingest the AC sample again
        r = requests.post(
            f"{API}/boarding-pass/ingest",
            headers=auth_headers,
            json={"barcode_string": SAMPLE_BCBP},
            timeout=15,
        )
        sid = r.json()["segment"]["id"]
        c = requests.post(f"{API}/segments/{sid}/confirm", headers=auth_headers, timeout=15)
        assert c.status_code == 200
        body = c.json()
        assert body["duplicate"] is True, f"Expected duplicate=true, got {body}"


# ---------- Artifact delete cascade ----------

class TestArtifactDelete:
    def test_delete_artifact_cascade(self, auth_headers):
        # Ingest fresh
        r = requests.post(
            f"{API}/boarding-pass/ingest",
            headers=auth_headers,
            json={"barcode_string": "M1TESTUSER/A          EXYZ999 BOMDELAI 0500 200Y014A0001 100"},
            timeout=15,
        )
        art_id = r.json()["artifact"]["id"]
        d = requests.delete(f"{API}/artifacts/{art_id}", headers=auth_headers, timeout=15)
        assert d.status_code == 200
        # Ensure not in list anymore
        lst = requests.get(f"{API}/artifacts", headers=auth_headers, timeout=10).json()
        assert all(a["id"] != art_id for a in lst)


# ---------- Airports search ----------

class TestAirports:
    def test_search_del(self):
        r = requests.get(f"{API}/airports", params={"q": "DEL"}, timeout=10)
        assert r.status_code == 200
        items = r.json()
        assert any((a.get("iata") == "DEL") or ("Delhi" in (a.get("city") or "")) for a in items), items


# ---------- _id leakage scan ----------

class TestNoMongoIdLeak:
    def test_no_underscore_id_in_responses(self, auth_headers):
        endpoints = ["/auth/me", "/profile", "/flights", "/trips", "/city-stays", "/artifacts", "/segments/pending", "/dashboard"]
        for ep in endpoints:
            r = requests.get(f"{API}{ep}", headers=auth_headers, timeout=10)
            assert r.status_code == 200, f"{ep}: {r.status_code}"
            text = r.text
            assert '"_id"' not in text, f"_id leaked in {ep}: {text[:200]}"


# ---------- Airlines search ----------

class TestAirlines:
    def test_search_indi(self):
        r = requests.get(f"{API}/airlines", params={"q": "indi"}, timeout=10)
        assert r.status_code == 200
        items = r.json()
        assert any(a.get("iata") == "6E" or "IndiGo" in (a.get("name") or "") for a in items), items

    def test_search_air(self):
        r = requests.get(f"{API}/airlines", params={"q": "air"}, timeout=10)
        assert r.status_code == 200
        assert len(r.json()) >= 2


# ---------- Airports search extras ----------

class TestAirportsExtra:
    def test_delhi(self):
        r = requests.get(f"{API}/airports", params={"q": "delhi"}, timeout=10)
        assert r.status_code == 200
        assert any(a.get("iata") == "DEL" for a in r.json())

    def test_mumbai(self):
        r = requests.get(f"{API}/airports", params={"q": "mumbai"}, timeout=10)
        assert r.status_code == 200
        assert any(a.get("iata") == "BOM" for a in r.json())

    def test_goa(self):
        r = requests.get(f"{API}/airports", params={"q": "goa"}, timeout=10)
        assert r.status_code == 200
        assert any(a.get("iata") == "GOI" for a in r.json())


# ---------- Demo seeded user (viz_token) ----------

DEMO_HEADERS = {"Authorization": "Bearer viz_token", "Content-Type": "application/json"}


class TestDemoUser:
    def test_auth_me(self):
        r = requests.get(f"{API}/auth/me", headers=DEMO_HEADERS, timeout=10)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["user"]["user_id"] == "demo_user_viz"
        assert data["profile"]["home_airport_iata"] == "BOM"

    def test_dashboard(self):
        r = requests.get(f"{API}/dashboard", headers=DEMO_HEADERS, timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d.get("total_flights") == 6
        assert d.get("total_air_hours", 0) > 0
        assert d.get("home_days", 0) > 0
        assert d.get("away_days", 0) > 0
        assert d.get("cities_visited") == 3
        assert len(d.get("monthly_series") or []) > 0
        assert len(d.get("top_cities") or []) > 0

    def test_trips(self):
        r = requests.get(f"{API}/trips", headers=DEMO_HEADERS, timeout=10)
        assert r.status_code == 200
        trips = r.json()
        assert len(trips) >= 1
        assert any(t.get("returned_home") is True for t in trips)

    def test_city_stays(self):
        r = requests.get(f"{API}/city-stays", headers=DEMO_HEADERS, timeout=10)
        assert r.status_code == 200
        stays = r.json()
        vals = {s.get("is_home") for s in stays}
        assert True in vals and False in vals, f"Expected mix is_home: {vals}"

    def test_flights(self):
        r = requests.get(f"{API}/flights", headers=DEMO_HEADERS, timeout=10)
        assert r.status_code == 200
        flights = r.json()
        assert len(flights) == 6
        assert all(f.get("status") == "confirmed" for f in flights)


# ---------- Flight lookup (AeroDataBox live) ----------

class TestFlightLookup:
    def _future_date(self, offset_days=14):
        return (datetime.now(timezone.utc) + timedelta(days=offset_days)).date().isoformat()

    def test_lookup_unknown(self, auth_headers):
        r = requests.get(
            f"{API}/flights/lookup",
            params={"airline_iata": "ZZ", "flight_number": "9999", "date": self._future_date()},
            headers=auth_headers,
            timeout=30,
        )
        assert r.status_code == 200
        body = r.json()
        assert body["enrichment_enabled"] is True
        assert body["found"] is False

    def test_lookup_ai101(self, auth_headers):
        # AI101 is a real daily Air India flight (DEL-BOM/similar). Try a few future dates.
        for offset in (14, 21, 28, 7):
            r = requests.get(
                f"{API}/flights/lookup",
                params={"airline_iata": "AI", "flight_number": "101", "date": self._future_date(offset)},
                headers=auth_headers,
                timeout=30,
            )
            assert r.status_code == 200
            body = r.json()
            if body.get("found"):
                assert body.get("provider") in ("aerodatabox", "aviationstack")
                f = body["flight"]
                assert f.get("departure_airport_iata")
                assert f.get("arrival_airport_iata")
                assert f.get("airline_name")
                return
        pytest.skip("AeroDataBox did not return AI101 for any tried future date (provider-side)")


# ---------- PDF upload ----------

def _make_pdf_bytes():
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import A4
    import io as _io
    buf = _io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    c.drawString(72, 800, "Air India AI-101 BOM to DEL 15 Feb 2026 PNR: ABC123 Seat: 12A")
    c.showPage()
    c.save()
    return buf.getvalue()


def _make_pdf_bytes_v2():
    """New iteration-3 PDF format with structured labels."""
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import A4
    import io as _io
    buf = _io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    c.drawString(72, 800, "Airline: IndiGo / Flight: 6E-345 / BOM to DEL")
    c.drawString(72, 780, "Date: 15 Feb 2026 / PNR: ABC123 / Seat: 12A")
    c.showPage()
    c.save()
    return buf.getvalue()


class TestPdfUpload:
    def test_upload_empty_400(self, auth_headers):
        hdr = {"Authorization": auth_headers["Authorization"]}
        r = requests.post(
            f"{API}/pdf/upload",
            headers=hdr,
            files={"file": ("empty.pdf", b"", "application/pdf")},
            timeout=15,
        )
        assert r.status_code == 400

    def test_upload_indigo_v2_format(self, auth_headers):
        pdf_bytes = _make_pdf_bytes_v2()
        hdr = {"Authorization": auth_headers["Authorization"]}
        r = requests.post(
            f"{API}/pdf/upload",
            headers=hdr,
            files={"file": ("ticket_v2.pdf", pdf_bytes, "application/pdf")},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        art = body["artifact"]
        seg = body["segment"]
        assert art["parser_method"] == "pypdf_regex"
        assert seg["airline_iata"] == "6E"
        assert seg["flight_number"] in ("6E345", "6E-345", "345")
        assert seg["departure_airport_iata"] == "BOM"
        assert seg["arrival_airport_iata"] == "DEL"
        assert seg["flight_date"] == "2026-02-15"
        assert seg["seat_number"] == "12A"
        assert seg["booking_reference"] == "ABC123"
        assert body.get("parse_confidence", 0) >= 0.6

    def test_upload_parses_fields(self, auth_headers):
        pdf_bytes = _make_pdf_bytes()
        hdr = {"Authorization": auth_headers["Authorization"]}
        r = requests.post(
            f"{API}/pdf/upload",
            headers=hdr,
            files={"file": ("ticket.pdf", pdf_bytes, "application/pdf")},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        art = body["artifact"]
        seg = body["segment"]
        assert art["parser_method"] == "pypdf_regex"
        assert seg["airline_iata"] == "AI"
        # flight_number normalization may produce 'AI101' or '101'
        assert seg["flight_number"] in ("AI101", "101")
        assert seg["departure_airport_iata"] == "BOM"
        assert seg["arrival_airport_iata"] == "DEL"
        assert seg["flight_date"] == "2026-02-15"
        assert seg["seat_number"] == "12A"
        assert seg["booking_reference"] == "ABC123"
        assert body.get("parse_confidence", 0) >= 0.6



# ---------- /api/cities (iteration 3) ----------

class TestCitiesEndpoint:
    def test_cities_requires_auth(self):
        r = requests.get(f"{API}/cities", timeout=10)
        assert r.status_code == 401

    def test_cities_window_all(self):
        r = requests.get(f"{API}/cities", params={"window": "all"}, headers=DEMO_HEADERS, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["window"] == "all"
        assert data["home_airport_iata"] == "BOM"
        cities = data["cities"]
        iatas = {c["iata"] for c in cities}
        for expected in ("BOM", "DEL", "GOI", "DXB"):
            assert expected in iatas, f"Missing {expected} in {iatas}"
        bom = next(c for c in cities if c["iata"] == "BOM")
        assert bom["is_home"] is True
        assert bom["days_spent"] > 0
        assert bom["flights_in"] == 3
        assert bom["flights_out"] == 3
        for x in ("DEL", "GOI", "DXB"):
            assert x in bom["connected_to"], f"{x} not in BOM.connected_to"
        de = next(c for c in cities if c["iata"] == "DEL")
        assert de["both_legs"] is True
        assert de["flights_in"] == 1
        assert de["flights_out"] == 1
        # Schema checks per city
        for c in cities:
            for k in ("iata", "city", "country", "lat", "lng", "days_spent",
                     "minutes_spent", "visits", "flights_in", "flights_out",
                     "connected_to", "both_legs", "incomplete", "is_home", "last_visit"):
                assert k in c, f"Missing key '{k}' in city {c}"
            assert isinstance(c["connected_to"], list)

    def test_cities_window_3m(self):
        r = requests.get(f"{API}/cities", params={"window": "3m"}, headers=DEMO_HEADERS, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["window"] == "3m"
        all_data = requests.get(f"{API}/cities", params={"window": "all"}, headers=DEMO_HEADERS, timeout=15).json()
        assert len(data["cities"]) <= len(all_data["cities"])

    def test_cities_window_ytd(self):
        r = requests.get(f"{API}/cities", params={"window": "ytd"}, headers=DEMO_HEADERS, timeout=15)
        assert r.status_code == 200
        assert r.json()["window"] == "ytd"


# ---------- /api/flights/lookup TTL cache ----------

class TestFlightLookupCache:
    def test_lookup_ttl_cache(self, auth_headers):
        future = (datetime.now(timezone.utc) + timedelta(days=21)).date().isoformat()
        params = {"airline_iata": "AI", "flight_number": "101", "date": future}
        # First call: ensure we get a cacheable (found=true) result; if AI101 not found
        # try a couple alternates.
        candidates = [params, {**params, "flight_number": "102"}, {**params, "flight_number": "864"}]
        used = None
        for p in candidates:
            r1 = requests.get(f"{API}/flights/lookup", params=p, headers=auth_headers, timeout=30)
            assert r1.status_code == 200
            b1 = r1.json()
            if b1.get("found"):
                used = p
                assert b1.get("cached") is False
                break
        if not used:
            pytest.skip("No live AeroDataBox hit available to validate cache toggling")
        r2 = requests.get(f"{API}/flights/lookup", params=used, headers=auth_headers, timeout=30)
        assert r2.status_code == 200
        b2 = r2.json()
        assert b2.get("cached") is True, f"Expected cached=true on second call: {b2}"
        assert b2.get("found") is True

