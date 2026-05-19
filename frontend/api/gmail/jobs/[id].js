const { handleError, json, requireUser } = require("../../_lib/supabaseAdmin");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });
  try {
    const { supabase, user } = await requireUser(req);
    const { data, error } = await supabase
      .from("gmail_import_jobs")
      .select("*")
      .eq("id", req.query.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return json(res, 404, { error: "Import job not found." });
    json(res, 200, { job: data });
  } catch (err) {
    handleError(res, err);
  }
};
