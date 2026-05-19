const { decrypt } = require("../../../_lib/crypto");
const { attachmentBuffer, gmailGet, messageText, pdfAttachmentParts, refreshGoogleAccessToken } = require("../../../_lib/gmail");
const { extractPdfText, parseTextFlights } = require("../../../_lib/flightParser");
const { handleError, json, requireUser } = require("../../../_lib/supabaseAdmin");

function toFlightRow(flight, userId) {
  const date = flight.flight_date;
  const depTime = flight.departure_time_local
    ? `${date}T${flight.departure_time_local}:00.000Z`
    : null;
  return {
    user_id: userId,
    source_type: "gmail",
    airline_iata: flight.airline_iata,
    airline_name: flight.airline_name,
    flight_number: flight.flight_number,
    passenger_name: flight.passenger_name || null,
    booking_reference: flight.booking_reference || flight.pnr || null,
    pnr: flight.pnr || flight.booking_reference || null,
    departure_airport_iata: flight.departure_airport_iata,
    arrival_airport_iata: flight.arrival_airport_iata,
    departure_time_utc: depTime,
    flight_date: date,
    departure_time_local: flight.departure_time_local || null,
    arrival_time_local: flight.arrival_time_local || null,
    time_confidence: flight.time_confidence || (depTime ? "visible_on_ticket" : "missing"),
    parser_rule: flight.parser_rule,
    confidence: flight.confidence,
    confidence_score: flight.confidence_score,
    route: `${flight.departure_airport_iata}-${flight.arrival_airport_iata}`,
    canonical_hash: flight.canonical_hash,
    status: "confirmed",
    updated_at: new Date().toISOString(),
  };
}

async function saveFlight(supabase, userId, flight) {
  const row = toFlightRow(flight, userId);
  const { data: existing, error: lookupError } = await supabase
    .from("flights")
    .select("id")
    .eq("user_id", userId)
    .eq("canonical_hash", row.canonical_hash)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (existing?.id) return { duplicate: true };
  const { error } = await supabase.from("flights").insert(row);
  if (error) throw error;
  return { duplicate: false };
}

async function parseMessage(accessToken, message) {
  const full = await gmailGet(accessToken, `messages/${message.id}?format=full`);
  const texts = [messageText(full.payload)];
  for (const part of pdfAttachmentParts(full.payload)) {
    try {
      const buf = await attachmentBuffer(accessToken, message.id, part.body.attachmentId);
      texts.push(await extractPdfText(buf));
    } catch {
      // Keep processing the message body and other attachments.
    }
  }
  return texts.flatMap((text) => parseTextFlights(text));
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  try {
    const { supabase, user } = await requireUser(req);
    const { data: job, error: jobError } = await supabase
      .from("gmail_import_jobs")
      .select("*")
      .eq("id", req.query.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (jobError) throw jobError;
    if (!job) return json(res, 404, { error: "Import job not found." });
    if (job.status === "completed" || job.status === "failed") return json(res, 200, { job });

    const { data: connection, error: connError } = await supabase
      .from("gmail_connections")
      .select("encrypted_refresh_token")
      .eq("user_id", user.id)
      .maybeSingle();
    if (connError) throw connError;
    if (!connection) return json(res, 409, { error: "Connect Gmail again before scanning." });

    const accessToken = await refreshGoogleAccessToken(decrypt(connection.encrypted_refresh_token));
    const pageParam = job.page_token ? `&pageToken=${encodeURIComponent(job.page_token)}` : "";
    const search = await gmailGet(
      accessToken,
      `messages?q=${encodeURIComponent(job.query)}&maxResults=10${pageParam}`
    );
    const messages = search.messages || [];
    let found = 0;
    let saved = 0;
    let duplicate = 0;
    let errors = 0;

    for (const message of messages) {
      try {
        const flights = await parseMessage(accessToken, message);
        found += flights.length;
        for (const flight of flights) {
          const result = await saveFlight(supabase, user.id, flight);
          if (result.duplicate) duplicate += 1;
          else saved += 1;
        }
      } catch {
        errors += 1;
      }
    }

    const nextStatus = search.nextPageToken ? "running" : "completed";
    const patch = {
      status: nextStatus,
      page_token: search.nextPageToken || null,
      processed_count: Number(job.processed_count || 0) + messages.length,
      found_count: Number(job.found_count || 0) + found,
      saved_count: Number(job.saved_count || 0) + saved,
      duplicate_count: Number(job.duplicate_count || 0) + duplicate,
      error_count: Number(job.error_count || 0) + errors,
      completed_at: nextStatus === "completed" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    const { data: updated, error: updateError } = await supabase
      .from("gmail_import_jobs")
      .update(patch)
      .eq("id", job.id)
      .eq("user_id", user.id)
      .select()
      .single();
    if (updateError) throw updateError;
    json(res, 200, { job: updated });
  } catch (err) {
    handleError(res, err);
  }
};
