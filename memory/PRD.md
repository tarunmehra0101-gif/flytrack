# Travel Ledger (Travel with Suba) — PRD

## Problem statement
Premium mobile-first personal travel ledger for frequent-travel consultants
(India-first). V1 is **barcode-first boarding-pass scanning** with PDF
e-ticket fallback. The user snaps a boarding pass, we decode IATA BCBP,
enrich live flight status via AeroDataBox, the user reviews/edits, and the
app builds a clean dashboard/timeline/map of their travel.

## Architecture
- Frontend: React (CRA) + Tailwind + shadcn/ui + framer-motion + Recharts +
  Leaflet + OpenStreetMap. `@zxing/browser` for barcode decode in-browser.
- Backend: FastAPI + Motor + MongoDB. Python IATA BCBP M1 parser,
  pypdf+regex for PDF e-ticket parsing, AeroDataBox (RapidAPI) primary with
  AviationStack fallback behind a clean adapter — fail-open if keys are missing.
- Auth: Emergent-managed Google OAuth, session stored in `user_sessions`
  collection + httpOnly cookie (bearer fallback).
- Layout: centered portrait phone shell (max-w 430px) with sticky top bar
  and sticky bottom tab nav (Home, Timeline, Add, Map, Settings).

## Data model (MongoDB)
users, user_sessions, user_profiles, artifacts, parsed_segments,
confirmed_segments, trips, city_stays, monthly_stats. Airport + airline
data seeded in-process (66 airports, 31 airlines — India tier-1/2/3 plus
major hubs).

## Implemented features (2026-02)
### Backend
- `/api/auth/session`, `/api/auth/me`, `/api/auth/logout` — Emergent Google OAuth
- `/api/profile` GET/PATCH
- `/api/airports?q=` and `/api/airlines?q=` — autocomplete
- `/api/boarding-pass/decode` (public) and `/api/boarding-pass/ingest` — BCBP M1 parser with confidence scoring
- `/api/pdf/upload` — pypdf + regex e-ticket parser (airline, flight#, route, date, PNR, seat, passenger name)
- `/api/flights/lookup?airline&flight&date` — live "Fetch flight details" button backing
- `/api/flights/manual` — manual entry with post-save enrichment
- `/api/segments/pending|{id}|confirm` — review/edit/confirm flow
- `/api/flights`, `/api/trips`, `/api/city-stays`, `/api/dashboard`, `/api/monthly-stats`
- `/api/artifacts` list/delete with cascading confirmed-segment cleanup
- `/api/recompute` — rebuild trips/stays/monthly-stats
- Analytics: trip grouping (home-departure→home-return), city-stay derivation,
  great-circle duration estimate fallback for missing enrichment
- Dedupe: canonical hash on airline+flight#+route+date+PNR

### Frontend
- Splash with Google sign-in (Pexels airplane-window hero, Indian-flyer copy)
- 2-step onboarding (name, home airport via autocomplete)
- Home dashboard: hero insight, 4 KPI tiles with count-ups, home-vs-away
  radial ring, monthly flights area chart, top cities leaderboard,
  top route + top airline cards
- Add flight tab: camera/gallery boarding-pass upload, PDF upload, paste
  code dialog, manual-entry dialog with airline autocomplete (with real
  logos via pics.avs.io), airport autocomplete, "Fetch flight details"
  button backed by AeroDataBox
- Review screen: inline field editing, low-confidence banner, confirm/discard
- Timeline: trips grouped with home-run/open badges, expandable segments,
  city-stay durations
- Map: Leaflet + OSM, 8-color palette for route arcs (dashed Polyline curves),
  intensity-colored airport markers (emerald/sky/amber by visit count),
  time-range filter chips, stats panel
- Settings: profile + home airport edit (autocomplete), dark/light toggle,
  recompute, delete all data, sign out
- Portrait phone shell applied globally (dark-first, Manrope type)
- Airline logos everywhere via `AirlineLogo` component
- Copy: India-friendly, jargon-free (no "decoded"/"conf %"/"parsed")

## Deferred to v2
- Resend monthly recap emails
- Live camera scanner (continuous decode loop)
- Live-image OCR for boarding pass photos without barcode
- Gmail sync
- Forwarding inbox alias
- Visa/passport day counting

## Env vars
`/app/backend/.env`:
- `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS` (standard)
- `RAPIDAPI_KEY` (enables AeroDataBox)
- `AERODATABOX_HOST` (default `aerodatabox.p.rapidapi.com`)
- `AVIATIONSTACK_KEY` (optional fallback)

## Test credentials
See `/app/memory/test_credentials.md`. Pre-seeded demo user:
session_token=`viz_token`, user_id=`demo_user_viz`, 6 confirmed flights.

## Next tasks (P1/P2)
- **P1** Cache `/api/flights/lookup` in-process (10 min TTL) to conserve
  RapidAPI quota on repeated "Fetch details" clicks
- **P1** Add provenance flag on segment so UI shows when enrichment
  augmented a manually-entered field
- **P2** Live camera scanner with continuous decode loop
- **P2** Shareable year-in-review recap card (PNG export)
- **P2** Resend monthly recap emails
