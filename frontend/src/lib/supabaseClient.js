import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabaseEnabled = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = supabaseEnabled
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    })
  : null;

export function publicAppUrl() {
  const configuredUrl = process.env.REACT_APP_PUBLIC_URL;
  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";
  if (!configuredUrl) return currentOrigin;

  try {
    const configured = new URL(configuredUrl);
    const current = currentOrigin ? new URL(currentOrigin) : null;
    const configuredIsLocalhost = ["localhost", "127.0.0.1", "::1"].includes(configured.hostname);
    const currentIsLocalhost = current && ["localhost", "127.0.0.1", "::1"].includes(current.hostname);
    if (configuredIsLocalhost && current && !currentIsLocalhost) {
      return current.origin;
    }
    return configured.origin;
  } catch {
    return currentOrigin;
  }
}
