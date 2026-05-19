const { encrypt } = require("../_lib/crypto");
const { handleError, json, requireUser } = require("../_lib/supabaseAdmin");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  try {
    const { supabase, user } = await requireUser(req);
    const refreshToken = req.body?.provider_refresh_token;
    if (!refreshToken) return json(res, 400, { error: "Google refresh token was not returned. Sign in again and approve Gmail access." });
    const row = {
      user_id: user.id,
      encrypted_refresh_token: encrypt(refreshToken),
      scopes: req.body?.scopes || "https://www.googleapis.com/auth/gmail.readonly",
      status: "connected",
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("gmail_connections")
      .upsert(row, { onConflict: "user_id" });
    if (error) throw error;
    json(res, 200, { ok: true });
  } catch (err) {
    handleError(res, err);
  }
};
