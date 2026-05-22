# Ryoko v2.3 Production-Readiness Audit & Review Report

This report provides a systematic, file-by-file architectural and functional audit of the **Ryoko (v2.3) Flight Timeline** application. Ryoko is a high-performance, hybrid local-first flight tracking platform utilizing a React PWA frontend (with IndexedDB and Supabase syncing) and a FastAPI + MongoDB backend.

The audit focuses on identifying blocking issues, security/sync vulnerabilities, UI/UX bugs, and architectural conflicts that must be resolved to make the platform **production-ready**.

---

## 1. Critical & Blocker Vulnerabilities

### 1.1. Profile Sync Data Loss & Loop Overwrite (Settings/Auth Bridge)
* **Status**: **BLOCKER**
* **Affected Files**:
  * [Settings.jsx](file:///Users/kumarlouhit/Documents/flytrack-main/frontend/src/pages/Settings.jsx#L47-L65)
  * [supabaseSync.js](file:///Users/kumarlouhit/Documents/flytrack-main/frontend/src/lib/supabaseSync.js)
  * [AuthContext.jsx](file:///Users/kumarlouhit/Documents/flytrack-main/frontend/src/contexts/AuthContext.jsx#L70-L74)
* **Vulnerability Description**:
  When updating profile settings (e.g. `preferred_name` or `home_airport_iata`), the profile is updated locally using `api.patch("/profile", updates)`. When local-first mode is active (`REACT_APP_LOCAL_FIRST=true`), this call is intercepted in `api.js` and handled by `updateLocalProfile()` which writes directly to the local IndexedDB. 
  
  However, **there is no sync mechanism to push profile updates to Supabase**. `supabaseSync.js` contains no `pushProfileToSupabase()` function, and the dirty-sync checks only process flights. 
  
  Worse, during the application bootstrap or session refresh in `AuthContext.jsx` (`fetchMe`), the app runs:
  ```javascript
  const ledger = await pullSupabaseLedger();
  if (ledger) await importLedger({ ...ledger, profile: ledger.profile || nextProfile }, { replaceFlights: true });
  ```
  This pull fetches the stale profile row from Supabase and **instantly overwrites the local IndexedDB profile**. Consequently, any settings saved by the user are silently reverted upon the next page reload or OAuth session refresh.
* **Structural Resolution**:
  1. Add a `pushProfileToSupabase(profile)` method inside `supabaseSync.js` that inserts/updates the `profiles` table.
  2. Modify `updateLocalProfile()` in `localLedger.js` to trigger a push to Supabase if Supabase is enabled.
  3. Ensure `fetchMe` resolves local vs. remote updates using a timestamp-based conflict-resolution strategy (`updated_at` field).

---

### 1.2. 3D Globe View Coordinate Crash
* **Status**: **CRITICAL**
* **Affected Files**:
  * [3d-globe.jsx](file:///Users/kumarlouhit/Documents/flytrack-main/frontend/src/components/ui/3d-globe.jsx#L150-L157)
  * [MapPage.jsx](file:///Users/kumarlouhit/Documents/flytrack-main/frontend/src/pages/MapPage.jsx#L83-L92)
* **Vulnerability Description**:
  In `MapPage.jsx`, flight routes are structured in a useMemo callback to feed coordinate markers to the 3D globe:
  ```javascript
  const a = routeRows.map((x, i) => ({
    key: x.route,
    from: x.from, // may contain null or missing geocodes if airport database lacks records
    to: x.to,     // may contain null or missing geocodes
    count: x.count,
    color: ARC_PALETTE[i % ARC_PALETTE.length],
  }));
  ```
  In the `3d-globe.jsx` component, this array is processed without safety checks:
  ```javascript
  const arcData = (arcs || []).map((a) => ({
    startLat: a.from.lat,
    startLng: a.from.lng,
    endLat: a.to.lat,
    endLng: a.to.lng,
    ...
  }));
  ```
  If even a single airport in the user's travel ledger lacks geocoding entries in `globalAirports.generated.js` (resulting in a null `from` or `to` field), the render loop throws a fatal `TypeError: Cannot read properties of null (reading 'lat')`, breaking WebGL context and crashing the entire `Your world` view. (Note: `MapLibreTravelMap.jsx` handles this safely by filtering on `routeFeature` and `airportFeature`).
* **Structural Resolution**:
  Add safety checks and coordinate validation to filter out faulty routes in `3d-globe.jsx` before mapping coordinates:
  ```javascript
  const arcData = (arcs || [])
    .filter((a) => a?.from?.lat != null && a?.from?.lng != null && a?.to?.lat != null && a?.to?.lng != null)
    .map((a) => ({
      startLat: a.from.lat,
      startLng: a.from.lng,
      endLat: a.to.lat,
      endLng: a.to.lng,
      color: a.color || "#10b981",
      count: a.count || 1,
    }));
  ```

---

## 2. High-Level Architectural Mismatch & Security Gaps

### 2.1. Dual-Authentication & Split Footprint
* **Status**: **HIGH (Architectural Complexity)**
* **Affected Areas**: FastAPI Backend (`auth.py` / `server.py`) vs. Frontend Supabase Auth
* **Description**:
  The project contains a complete, functional cookie-and-session-based Google OAuth implementation in the FastAPI backend connected to MongoDB (`auth.py`), alongside a fully distinct client-side Supabase authentication system (`AuthContext.jsx`). 
  
  When Supabase is enabled, the client-side app completely bypasses the backend's Google OAuth flow. However, the client-side PWA still communicates with backend endpoints like `/pdf/upload`, `/boarding-pass/ingest`, and `/recompute`. The backend endpoints authenticate using standard bearer tokens `Depends(_auth)` which look up MongoDB sessions. This dual-auth footprint creates a coordination split:
  - If a user signs in via Supabase on the frontend, how is their backend FastAPI session synchronized? 
  - There is a "mock visualizer mode" bypassing auth via a raw token headers (`Authorization: Bearer viz_token`), but in standard production, this creates authorization bugs unless Supabase JWT validation is implemented as a middleware/dependency on the FastAPI server.
* **Recommendation**:
  Consolidate authentication. If Supabase is the primary production database, replace the backend MongoDB session checks with Supabase JWT verification. This verifies client tokens using the Supabase JWKS endpoint, aligning the backend with the frontend's security context.

---

### 2.2. Supabase Row-Level Security (RLS) Edge-Cases
* **Status**: **MEDIUM**
* **Affected File**: [schema.sql](file:///Users/kumarlouhit/Documents/flytrack-main/supabase/schema.sql#L127-L151)
* **Description**:
  Supabase RLS is configured perfectly for individual ownership:
  ```sql
  create policy "Flights are owned by user" on public.flights
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  ```
  However, `public.profiles` uses a trigger `on_auth_user_created` executing `public.handle_new_user()` to automatically populate a profile on registration. 
  
  In the profile settings form in `Settings.jsx`, we see profile insertions occurring via client-side libraries. There are no cascading triggers to automatically delete rows in auxiliary tables (`ticket_artifacts`, `analytics_snapshots`) when a user triggers account deletions. This leaves orphaned entries in Supabase if profile clear actions occur without precise constraint cascades.
* **Recommendation**:
  Confirm that `on delete cascade` constraints on foreign keys are correctly enforced and add database cascading triggers in `schema.sql` to sweep user-related details clean upon user purge events.

---

## 3. UI/UX & Fallback Degredations

### 3.1. Unsplash Source API Shutdown (Cities Skyline Fallback)
* **Status**: **MEDIUM (UX Defect)**
* **Affected File**: [Cities.jsx](file:///Users/kumarlouhit/Documents/flytrack-main/frontend/src/pages/Cities.jsx#L78-L82)
* **Description**:
  To render cityscape banners, the frontend relies on a hardcoded preset mapping of high-quality skyline images (`CITY_IMAGES`). For non-preset cities, it falls back to:
  ```javascript
  if (cityName) return `https://source.unsplash.com/600x400/?${encodeURIComponent(cityName)}+city+skyline`;
  ```
  **Unsplash officially terminated the `source.unsplash.com` endpoint in early 2024.** Consequently, any city not in the curated preset list (which covers only ~50 codes) returns a broken link, triggers the `onError` image handler, and falls back to a generic wing-view background image (`DEFAULT_CITY_IMAGE`). This degrades the layout's dynamic feel, making custom logged cities look generic.
* **Recommendation**:
  Transition from `source.unsplash.com` to a modern public image source or implement dynamic text-based gradients that reflect the city's timezone/vibe (e.g. dawn, dusk, night) rather than pulling dead endpoints. Alternatively, use standard Unsplash developer APIs or Pexels free search queries in the backend to fetch skyline graphics dynamically.

---

### 3.2. Responsive Overflow on Navigation Shells
* **Status**: **LOW (UI Polish)**
* **Affected Files**:
  * [Shell.jsx](file:///Users/kumarlouhit/Documents/flytrack-main/frontend/src/components/shell/Shell.jsx)
  * [MapPage.jsx](file:///Users/kumarlouhit/Documents/flytrack-main/frontend/src/pages/MapPage.jsx#L99-L105)
* **Description**:
  The application utilizes strict desktop-like shell sizes on mobile viewport ratios. The interactive control overlays in `MapPage.jsx` (such as year chips and timeline replays) sit on top of MapLibre/WebGL layers. On smaller viewports (e.g., iPhone SE), these overlays overlap with shell titles, reducing touch targets and interfering with standard scroll behaviors.
* **Recommendation**:
  Apply responsive container padding offsets (`sm:`, `md:`, `lg:`) and use clear backgrounds inside control overlays to prevent button collisions on minimal screen widths.

---

## 4. Backend & Analytics Modeling Anomalies

### 4.1. Chronological Gap & "Teleportation" Stays
* **Status**: **MEDIUM (Analytics Skew)**
* **Affected File**: [analytics.py](file:///Users/kumarlouhit/Documents/flytrack-main/backend/services/analytics.py#L225-L250)
* **Description**:
  The analytics stay generation algorithm in `build_presence_windows` assumes a contiguous chronological travel log. When generating layovers or city stays, it calculates the gap between two segments:
  ```python
  stay_end = next_dep or now
  if arr and stay_end > arr:
      # Prev arrival airport used to estimate city stays until next departure airport
      add_window(
          "home" if home and arr_iata == home else "city",
          airport_buffer_end,
          next_airport_start,
          airport_iata=arr_iata,
          city_name=seg.get("arrival_city_name") or arr_meta.get("city") or arr_iata,
          ...
      )
  ```
  If there is a flight gap in the user's travel logs (e.g. Flight 1 arrives at Delhi `DEL`, and Flight 2 departs from Tokyo `HND` weeks later), the program assumes the user stayed at Delhi (`DEL`) for the entire duration and instantly "teleported" to Tokyo right before Flight 2's departure. This distorts "days spent" in cities, credit metrics, and dashboard stay timelines.
* **Recommendation**:
  Detect coordinate/airport changes between adjacent flights where arrival != next departure. When a gap is found:
  1. Flag the segment transition as an "incomplete timeline".
  2. Distribute stay statistics cautiously or split the stay window into two (e.g. spending 50% at destination and 50% at origin, or logging an "Unknown/Transit location" stay) to avoid allocating impossible stay durations to a single city.

---

## 5. Production Checklist

To achieve a production-ready standard, the following items must be verified:

| File / Component | Issue / Metric | Class | Impact | Action Required |
| :--- | :--- | :--- | :--- | :--- |
| `Settings.jsx` / `supabaseSync.js` | Profile sync overwrite loop | Sync / Blocker | Stale configuration / Storing fails | Build client-to-Supabase profile syncing triggers |
| `3d-globe.jsx` | WebGL Null coordinate crash | Render / Critical | Complete visualization crash | Ensure coordinates are sanitized and validated |
| `Cities.jsx` | Dead Unsplash image links | Asset / UX | Skyline fallback images break | Pivot to gradient cards or standard API search |
| `analytics.py` | Teleportation stay assumptions | Modeling | Skewed analytics stats | Flag gaps in adjacent flight segments |
| FastAPI / Supabase | Dual-auth security split | Architecture | Multi-auth coordination | Align REST API dependencies with Supabase JWTs |

---

### Summary Conclusion
Ryoko's visual aesthetics, offline-first IndexedDB system, and parsing pipelines (Gemini and regex fallbacks) are **incredibly well-designed** and represent a high-tier travel dashboard. Resolving the Profile Sync Loop and 3D Globe Crash will secure the system's core stability, ensuring a seamless user experience in production.
