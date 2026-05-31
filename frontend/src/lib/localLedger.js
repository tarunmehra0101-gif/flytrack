import { parseBcbp } from "@/lib/bcbpParser";
import { AIRLINES, AIRPORTS } from "@/data/airports";
import { lookupCatalogFlight, searchFlightCatalog } from "@/data/flightCatalog";
import { parseTicketText } from "@/lib/ticketParser";
import { extractPdfText } from "@/lib/ticketText";
import { deleteFlightFromSupabase, pushFlightToSupabase, deleteAllSupabaseData, pushProfileToSupabase } from "@/lib/supabaseSync";
import { supabase, supabaseEnabled } from "@/lib/supabaseClient";

const DB_NAME = "ryoko_local_ledger";
const DB_VERSION = 1;
const USER_ID = "local_user";
const SESSION_KEY = "ryoko_local_session";
const DIRTY_KEY = "analytics_dirty";

const STORE_NAMES = ["kv", "flights", "segments", "artifacts", "notes"];

function nowIso() {
  return new Date().toISOString();
}

function uid(prefix) {
  if (prefix === "segment" || prefix === "artifact" || prefix === "flight") {
    return generateUuid();
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}


function generateUuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function supabaseUserId() {
  if (!supabaseEnabled) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      STORE_NAMES.forEach((name) => {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: "id" });
      });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(storeName, mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(storeName, mode);
    const store = t.objectStore(storeName);
    const result = fn(store);
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }).finally(() => db.close());
}

function request(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function all(store) {
  if (supabaseEnabled) {
    const userId = await supabaseUserId();
    if (!userId) return [];
    if (store === "flights") {
      const { data, error } = await supabase
        .from("flights")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "confirmed")
        .order("departure_time_utc", { ascending: true });
      if (error) {
        console.warn("Supabase all flights error:", error);
        return [];
      }
      return data || [];
    }
    if (store === "segments") {
      const { data, error } = await supabase
        .from("flights")
        .select("*")
        .eq("user_id", userId)
        .in("status", ["pending_review", "parsed"])
        .order("created_at", { ascending: true });
      if (error) {
        console.warn("Supabase all segments error:", error);
        return [];
      }
      return data || [];
    }
    if (store === "artifacts") {
      const { data, error } = await supabase
        .from("ticket_artifacts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      if (error) {
        console.warn("Supabase all artifacts error:", error);
        return [];
      }
      return data || [];
    }
    return [];
  }
  return tx(store, "readonly", (s) => request(s.getAll()));
}

async function get(store, id) {
  if (supabaseEnabled) {
    const userId = await supabaseUserId();
    if (!userId) return null;
    if (store === "flights" || store === "segments") {
      const { data, error } = await supabase
        .from("flights")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) {
        console.warn("Supabase get flight/segment error:", error);
        return null;
      }
      return data;
    }
    if (store === "artifacts") {
      const { data, error } = await supabase
        .from("ticket_artifacts")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) {
        console.warn("Supabase get artifact error:", error);
        return null;
      }
      return data;
    }
    return null;
  }
  return tx(store, "readonly", (s) => request(s.get(id)));
}

const FLIGHT_COLUMNS = [
  "id", "user_id", "source_parsed_segment_id", "source_type", "airline_iata", "airline_name", "flight_number", "passenger_name", "booking_reference", "pnr", "ticket_number", "departure_airport_iata", "arrival_airport_iata", "departure_city_name", "arrival_city_name", "departure_country_code", "arrival_country_code", "departure_lat", "departure_lng", "arrival_lat", "arrival_lng", "departure_time_utc", "arrival_time_utc", "departure_time_local", "arrival_time_local", "flight_date", "flight_duration_minutes", "duration_source", "time_confidence", "distance_km", "aircraft_type", "cabin_class", "seat_number", "terminal_departure", "terminal_arrival", "gate", "route", "confidence", "confidence_score", "parser_rule", "missing_fields", "canonical_hash", "status", "created_at", "updated_at"
];

const ARTIFACT_COLUMNS = [
  "id", "user_id", "source_type", "original_filename", "display_title", "parser_status", "parse_confidence", "parser_method", "parser_error", "created_at", "updated_at", "raw_text"
];

function cleanFlightRow(doc) {
  const next = {};
  FLIGHT_COLUMNS.forEach((col) => {
    if (doc[col] !== undefined) next[col] = doc[col];
  });
  return next;
}

function cleanArtifactRow(doc) {
  const next = {};
  ARTIFACT_COLUMNS.forEach((col) => {
    if (doc[col] !== undefined) next[col] = doc[col];
  });
  return next;
}

async function put(store, doc) {
  if (supabaseEnabled) {
    const userId = await supabaseUserId();
    if (!userId) return doc;
    const nextDoc = { ...doc, user_id: userId, updated_at: nowIso() };
    if (!nextDoc.id || !String(nextDoc.id).match(/^[0-9a-f-]{36}$/i)) {
      nextDoc.id = generateUuid();
    }
    if (store === "flights") {
      nextDoc.status = nextDoc.status || "confirmed";
      const cleaned = cleanFlightRow(nextDoc);
      const { data, error } = await supabase
        .from("flights")
        .upsert(cleaned)
        .select()
        .single();
      if (error) {
        console.warn("Supabase put flight error:", error);
        throw error;
      }
      return data;
    }
    if (store === "segments") {
      nextDoc.status = nextDoc.status || "pending_review";
      const cleaned = cleanFlightRow(nextDoc);
      const { data, error } = await supabase
        .from("flights")
        .upsert(cleaned)
        .select()
        .single();
      if (error) {
        console.warn("Supabase put segment error:", error);
        throw error;
      }
      return data;
    }
    if (store === "artifacts") {
      const cleaned = cleanArtifactRow(nextDoc);
      const { data, error } = await supabase
        .from("ticket_artifacts")
        .upsert(cleaned)
        .select()
        .single();
      if (error) {
        console.warn("Supabase put artifact error:", error);
        throw error;
      }
      return data;
    }
    return doc;
  }
  await tx(store, "readwrite", (s) => s.put(doc));
  return doc;
}

async function del(store, id) {
  if (supabaseEnabled) {
    const userId = await supabaseUserId();
    if (!userId) return;
    if (store === "flights" || store === "segments") {
      const { error } = await supabase
        .from("flights")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (error) console.warn("Supabase delete flight/segment error:", error);
      return;
    }
    if (store === "artifacts") {
      const { error } = await supabase
        .from("ticket_artifacts")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (error) console.warn("Supabase delete artifact error:", error);
      return;
    }
    return;
  }
  await tx(store, "readwrite", (s) => s.delete(id));
}

