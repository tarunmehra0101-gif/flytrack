import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, supabaseEnabled } from "@/lib/supabaseClient";

async function finishSupabaseRedirect(location) {
  if (!supabaseEnabled) return;
  const params = new URLSearchParams(location.search || "");
  const code = params.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return;
  }

  const hash = new URLSearchParams((location.hash || "").replace(/^#/, ""));
  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
  }
}

async function waitForProfile(fetchMe) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const data = await fetchMe();
    if (data?.user) return data;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return null;
}

function consumePendingPath(profile) {
  try {
    if (profile?.onboarding_completed && localStorage.getItem("ryoko_pending_gmail_scan") === "1") {
      return "/import";
    }
  } catch {
    // Storage may be unavailable in some mobile browser modes.
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
    const params = new URLSearchParams(location.search || "");
    if (params.get("error")) {
      setError("Sign-in failed. Please try again.");
      setTimeout(() => navigate("/", { replace: true }), 1800);
      return;
    }
    (async () => {
      try {
        await finishSupabaseRedirect(location);
        const data = await waitForProfile(fetchMe);
        if (!data?.user) {
          setError("Sign-in failed. Please try again.");
          setTimeout(() => navigate("/", { replace: true }), 1800);
          return;
        }

        const pendingPath = consumePendingPath(data?.profile);
        navigate(pendingPath || (data?.profile?.onboarding_completed ? "/home" : "/onboarding"), { replace: true });
      } catch (err) {
        console.error("AuthCallback error:", err);
        setError("Sign-in failed. Please check browser settings.");
        setTimeout(() => navigate("/", { replace: true }), 2500);
      }
    })();
  }, [location, navigate, fetchMe]);

  return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-4 p-8 text-center" data-testid="auth-callback">
      <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <p className="text-sm text-muted-foreground">
        {error || "Signing you in…"}
      </p>
    </div>
  );
}
