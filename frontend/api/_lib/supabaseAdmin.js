const { createClient } = require("@supabase/supabase-js");

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function requiredEnv() {
  const url = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    const err = new Error("Server Gmail import is not configured.");
    err.statusCode = 503;
    throw err;
  }
  return { url, serviceKey };
}

function adminClient() {
  const { url, serviceKey } = requiredEnv();
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requireUser(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    const err = new Error("Missing Supabase session.");
    err.statusCode = 401;
    throw err;
  }
  const supabase = adminClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    const err = new Error("Invalid Supabase session.");
    err.statusCode = 401;
    throw err;
  }
  return { supabase, user: data.user };
}

function handleError(res, err) {
  const status = err.statusCode || 500;
  json(res, status, { error: err.message || "Unexpected server error" });
}

module.exports = { adminClient, handleError, json, requireUser };