async function clear(store) {
  if (supabaseEnabled) {
    const userId = await supabaseUserId();
    if (!userId) return;
    if (store === "flights") {
      await supabase.from("flights").delete().eq("user_id", userId).eq("status", "confirmed");
    } else if (store === "segments") {
      await supabase.from("flights").delete().eq("user_id", userId).eq("status", "pending_review");
    } else if (store === "artifacts") {
      await supabase.from("ticket_artifacts").delete().eq("user_id", userId);
    }
    return;
  }
  await tx(store, "readwrite", (s) => s.clear());
}

async function getKv(id, fallback = null) {
  if (supabaseEnabled) {
    const userId = await supabaseUserId();
    if (!userId) return fallback;
    if (id === "profile") {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (error) console.warn("Supabase get profile error:", error);
      return data || fallback;
    }
    if (id.startsWith("dashboard_") || id.startsWith("wrapped_")) {
      const parts = id.split("_");
      const key = parts[0];
      const year = parts[1] === "all" ? 0 : Number(parts[1]);
      const { data, error } = await supabase
        .from("analytics_snapshots")
        .select("*")
        .eq("user_id", userId)
        .eq("year", year)
        .maybeSingle();
      if (error) console.warn("Supabase get analytics error:", error);
      if (data) {
        return key === "dashboard" ? data.dashboard : data.wrapped;
      }
      return fallback;
    }
    try {
      const v = localStorage.getItem(`ryoko_kv_${id}`);
      return v ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  }
  const row = await get("kv", id);
  return row ? row.value : fallback;
}

async function setKv(id, value) {
  if (supabaseEnabled) {
    const userId = await supabaseUserId();
    if (!userId) return { id, value };
    if (id === "profile") {
      const { data, error } = await supabase
        .from("profiles")
        .upsert({ ...value, id: userId, updated_at: nowIso() })
        .select()
        .single();
      if (error) {
        console.warn("Supabase set profile error:", error);
        throw error;
      }
      return data;
    }
    if (id.startsWith("dashboard_") || id.startsWith("wrapped_")) {
      const parts = id.split("_");
      const key = parts[0];
      const year = parts[1] === "all" ? 0 : Number(parts[1]);
      const { data: existing } = await supabase
        .from("analytics_snapshots")
        .select("*")
        .eq("user_id", userId)
        .eq("year", year)
        .maybeSingle();
      const snapshot = {
        user_id: userId,
        year,
        dashboard: key === "dashboard" ? value : (existing?.dashboard || {}),
        wrapped: key === "wrapped" ? value : (existing?.wrapped || {}),
        updated_at: nowIso()
      };
      if (existing) snapshot.id = existing.id;
      const { data, error } = await supabase
        .from("analytics_snapshots")
        .upsert(snapshot)
        .select()
        .single();
      if (error) console.warn("Supabase set analytics error:", error);
      return data;
    }
    try {
      localStorage.setItem(`ryoko_kv_${id}`, JSON.stringify(value));
    } catch {}
    return { id, value };
  }
  return put("kv", { id, value, updated_at: nowIso() });
}

async function markDirty() {
  const current = await getKv("analytics_revision", 0);
  await setKv("analytics_revision", current + 1);
  await setKv(DIRTY_KEY, true);
}

export function hasLocalSession() {
  return localStorage.getItem(SESSION_KEY) === "1";
}

export function startLocalSession() {
  localStorage.setItem(SESSION_KEY, "1");
}

export function endLocalSession() {
  localStorage.removeItem(SESSION_KEY);
}

export async function getLocalProfile() {
  const profile = await getKv("profile", null);
  if (profile) return profile;
  const initial = {
    user_id: USER_ID,
    preferred_name: "",
    home_city_name: null,
    home_airport_iata: null,
    home_country_code: null,
    work_city_name: null,
    travel_profile_type: "frequent_flyer",
    onboarding_completed: false,
    theme_preference: "dark",
    units_preference: "metric",
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  await setKv("profile", initial);
  return initial;
}

export async function updateLocalProfile(updates) {
  const current = await getLocalProfile();
  const next = { ...current, ...(updates || {}), updated_at: nowIso() };
  await setKv("profile", next);
  if (supabaseEnabled) {
    await pushProfileToSupabase(next);
  }
  await markDirty();
  return next;
}

export function localUser() {
  return { user_id: USER_ID, email: null, name: "Private Ledger", picture: null, local_first: true };
}

function airport(iata) {
  return AIRPORTS[String(iata || "").toUpperCase()] || null;
}

function airlineName(iata) {
  return AIRLINES[String(iata || "").toUpperCase()] || String(iata || "").toUpperCase();
}

function minutesBetween(a, b) {
  if (!a || !b) return 0;
  const mins = Math.round((new Date(b) - new Date(a)) / 60000);
  return Number.isFinite(mins) ? Math.max(0, mins) : 0;
}

function localDateTimeIso(date, time) {
  if (!date || !time) return null;
  const match = String(time).match(/(\d{1,2})[:.](\d{2})/);
  if (!match) return null;
  return `${date}T${match[1].padStart(2, "0")}:${match[2]}:00.000Z`;
}

function haversineKm(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return null;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const lat1 = a.lat * rad;
  const lat2 = b.lat * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(6371 * 2 * Math.asin(Math.sqrt(h)));
}

function normalizeFlight(raw) {
  const flightDate = raw.flight_date || raw.departure_date_local || raw.departure_time_utc?.slice(0, 10) || null;
  const departureUtc = raw.departure_time_utc || localDateTimeIso(flightDate, raw.departure_time_local);
  const arrivalUtc = raw.arrival_time_utc || localDateTimeIso(flightDate, raw.arrival_time_local);
  const depIata = String(raw.departure_airport_iata || "").toUpperCase();
  const arrIata = String(raw.arrival_airport_iata || "").toUpperCase();
  const dep = airport(depIata);
  const arr = airport(arrIata);
  const distance = raw.distance_km || haversineKm(dep, arr);
  const duration = raw.flight_duration_minutes ||
    minutesBetween(departureUtc, arrivalUtc) ||
    (distance ? Math.round((distance / 800) * 60 + 20) : 0);
  const computedArrivalUtc = arrivalUtc || (departureUtc && duration ? new Date(new Date(departureUtc).getTime() + duration * 60000).toISOString() : null);
  return {
    id: raw.id || uid("flight"),
    source_parsed_segment_id: raw.source_parsed_segment_id || raw.id || null,
    status: (raw.status === "confirmed" || raw.status === "duplicate") ? raw.status : "confirmed",
    source_type: raw.source_type || "manual_entry",
    airline_iata: String(raw.airline_iata || "").toUpperCase(),
    airline_name: raw.airline_name || airlineName(raw.airline_iata),
    flight_number: raw.flight_number || "",
    booking_reference: raw.booking_reference || null,
    pnr: raw.pnr || raw.booking_reference || null,
    ticket_number: raw.ticket_number || null,
    passenger_name: raw.passenger_name || null,
    parser_rule: raw.parser_rule || null,
    confidence: raw.confidence || raw.time_confidence || null,
    confidence_score: raw.confidence_score || null,
    missing_fields: raw.missing_fields || [],
    departure_airport_iata: depIata,
    arrival_airport_iata: arrIata,
    departure_city_name: raw.departure_city_name || dep?.city || depIata,
    arrival_city_name: raw.arrival_city_name || arr?.city || arrIata,
    departure_country_code: raw.departure_country_code || dep?.country || null,
    arrival_country_code: raw.arrival_country_code || arr?.country || null,
    departure_lat: dep?.lat,
    departure_lng: dep?.lng,
    arrival_lat: arr?.lat,
    arrival_lng: arr?.lng,
    departure_time_utc: departureUtc || null,
    arrival_time_utc: computedArrivalUtc || null,
    departure_time_local: raw.departure_time_local || null,
    arrival_time_local: raw.arrival_time_local || null,
    flight_date: flightDate,
    flight_duration_minutes: duration,
    duration_source: raw.duration_source || (departureUtc && arrivalUtc ? "scheduled" : "estimated"),
    time_confidence: raw.time_confidence || (departureUtc && arrivalUtc ? "scheduled" : departureUtc ? "visible_on_ticket" : "estimated"),
    distance_km: distance,
    aircraft_type: raw.aircraft_type || null,
    cabin_class: raw.cabin_class || "Economy",
    seat_number: raw.seat_number || null,
    terminal_departure: raw.terminal_departure || raw.departure_terminal || null,
    terminal_arrival: raw.terminal_arrival || raw.arrival_terminal || null,
    gate: raw.gate || raw.departure_gate || null,
    route: depIata && arrIata ? `${depIata}-${arrIata}` : null,
    canonical_hash: raw.canonical_hash || canonicalHash(raw),
    created_at: raw.created_at || nowIso(),
    updated_at: nowIso(),
  };
}

function canonicalHash(raw) {
  return [
    raw.airline_iata,
    raw.flight_number,
    raw.departure_airport_iata,
    raw.arrival_airport_iata,
    raw.flight_date || raw.departure_time_utc?.slice(0, 10),
    raw.booking_reference,
  ].map((x) => String(x || "").toUpperCase()).join("|");
}

function fullFlightNumber(airline, value) {
  const code = String(airline || "").toUpperCase();
  const raw = String(value || "").toUpperCase().replace(/\s+/g, "");
  const bare = code && raw.startsWith(code) ? raw.slice(code.length) : raw;
  return `${code}${bare}`.trim();
}

function splitFlightNumber(value, fallbackAirline = "") {
  const raw = String(value || "").toUpperCase().replace(/\s+/g, "");
  const match = raw.match(/^([A-Z0-9]{2})(\d{1,5}[A-Z]?)$/);
  if (match) return { airline: match[1], number: match[2], full: `${match[1]}${match[2]}` };
  const airline = String(fallbackAirline || "").toUpperCase();
  return { airline, number: airline && raw.startsWith(airline) ? raw.slice(airline.length) : raw, full: fullFlightNumber(airline, raw) };
}

function dateFromBcbp(dayOfYear) {
  if (!dayOfYear) return null;
  const currentYear = new Date().getFullYear();
  const dt = new Date(Date.UTC(currentYear, 0, Number(dayOfYear)));
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString().slice(0, 10);
}

function segmentFromBcbpLeg(leg, data, sourceType, artifactId, index) {
  const airline = leg.operatingCarrierDesignator || leg.marketingCarrierDesignator || "";
  const flightNo = String(leg.flightNumber || "").trim();
  const flightDate = leg.flightDate instanceof Date
    ? leg.flightDate.toISOString().slice(0, 10)
    : dateFromBcbp(leg.flightDate);
  const dep = String(leg.departureAirport || "").trim().toUpperCase();
  const arr = String(leg.arrivalAirport || "").trim().toUpperCase();
  return decorateSegment({
    id: uid("segment"),
    artifact_id: artifactId,
    source_type: sourceType,
    sequence_index: index,
    airline_iata: String(airline).trim().toUpperCase(),
    airline_name: airlineName(airline),
    flight_number: `${String(airline).trim().toUpperCase()}${flightNo}`.trim(),
    booking_reference: leg.operatingCarrierPNR || data?.operatingCarrierPNR || null,
    pnr: leg.operatingCarrierPNR || data?.operatingCarrierPNR || null,
    passenger_name: normalizePassengerName(data?.passengerName),
    departure_airport_iata: dep,
    arrival_airport_iata: arr,
    flight_date: flightDate,
    seat_number: leg.seatNumber || null,
    confidence_score: dep && arr && airline && flightNo ? 0.94 : 0.55,
    confidence: dep && arr && airline && flightNo ? "high" : "review",
    parser_rule: "iata_bcbp",
    missing_fields: [!dep && "departure_airport_iata", !arr && "arrival_airport_iata", !airline && "airline_iata", !flightNo && "flight_number", !flightDate && "flight_date"].filter(Boolean),
    needs_review: !(dep && arr && airline && flightNo && flightDate),
    status: dep && arr && airline && flightNo && flightDate ? "parsed" : "pending_review",
    created_at: nowIso(),
    updated_at: nowIso(),
  });
}

function normalizePassengerName(value) {
  const clean = String(value || "").replace(/\s+/g, " ").trim();
  if (!clean) return null;
  if (clean.includes("/")) {
    const [last, first] = clean.split("/");
    return [first, last].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  }
  return clean;
}

function decorateSegment(seg) {
  const dep = airport(seg.departure_airport_iata);
  const arr = airport(seg.arrival_airport_iata);
  return {
    ...seg,
    departure_city_name: seg.departure_city_name || dep?.city || seg.departure_airport_iata,
    arrival_city_name: seg.arrival_city_name || arr?.city || seg.arrival_airport_iata,
    departure_country_code: dep?.country || seg.departure_country_code || null,
    arrival_country_code: arr?.country || seg.arrival_country_code || null,
    departure_lat: dep?.lat,
    departure_lng: dep?.lng,
    arrival_lat: arr?.lat,
    arrival_lng: arr?.lng,
    distance_km: seg.distance_km || haversineKm(dep, arr),
    route: seg.departure_airport_iata && seg.arrival_airport_iata ? `${seg.departure_airport_iata}-${seg.arrival_airport_iata}` : null,
  };
}

async function fallbackSegmentsFromText(text, sourceType, artifactId) {
  const parsed = await parseTicketText(text, sourceType);
  return (parsed.segments || []).map((segment, index) => decorateSegment({
    id: uid("segment"),
    artifact_id: artifactId,
    source_type: sourceType,
    sequence_index: index,
    airline_name: segment.airline_name || airlineName(segment.airline_iata),
    created_at: nowIso(),
    updated_at: nowIso(),
    ...segment,
  }));
}

async function parseBarcodeText(text, sourceType, artifactId) {
  try {
    const flight = parseBcbp(String(text || ""));
    if (flight) {
      const number = splitFlightNumber(flight.flight_number, flight.airline_iata);
      // Map it to a segment format
      const segment = {
        id: uid("segment"),
        artifact_id: artifactId,
        source_type: sourceType,
        airline_iata: flight.airline_iata || number.airline,
        airline_name: airlineName(flight.airline_iata || number.airline),
        flight_number: number.full,
        departure_airport_iata: flight.departure_airport_iata,
        arrival_airport_iata: flight.arrival_airport_iata,
        departure_date_local: flight.flight_date,
        flight_date: flight.flight_date,
        seat_number: flight.seat_number,
        cabin_class: flight.cabin_class,
        passenger_name: flight.passenger_name,
        pnr: flight.pnr || null,
        booking_reference: flight.pnr || null,
        confidence_score: flight.flight_date ? 0.88 : 0.72,
        confidence: flight.flight_date ? "barcode" : "review",
        parser_rule: flight.parser_rule || "iata_bcbp",
        time_confidence: "barcode_date_only",
        missing_fields: [!flight.flight_date && "flight_date", "departure_time_local"].filter(Boolean),
        needs_review: true,
        status: "pending_review",
        parse_message: "Barcode found the flight, but boarding pass barcodes usually do not include the departure time. Review the visible details before saving.",
      };
      return [decorateSegment(segment)];
    }
  } catch (e) {
    console.error("BCBP fallback error:", e);
  }
  return await fallbackSegmentsFromText(text, sourceType, artifactId);
}

function mergeVisibleTicketFields(baseSegments, visibleSegments) {
  if (!baseSegments.length) return visibleSegments;
  if (!visibleSegments.length) return baseSegments;
  return baseSegments.map((base) => {
    const match = visibleSegments.find((candidate) => (
      candidate.flight_number === base.flight_number ||
      (
        candidate.airline_iata === base.airline_iata &&
        String(candidate.flight_number || "").replace(/^\D{2}/, "") === String(base.flight_number || "").replace(/^\D{2}/, "")
      )
    )) || visibleSegments[0];
    const next = { ...base };
    [
      "flight_date",
      "departure_date_local",
      "departure_time_local",
      "arrival_time_local",
      "terminal_departure",
      "terminal_arrival",
      "gate",
      "seat_number",
      "pnr",
      "booking_reference",
      "passenger_name",
      "ticket_number",
    ].forEach((field) => {
      if (!next[field] && match?.[field]) next[field] = match[field];
    });
    if (match?.departure_airport_iata && match?.arrival_airport_iata) {
      next.departure_airport_iata = next.departure_airport_iata || match.departure_airport_iata;
      next.arrival_airport_iata = next.arrival_airport_iata || match.arrival_airport_iata;
    }

    if (!next.departure_time_local && next.airline_iata) {
      const catalogInfo = lookupCatalogFlight({ airline_iata: next.airline_iata, flight_number: next.flight_number });
      if (catalogInfo && catalogInfo.local_departure_time) {
        next.departure_time_local = catalogInfo.local_departure_time;
      }
    }

    next.time_confidence = next.departure_time_local ? "visible_on_ticket" : (next.time_confidence || "barcode_date_only");
    next.missing_fields = [
      !next.airline_iata && "airline_iata",
      !next.flight_number && "flight_number",
      !next.departure_airport_iata && "departure_airport_iata",
      !next.arrival_airport_iata && "arrival_airport_iata",
      !next.flight_date && "flight_date",
      !next.departure_time_local && "departure_time_local",
    ].filter(Boolean);
    next.confidence_score = next.missing_fields.length ? 0.78 : Math.max(next.confidence_score || 0, 0.92);
    next.confidence = next.missing_fields.length ? "review" : "high";
    next.parse_message = next.missing_fields.length
      ? "We found the flight. Please fill in the missing visible details before saving."
      : "We matched the barcode with the visible boarding pass details.";
    next.needs_review = true;
    next.status = "pending_review";
    return decorateSegment(next);
  });
}

async function createArtifact({ source_type, original_filename, raw_text = "", parser_status = "parsed" }) {
  const artifact = {
    id: uid("artifact"),
    source_type,
    original_filename,
    display_title: original_filename || (source_type === "boarding_pass_barcode" ? "Pasted boarding pass" : "Imported ticket"),
    raw_text,
    parser_status,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  try {
    await put("artifacts", artifact);
  } catch (err) {
    console.error("Failed to persist artifact to remote database:", err);
    try {
      await tx("artifacts", "readwrite", (s) => s.put(artifact));
    } catch (localErr) {
      console.error("Local database fallback also failed:", localErr);
    }
  }
  return artifact;
}

async function saveSegments(segments) {
  for (const segment of segments) {
    try {
      await put("segments", segment);
    } catch (err) {
      console.error("Failed to persist segment to remote database:", err);
      try {
        await tx("segments", "readwrite", (s) => s.put(segment));
      } catch (localErr) {
        console.error("Local database fallback for segment failed:", localErr);
      }
    }
  }
  return segments;
}

export async function ingestBarcode({ barcode_string, visible_text, original_filename }) {
  const rawText = [barcode_string, visible_text].filter(Boolean).join("\n\n--- visible ticket text ---\n\n");
  const artifact = await createArtifact({
    source_type: "boarding_pass_barcode",
    original_filename: original_filename || "boarding-pass-code",
    raw_text: rawText,
  });
  const barcodeSegments = await parseBarcodeText(barcode_string, "boarding_pass_barcode", artifact.id);
  const visibleSegments = visible_text
    ? await fallbackSegmentsFromText(visible_text, "boarding_pass_photo_ocr", artifact.id)
    : [];
  const segments = mergeVisibleTicketFields(barcodeSegments, visibleSegments);
  if (!segments.length) {
    artifact.parser_status = "needs_review";
    await put("artifacts", artifact);
    return { artifact, segment: null, segments: [], confirmed_segments: [], auto_confirmed: 0, duplicates: 0, parse_confidence: 0 };
  }
  await saveSegments(segments);
  return buildIngestResponse(artifact, segments);
}

export async function ingestPdf(formData) {
  let file = null;
  // FormData from browser: config.data is the raw FormData object
  if (formData instanceof FormData) {
    file = formData.get("file");
  } else if (formData?.get) {
    file = formData.get("file");
  }
  if (!file) {
    throw new Error("No file received. Please try uploading again.");
  }
  let text = "";
  try { text = await extractPdfText(file, { ocrFallback: true }); } catch (err) {
    console.error("PDF text extraction failed:", err);
    text = "";
  }
  if (!text && file?.text) {
    try { text = await file.text(); } catch { text = ""; }
  }
  const artifact = await createArtifact({
    source_type: "pdf_eticket",
    original_filename: file?.name || "uploaded-ticket.pdf",
    raw_text: text,
  });
  const parsed = await parseTicketText(text, "pdf_eticket");
  const segments = (parsed.segments || []).map(s => ({ ...s, artifact_id: artifact.id, id: uid("segment") }));
  if (!segments.length) {
    const message = text
      ? (parsed.message || "We could read the PDF text, but could not detect a valid flight route.")
      : "We could not extract text from this PDF. Try a clearer scan or add the flight manually.";
    artifact.parser_status = "needs_review";
    artifact.display_title = "No flight found in PDF";
    await put("artifacts", artifact);
    await markDirty();
    return {
      artifact,
      segment: null,
      segments: [],
      confirmed_segments: [],
      auto_confirmed: 0,
      duplicates: 0,
      enrichment_applied: false,
      parse_confidence: 0,
      parse_message: message,
    };
  }
  await saveSegments(segments);
  return buildIngestResponse(artifact, segments);
}

async function buildIngestResponse(artifact, segments) {
  const confirmed = [];
  let duplicates = 0;
  // Production import rule: tickets and barcodes always pass through the
  // editable review/confirm step. This protects trust when OCR/API enrichment
  // disagrees with the actual ticket.
  await markDirty();
  const first = segments[0] || null;
  if (first?.route) {
    artifact.display_title = `${first.airline_name || first.airline_iata || "Flight"} ${first.flight_number || ""} · ${first.route.replace("-", " → ")}`;
    await put("artifacts", artifact);
  }
  return {
    artifact,
    segment: first,
    segments,
    confirmed_segments: confirmed,
    auto_confirmed: confirmed.length,
    duplicates,
    enrichment_applied: false,
    parse_confidence: Math.min(...segments.map((s) => s.confidence_score || 0)),
  };
}

function segmentAutoConfirmable(seg) {
  return !!(seg.airline_iata && seg.flight_number && seg.departure_airport_iata && seg.arrival_airport_iata && seg.flight_date && (seg.confidence_score || 0) >= 0.9 && !(seg.missing_fields || []).length);
}

export async function createManualFlight(payload) {
  const catalog = lookupCatalogFlight(payload);
  const duration = payload.flight_duration_minutes || catalog?.flight_duration_minutes || 90;
  const localTime = payload.local_departure_time || catalog?.local_departure_time || "09:00";
  const dep = payload.departure_time_utc || (payload.flight_date ? `${payload.flight_date}T${localTime}:00.000Z` : null);
  const arr = dep ? new Date(new Date(dep).getTime() + duration * 60000).toISOString() : null;
  const segment = decorateSegment({
    id: uid("segment"),
    source_type: "manual_entry",
    airline_iata: String(payload.airline_iata || "").toUpperCase(),
    airline_name: airlineName(payload.airline_iata),
    flight_number: fullFlightNumber(payload.airline_iata || catalog?.airline_iata, payload.flight_number || catalog?.number),
    departure_airport_iata: String(payload.departure_airport_iata || catalog?.departure_airport_iata || "").toUpperCase(),
    arrival_airport_iata: String(payload.arrival_airport_iata || catalog?.arrival_airport_iata || "").toUpperCase(),
    flight_date: payload.flight_date,
    departure_time_utc: dep,
    arrival_time_utc: arr,
    flight_duration_minutes: duration,
    aircraft_type: payload.aircraft_type || catalog?.aircraft_type || null,
    seat_number: payload.seat_number || null,
    booking_reference: payload.booking_reference || null,
    pnr: payload.booking_reference || null,
    passenger_name: payload.passenger_name || null,
    ticket_number: payload.ticket_number || null,
    parser_rule: catalog ? "bundled_catalog_manual" : "manual_entry",
    confidence: catalog ? "catalog_estimate" : "manual",
    missing_fields: [],
    confidence_score: 0.92,
    needs_review: false,
    status: "parsed",
    created_at: nowIso(),
    updated_at: nowIso(),
  });
  await put("segments", segment);
  const result = await confirmSegment(segment.id);
  return { segment, segments: [segment], confirmed_segments: [result.confirmed_segment], auto_confirmed: result.duplicate ? 0 : 1, duplicates: result.duplicate ? 1 : 0 };
}

export function searchLocalFlights(params) {
  return searchFlightCatalog(params);
}

export function lookupLocalFlight(params) {
  const catalog = lookupCatalogFlight(params);
  if (!catalog) return { found: false, source: "local_catalog", message: "Not in bundled free catalog. Add route manually." };
  const date = params?.date;
  const dep = date && catalog.local_departure_time ? `${date}T${catalog.local_departure_time}:00.000Z` : null;
  return {
    found: true,
    source: "local_catalog",
    flight: {
      ...catalog,
      flight_date: date || null,
      departure_time_utc: dep,
      arrival_time_utc: dep ? new Date(new Date(dep).getTime() + catalog.flight_duration_minutes * 60000).toISOString() : null,
      time_confidence: "catalog_estimate",
    },
  };
}

export async function confirmSegment(id, dirty = true) {
  const seg = await get("segments", id);
  if (!seg) throw new Error("Segment not found");
  const flight = normalizeFlight({ ...seg, source_parsed_segment_id: seg.id });
  const existing = (await all("flights")).find((f) => f.canonical_hash === flight.canonical_hash);
  if (existing) {
    seg.status = "duplicate";
    await put("segments", seg);
    return { confirmed_segment: existing, duplicate: true };
  }
  await put("flights", flight);
  pushFlightToSupabase(flight);
  seg.status = "confirmed";
  await put("segments", seg);
  if (dirty) await markDirty();
  return { confirmed_segment: flight, duplicate: false };
}

export async function updateSegment(id, updates) {
  const seg = await get("segments", id);
  if (!seg) throw new Error("Segment not found");
  const next = decorateSegment({ ...seg, ...(updates || {}), updated_at: nowIso() });
  await put("segments", next);
  return next;
}

export async function deleteSegment(id) {
  await del("segments", id);
}

export async function deleteFlight(id) {
  const existing = await get("flights", id);
  await del("flights", id);
  if (existing) deleteFlightFromSupabase(existing);
  await markDirty();
}

export async function updateFlight(id, updates) {
  const flight = await get("flights", id);
  if (!flight) throw new Error("Flight not found");

  const filteredUpdates = { ...updates };
  if (updates.departure_airport_iata && updates.departure_airport_iata.toUpperCase() !== flight.departure_airport_iata) {
    delete filteredUpdates.departure_city_name;
    delete filteredUpdates.departure_country_code;
    delete filteredUpdates.departure_lat;
    delete filteredUpdates.departure_lng;
    delete filteredUpdates.distance_km;
  }
  if (updates.arrival_airport_iata && updates.arrival_airport_iata.toUpperCase() !== flight.arrival_airport_iata) {
    delete filteredUpdates.arrival_city_name;
    delete filteredUpdates.arrival_country_code;
    delete filteredUpdates.arrival_lat;
    delete filteredUpdates.arrival_lng;
    delete filteredUpdates.distance_km;
  }

  const merged = { ...flight, ...filteredUpdates };
  const next = normalizeFlight(merged);

  await put("flights", next);
  if (supabaseEnabled) {
    await pushFlightToSupabase(next);
  }
  await markDirty();
  return next;
}

export async function deleteArtifact(id) {
  await del("artifacts", id);
}

export async function listFlights() {
  return (await all("flights")).sort((a, b) => String(a.departure_time_utc || a.flight_date).localeCompare(String(b.departure_time_utc || b.flight_date)));
}

/**
 * Save a flight directly to IndexedDB (and optionally sync to Supabase).
 * Used by Gmail import and other flows that need to write to both stores.
 */
export async function saveFlight(rawFlight, { syncToSupabase = true } = {}) {
  const flight = normalizeFlight(rawFlight);
  const existing = (await all("flights")).find((f) => f.canonical_hash === flight.canonical_hash);
  if (existing) return { flight: existing, duplicate: true };
  await put("flights", flight);
  if (syncToSupabase) pushFlightToSupabase(flight);
  await markDirty();
  return { flight, duplicate: false };
}

export async function listSegments() {
  return all("segments");
}

export async function listPendingSegments() {
  return (await all("segments")).filter((s) => s.status !== "confirmed" && s.status !== "duplicate");
}

export async function listArtifacts() {
  return (await all("artifacts")).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

function yearOf(flight) {
  const source = flight.departure_time_utc || flight.flight_date;
  const y = new Date(source).getUTCFullYear();
  return Number.isFinite(y) ? y : new Date().getFullYear();
}

function flightsForYear(flights, year) {
  if (year === "all") return flights;
  const y = Number(year || new Date().getFullYear());
  return flights.filter((f) => yearOf(f) === y);
}

function buildPresenceWindows(flights, profile, year) {
  const home = profile.home_airport_iata;
  const sorted = flightsForYear(flights, year).sort((a, b) => new Date(a.departure_time_utc || a.flight_date) - new Date(b.departure_time_utc || b.flight_date));
  const windows = [];
  sorted.forEach((f, idx) => {
    windows.push({
      id: `air_${f.id}`,
      type: "flight",
      route: f.route,
      segment_id: f.id,
      start_time_utc: f.departure_time_utc,
      end_time_utc: f.arrival_time_utc,
      duration_minutes: f.flight_duration_minutes || 0,
      estimated: f.duration_source === "estimated",
    });
    const next = sorted[idx + 1];
    if (!next || !f.arrival_time_utc || !next.departure_time_utc) return;
    const gap = minutesBetween(f.arrival_time_utc, next.departure_time_utc);
    if (gap <= 0) return;

    if (f.arrival_airport_iata !== next.departure_airport_iata) {
      // Teleportation Gap Splitting Strategy
      const duration1 = Math.round(gap * 0.4);
      const transitDuration = Math.round(gap * 0.2);
      const duration2 = gap - duration1 - transitDuration;

      const isHome1 = f.arrival_airport_iata === home;
      const isHome2 = next.departure_airport_iata === home;

      const midTime1 = new Date(new Date(f.arrival_time_utc).getTime() + duration1 * 60000).toISOString();
      const midTime2 = new Date(new Date(midTime1).getTime() + transitDuration * 60000).toISOString();

      if (duration1 > 0) {
        windows.push({
          id: `stay_${f.id}_mid1`,
          type: duration1 <= 720 ? "airport" : (isHome1 ? "home" : "city"),
          airport_iata: f.arrival_airport_iata,
          city_name: f.arrival_city_name,
          country_code: f.arrival_country_code,
          is_home: isHome1,
          start_time_utc: f.arrival_time_utc,
          end_time_utc: midTime1,
          duration_minutes: duration1,
          estimated: true,
          layover: duration1 <= 720,
        });
      }

      if (transitDuration > 0) {
        windows.push({
          id: `stay_${f.id}_transit_${next.id}`,
          type: "transit",
          airport_iata: "TRN",
          city_name: "Unknown / Transit",
          country_code: "TR",
          is_home: false,
          start_time_utc: midTime1,
          end_time_utc: midTime2,
          duration_minutes: transitDuration,
          estimated: true,
          transit: true,
        });
      }

      if (duration2 > 0) {
        windows.push({
          id: `stay_mid2_${next.id}`,
          type: duration2 <= 720 ? "airport" : (isHome2 ? "home" : "city"),
          airport_iata: next.departure_airport_iata,
          city_name: next.departure_city_name,
          country_code: next.departure_country_code,
          is_home: isHome2,
          start_time_utc: midTime2,
          end_time_utc: next.departure_time_utc,
          duration_minutes: duration2,
          estimated: true,
          layover: duration2 <= 720,
        });
      }
    } else {
      const isHome = f.arrival_airport_iata === home;
      windows.push({
        id: `stay_${f.id}_${next.id}`,
        type: gap <= 720 ? "airport" : (isHome ? "home" : "city"),
        airport_iata: f.arrival_airport_iata,
        city_name: f.arrival_city_name,
        country_code: f.arrival_country_code,
        is_home: isHome,
        start_time_utc: f.arrival_time_utc,
        end_time_utc: next.departure_time_utc,
        duration_minutes: gap,
        estimated: gap <= 720,
        layover: gap <= 720,
      });
    }
  });
  return windows;
}

function buildDashboard(flights, profile, year) {
  const scoped = flightsForYear(flights, year);
  const windows = buildPresenceWindows(flights, profile, year);
  const air = scoped.reduce((s, f) => s + (f.flight_duration_minutes || 0), 0);
  const home = windows.filter((w) => w.is_home && w.type === "home").reduce((s, w) => s + w.duration_minutes, 0);
  const away = windows.filter((w) => !w.is_home && w.type === "city").reduce((s, w) => s + w.duration_minutes, 0);
  const airportMinutes = windows.filter((w) => w.type === "airport").reduce((s, w) => s + w.duration_minutes, 0) + scoped.length * 180;
  const cityMinutes = {};
  windows.filter((w) => w.type === "city").forEach((w) => { cityMinutes[w.city_name] = (cityMinutes[w.city_name] || 0) + w.duration_minutes; });
  const monthly = {};
  const routes = {};
  const airlines = {};
  scoped.forEach((f) => {
    const key = (f.departure_time_utc || f.flight_date || "").slice(0, 7);
    if (key) {
      monthly[key] ||= { month: key, flights: 0, air_minutes: 0 };
      monthly[key].flights += 1;
      monthly[key].air_minutes += f.flight_duration_minutes || 0;
    }
    if (f.route) routes[f.route] = (routes[f.route] || 0) + 1;
    if (f.airline_iata) {
      airlines[f.airline_iata] ||= { airline: f.airline_iata, airline_name: f.airline_name, count: 0 };
      airlines[f.airline_iata].count += 1;
    }
  });
  const routeFrequency = Object.entries(routes).map(([route, count]) => ({ route, count })).sort((a, b) => b.count - a.count);
  const airlineSplit = Object.values(airlines).sort((a, b) => b.count - a.count);
  const topCities = Object.entries(cityMinutes).sort((a, b) => b[1] - a[1]).map(([city, mins]) => ({ city, minutes: mins, days: Math.round((mins / 1440) * 10) / 10 }));
  const busiest = Object.values(monthly).sort((a, b) => b.flights - a.flights)[0];
  const topCity = topCities[0]?.city;
  const insights = scoped.length ? [
    topCity ? `You spent the most time in ${topCity} this year.` : "Your year is mostly anchored around home so far.",
    busiest ? `Your busiest month was ${new Date(`${busiest.month}-01T00:00:00Z`).toLocaleDateString([], { month: "long" })} with ${busiest.flights} flights.` : null,
    routeFrequency[0] ? `${routeFrequency[0].route} is your most repeated route.` : null,
    `You spent roughly ${Math.round(airportMinutes / 60)}h in airports this year.`,
    home ? `${profile.home_city_name || "Home"} still anchors your travel rhythm.` : "Add a return flight to calculate home time.",
  ].filter(Boolean) : [];
  const future = flights.filter((f) => new Date(f.departure_time_utc || f.flight_date) > new Date()).sort((a, b) => new Date(a.departure_time_utc || a.flight_date) - new Date(b.departure_time_utc || b.flight_date))[0];
  return {
    total_flights: scoped.length,
    total_air_minutes: air,
    total_air_hours: Math.round((air / 60) * 10) / 10,
    home_minutes: home,
    home_days: Math.round((home / 1440) * 10) / 10,
    away_minutes: away,
    away_days: Math.round((away / 1440) * 10) / 10,
    airport_minutes: airportMinutes,
    airport_hours: Math.round((airportMinutes / 60) * 10) / 10,
    cities_visited: Object.keys(cityMinutes).length,
    top_route: routeFrequency[0]?.route || null,
    top_route_count: routeFrequency[0]?.count || 0,
    top_airline: airlineSplit[0]?.airline || null,
    top_airline_name: airlineSplit[0]?.airline_name || null,
    monthly_series: Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month)),
    top_cities: topCities.slice(0, 5),
    route_frequency: routeFrequency,
    airline_split: airlineSplit,
    next_trip: future ? {
      route: future.route,
      departure_time_utc: future.departure_time_utc,
      days_until: Math.max(0, Math.ceil((new Date(future.departure_time_utc || future.flight_date) - new Date()) / 86400000)),
    } : null,
    insights,
    home_airport_iata: profile.home_airport_iata,
  };
}

function buildCities(flights, profile, year) {
  const counts = {};
  flightsForYear(flights, year).forEach((f) => {
    [f.departure_airport_iata, f.arrival_airport_iata].forEach((iata) => {
      const a = airport(iata) || {};
      counts[iata] ||= { iata, city: a.city || iata, country: a.country, lat: a.lat, lng: a.lng, flights_in: 0, flights_out: 0, minutes_spent: 0, visits: 0, connected_to: new Set(), is_home: iata === profile.home_airport_iata };
    });
    counts[f.departure_airport_iata].flights_out += 1;
    counts[f.departure_airport_iata].connected_to.add(f.arrival_airport_iata);
    counts[f.arrival_airport_iata].flights_in += 1;
    counts[f.arrival_airport_iata].connected_to.add(f.departure_airport_iata);
  });
  buildPresenceWindows(flights, profile, year).forEach((w) => {
    if (w.airport_iata && counts[w.airport_iata]) {
      counts[w.airport_iata].minutes_spent += w.duration_minutes || 0;
      counts[w.airport_iata].days_spent = Math.round((counts[w.airport_iata].minutes_spent / 1440) * 10) / 10;
    }
  });
  return {
    window: "all",
    home_airport_iata: profile.home_airport_iata,
    cities: Object.values(counts).map((c) => ({
      ...c,
      connected_to: [...c.connected_to],
      days_spent: c.days_spent || 0,
      both_legs: c.flights_in > 0 && c.flights_out > 0,
      incomplete: false,
    })).sort((a, b) => (b.minutes_spent || 0) - (a.minutes_spent || 0)),
  };
}

function buildMapData(flights, profile, year) {
  const cityData = buildCities(flights, profile, year).cities;
  const routes = {};
  flightsForYear(flights, year).forEach((f) => {
    if (!f.route) return;
    routes[f.route] ||= { route: f.route, count: 0, from: airport(f.departure_airport_iata), to: airport(f.arrival_airport_iata), last_flight_at: f.departure_time_utc };
    routes[f.route].count += 1;
    if (String(f.departure_time_utc || "") > String(routes[f.route].last_flight_at || "")) routes[f.route].last_flight_at = f.departure_time_utc;
  });
  return {
    total_flights: flightsForYear(flights, year).length,
    airport_markers: cityData.map((c) => ({ iata: c.iata, city: c.city, country: c.country, lat: c.lat, lng: c.lng, count: c.flights_in + c.flights_out, is_home: c.is_home })),
    routes: Object.values(routes),
  };
}

function buildTrips(flights, profile, year) {
  const home = profile.home_airport_iata;
  const sorted = flightsForYear(flights, year).sort((a, b) => new Date(a.departure_time_utc || a.flight_date) - new Date(b.departure_time_utc || b.flight_date));
  const trips = [];
  let current = null;
  sorted.forEach((f) => {
    if (!current) {
      current = { id: uid("trip"), trip_name: `${f.departure_city_name} -> ${f.arrival_city_name}`, start_time_utc: f.departure_time_utc, segments: [], total_air_minutes: 0, returned_home: false };
    }
    current.segments.push(f);
    current.total_air_minutes += f.flight_duration_minutes || 0;
    current.end_time_utc = f.arrival_time_utc;
    current.total_segments = current.segments.length;
    current.returned_home = f.arrival_airport_iata === home;
    if (current.returned_home) {
      const last = current.segments[current.segments.length - 1];
      current.trip_name = `${current.segments[0].departure_city_name} -> ${last.arrival_city_name}`;
      trips.push(current);
      current = null;
    }
  });
  if (current) trips.push(current);
  return trips;
}

function buildWrapped(flights, profile, year) {
  const dashboard = buildDashboard(flights, profile, year);
  const map = buildMapData(flights, profile, year);
  const countries = {};
  map.airport_markers.forEach((a) => { countries[a.country] = (countries[a.country] || 0) + 1; });
  const longest = flightsForYear(flights, year).sort((a, b) => (b.flight_duration_minutes || 0) - (a.flight_duration_minutes || 0))[0] || null;
  const topAirport = map.airport_markers.slice().sort((a, b) => b.count - a.count)[0]?.iata || null;
  const carbon = flightsForYear(flights, year).reduce((s, f) => s + ((f.distance_km || 0) * 0.115), 0);
  return {
    year,
    ...dashboard,
    countries: Object.entries(countries).map(([country, count]) => ({ country, count })),
    airports: map.airport_markers.map((a) => ({ iata: a.iata, count: a.count })),
    longest_flight: longest,
    monthly_rhythm: dashboard.monthly_series,
    travel_personality: dashboard.total_flights >= 10 ? "Hub Hopper" : dashboard.total_flights >= 4 ? "Weekend Nomad" : dashboard.total_flights ? "Pathfinder" : "Grounded",
    top_airport: topAirport,
    carbon_kg: Math.round(carbon),
    milestones: dashboard.total_flights ? [
      `${dashboard.total_flights} flights logged`,
      `${map.airport_markers.length} airports touched`,
      `${Object.keys(countries).length} countries visited`,
      longest ? `${longest.route} was your longest flight` : null,
      topAirport ? `${topAirport} was your most-used airport` : null,
    ].filter(Boolean) : [],
    presence_windows: buildPresenceWindows(flights, profile, year),
    wrapped_cards: dashboard.total_flights ? [
      { kind: "hero", title: `Your ${year} in motion`, value: `${dashboard.total_flights} flights` },
      { kind: "air", title: "Time above the clouds", value: `${dashboard.total_air_hours} hours` },
      dashboard.top_route ? { kind: "route", title: "Most repeated route", value: dashboard.top_route, detail: `${dashboard.top_route_count} flights` } : null,
      dashboard.top_cities[0] ? { kind: "city", title: "Longest stay", value: dashboard.top_cities[0].city, detail: `${dashboard.top_cities[0].days} days` } : null,
    ].filter(Boolean) : [],
    map,
  };
}

export async function recomputeAnalytics(year = new Date().getFullYear()) {
  const profile = await getLocalProfile();
  const flights = await listFlights();
  const dashboard = buildDashboard(flights, profile, year);
  const wrapped = buildWrapped(flights, profile, year);
  await setKv(`dashboard_${year}`, dashboard);
  await setKv(`wrapped_${year}`, wrapped);
  const rev = await getKv("analytics_revision", 0);
  await setKv(`analytics_rev_${year}`, rev);
  await setKv(DIRTY_KEY, false);
  return { dashboard, wrapped, trips: buildTrips(flights, profile, year).length, city_stays: wrapped.presence_windows.filter((w) => w.type === "city" || w.type === "home").length, monthly_stats: dashboard.monthly_series.length };
}

async function ensureAnalytics(year) {
  const dirty = await getKv(DIRTY_KEY, true);
  const rev = await getKv("analytics_revision", 0);
  const computedRev = await getKv(`analytics_rev_${year}`, -1);
  const cached = await getKv(`dashboard_${year}`, null);
  if (!dirty && computedRev === rev && cached) return;
  await recomputeAnalytics(year);
}

export async function dashboard(year = new Date().getFullYear()) {
  await ensureAnalytics(year);
  return getKv(`dashboard_${year}`, null);
}

export async function wrapped(year = new Date().getFullYear()) {
  await ensureAnalytics(year);
  return getKv(`wrapped_${year}`, null);
}

export async function cities(year = new Date().getFullYear()) {
  return buildCities(await listFlights(), await getLocalProfile(), year);
}

export async function mapData(year = new Date().getFullYear()) {
  return buildMapData(await listFlights(), await getLocalProfile(), year);
}

export async function trips(year = new Date().getFullYear()) {
  return buildTrips(await listFlights(), await getLocalProfile(), year);
}

export async function cityStays(year = new Date().getFullYear()) {
  return buildPresenceWindows(await listFlights(), await getLocalProfile(), year).filter((w) => w.type === "city" || w.type === "home");
}

export async function exportLedger() {
  return {
    version: 1,
    exported_at: nowIso(),
    profile: await getLocalProfile(),
    flights: await all("flights"),
    segments: await all("segments"),
    artifacts: await all("artifacts"),
    notes: await all("notes"),
  };
}

export async function importLedger(payload, { replaceFlights = false } = {}) {
  if (!payload || typeof payload !== "object") throw new Error("Invalid Ryoko backup");
  if (payload.profile) await setKv("profile", payload.profile);
  if (replaceFlights) {
    await clear("flights");
  }
  for (const row of payload.flights || []) await put("flights", normalizeFlight(row));
  for (const row of payload.segments || []) await put("segments", row);
  for (const row of payload.artifacts || []) await put("artifacts", row);
  for (const row of payload.notes || []) await put("notes", row);
  await markDirty();
}

export async function clearLocalLedgerOnly() {
  await Promise.all(STORE_NAMES.map((store) => clear(store)));
  await getLocalProfile();
  await markDirty();
}

export async function deleteAllLocalData() {
  await Promise.all(STORE_NAMES.map((store) => clear(store)));
  try {
    await deleteAllSupabaseData();
  } catch (err) {
    console.warn("Failed to delete all Supabase data:", err);
  }
  await getLocalProfile();
  await markDirty();
}
