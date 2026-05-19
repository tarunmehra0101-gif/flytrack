const { handleError, json, requireUser } = require("../_lib/supabaseAdmin");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  try {
    const { supabase, user } = await requireUser(req);
    const years = Math.max(1, Math.min(5, Number(req.body?.years || 3)));
    const { data: connection, error: connError } = await supabase
      .from("gmail_connections")
      .select("user_id,status")
      .eq("user_id", user.id)
      .maybeSingle();
    if (connError) throw connError;
    if (!connection) return json(res, 409, { error: "Connect Gmail again before scanning." });
    const { data, error } = await supabase
      .from("gmail_import_jobs")
      .insert({
        user_id: user.id,
        status: "running",
        years,
        query: `(flight OR itinerary OR e-ticket OR eticket OR boarding pass OR ticket) newer_than:${years}y`,
        processed_count: 0,
        found_count: 0,
        saved_count: 0,
        duplicate_count: 0,
        error_count: 0,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    json(res, 200, { job: data });
  } catch (err) {
    handleError(res, err);
  }
};
