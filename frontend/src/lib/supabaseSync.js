import { supabase, supabaseEnabled } from "@/lib/supabaseClient";

async function currentUserId() {
  if (!supabaseEnabled) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

function toFlightRow(flight, userId) {
  const row = {
    user_id: userId,
    source_parsed_segment_id: flight.source_parsed_segment_id || null,
    source_type: flight.source_type || null,
    airline_iata: flight.airline_iata || null,
    airline_name: flight.airline_name || null,
    flight_number: flight.flight_number || null,
    passenger_name: flight.passenger_name || null,
    booking_reference: flight.booking_reference || null,
    pnr: flight.pnr || flight.booking_reference || null,
    ticket_number: flight.ticket_number || null,
    departure_airport_iata: flight.departure_airport_iata || null,
    arrival_airport_iata: flight.arrival_airport_iata || null,
    departure_city_name: flight.departure_city_name || null,
    arrival_city_name: flight.arrival_city_name || null,
    departure_country_code: flight.departure_country_code || null,
    arrival_country_code: flight.arrival_country_code || null,
    departure_lat: flight.departure_lat ?? null,
    departure_lng: flight.departure_lng ?? null,
    arrival_lat: flight.arrival_lat ?? null,
    arrival_lng: flight.arrival_lng ?? null,
    departure_time_utc: flight.departure_time_utc || null,
    arrival_time_utc: flight.arrival_time_utc || null,
    departure_time_local: flight.departure_time_local || null,
    arrival_time_local: flight.arrival_time_local || null,
    flight_date: flight.flight_date || null,
    flight_duration_minutes: flight.flight_duration_minutes || null,
    duration_source: flight.duration_source || null,
    time_confidence: flight.time_confidence || null,
    distance_km: flight.distance_km || null,
    aircraft_type: flight.aircraft_type || null,
    cabin_class: flight.cabin_class || null,
    seat_number: flight.seat_number || null,
    terminal_departure: flight.terminal_departure || null,
    terminal_arrival: flight.terminal_arrival || null,
    gate: flight.gate || null,
    route: flight.route || null,
    confidence: flight.confidence || null,
    confidence_score: flight.confidence_score || null,
    parser_rule: flight.parser_rule || null,
    missing_fields: flight.missing_fields || [],
    canonical_hash: flight.canonical_hash || null,
    status: flight.status || "confirmed",
    updated_at: new Date().toISOString(),
  };
  if (flight.id && String(flight.id).match(/^[0-9a-f-]{36}$/i)) row.id = flight.id;
  return row;
}

export async function pushFlightToSupabase(flight) {
  const userId = await currentUserId();
  if (!userId || !flight) return null;
  const row = toFlightRow(flight, userId);
  let request;
  if (row.canonical_hash) {
    const { data: existing } = await supabase
      .from("flights")
      .select("id")
      .eq("user_id", userId)
      .eq("canonical_hash", row.canonical_hash)
      .maybeSingle();
    request = existing?.id
      ? supabase.from("flights").update(row).eq("id", existing.id).select().single()
      : supabase.from("flights").insert(row).select().single();
  } else {
    request = supabase.from("flights").insert(row).select().single();
  }
  const { data, error } = await request;
  if (error) {
    console.warn("Ryoko Supabase flight sync failed", error);
    return null;
  }
  return data;
}

export async function deleteFlightFromSupabase(flight) {
  const userId = await currentUserId();
  if (!userId || !flight) return;
  let query = supabase.from("flights").delete().eq("user_id", userId);
  if (flight.canonical_hash) query = query.eq("canonical_hash", flight.canonical_hash);
  else query = query.eq("source_parsed_segment_id", flight.source_parsed_segment_id || flight.id);
  const { error } = await query;
  if (error) console.warn("Ryoko Supabase delete sync failed", error);
}

export async function deleteAllSupabaseData() {
  const userId = await currentUserId();
  if (!userId) return;
  const { error: flightsError } = await supabase.from("flights").delete().eq("user_id", userId);
  if (flightsError) console.warn("Ryoko Supabase clear flights failed", flightsError);
  const { error: artifactsError } = await supabase.from("ticket_artifacts").delete().eq("user_id", userId);
  if (artifactsError) console.warn("Ryoko Supabase clear artifacts failed", artifactsError);
  const { error: analyticsError } = await supabase.from("analytics_snapshots").delete().eq("user_id", userId);
  if (analyticsError) console.warn("Ryoko Supabase clear analytics failed", analyticsError);
}

export async function pullSupabaseLedger() {
  const userId = await currentUserId();
  if (!userId) return null;
  const [{ data: profile }, { data: flights }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("flights").select("*").eq("user_id", userId).order("departure_time_utc", { ascending: true }),
  ]);
  return {
    profile: profile ? { ...profile, user_id: userId } : null,
    flights: flights || [],
    segments: [],
    artifacts: [],
    notes: [],
  };
}
