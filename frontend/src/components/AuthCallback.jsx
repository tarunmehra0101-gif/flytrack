import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, supabaseEnabled } from "@/lib/supabaseClient";

/**
 * Exchange the OAuth code for a Supabase session.
 * With detectSessionInUrl:true + flowType:'pkce', Supabase will also
 * try auto-detection.  We still attempt a manual exchange as a safety-net
 * so the flow works even when Supabase's auto-detect fires slightly late.
 */
async function finishSupabaseRedirect(location) {
  if (!supabaseEnabled) return;

  // Check if there's an error in the URL params
  const params = new URLSearchParams(location.search || "");
  if (params.get("error")) {
    const desc = params.get("error_description") || "Authentication failed";
    throw new Error(desc);
  }

  // PKCE code exchange (most common for Google OAuth)
  const code = params.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      // If the code was already used (e.g. auto-detect beat us), check if we have a session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) return; // Session exists, we're good
      throw error;
    }
    return;
  }

  // Hash-based tokens (legacy implicit flow)
  const hash = new URLSearchParams((location.hash || "").replace(/^#/, ""));
  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    return;
  }

  // No code or tokens — check if auto-detection already created a session
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return;

  // Give auto-detection a moment to finish
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const { data: { session: retrySession } } = await supabase.auth.getSession();
  if (retrySession) return;

  throw new Error("No authentication code or session found");
}

async function waitForProfile(fetchMe) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const data = await fetchMe();
    if (data?.user) return data;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return null;
}

export default function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const { fetchMe } = useAuth();
  const processed = useRef(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    (async () => {
      try {
        await finishSupabaseRedirect(location);
        const data = await waitForProfile(fetchMe);
        if (!data?.user) {
          setError("Sign-in failed. Please try again.");
          setTimeout(() => navigate("/", { replace: true }), 2000);
          return;
        }

        // Clean up any pending state
        try {
          localStorage.removeItem("ryoko_pending_gmail_scan");
        } catch {
          // storage may be unavailable
        }

        navigate(data?.profile?.onboarding_completed ? "/home" : "/onboarding", { replace: true });
      } catch (err) {
        console.error("AuthCallback error:", err);
        setError(err?.message || "Sign-in failed. Please check browser settings.");
        setTimeout(() => navigate("/", { replace: true }), 3000);
      }
    })();
  }, [location, navigate, fetchMe]);

  return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-4 p-8 text-center" data-testid="auth-callback">
      <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <p className="text-sm text-muted-foreground">
        {error || "Signing you in…"}
      </p>
      {error && (
        <p className="text-xs text-muted-foreground/60 mt-2">Redirecting to home…</p>
      )}
    </div>
  );
}
