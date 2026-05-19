import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { endLocalSession, getLocalProfile, hasLocalSession, importLedger, localUser, startLocalSession, updateLocalProfile } from "@/lib/localLedger";
import { publicAppUrl, supabase, supabaseEnabled } from "@/lib/supabaseClient";
import { pullSupabaseLedger } from "@/lib/supabaseSync";

const AuthContext = createContext(null);
export const MOCK_AUTH_ENABLED = false;

function safeSetLocalStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Some mobile browser modes restrict storage during OAuth redirects.
  }
}

function safeRemoveLocalStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Some mobile browser modes restrict storage during OAuth redirects.
  }
}

export async function saveMockProfile(updates) {
  return updateLocalProfile(updates);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    if (supabaseEnabled) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setUser(null);
        setProfile(null);
        return null;
      }
      if (session.provider_token) {
        safeSetLocalStorage("gmail_provider_token", session.provider_token);
      }
      if (session.provider_refresh_token) {
        safeSetLocalStorage("gmail_provider_refresh_token", session.provider_refresh_token);
      }
      if (session.provider_token && session.user?.app_metadata?.provider) {
        safeSetLocalStorage("gmail_provider_scopes", "https://www.googleapis.com/auth/gmail.readonly");
      }
      const sbUser = session.user;
      const { data: profileRow, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", sbUser.id)
        .maybeSingle();
      if (profileError) {
        console.warn("Ryoko profile load failed", profileError);
      }
      const nextUser = {
        user_id: sbUser.id,
        email: sbUser.email,
        name: sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || sbUser.email?.split("@")[0],
        picture: sbUser.user_metadata?.avatar_url || null,
        local_first: false,
      };
      const nextProfile = profileRow || {
        user_id: sbUser.id,
        preferred_name: nextUser.name?.split(" ")[0] || "",
        home_city_name: null,
        home_airport_iata: null,
        home_country_code: null,
        travel_profile_type: "frequent_flyer",
        onboarding_completed: false,
      };
      try {
        const ledger = await pullSupabaseLedger();
        if (ledger) await importLedger({ ...ledger, profile: ledger.profile || nextProfile });
      } catch (err) {
        console.warn("Ryoko Supabase ledger pull failed", err);
      }
      setUser(nextUser);
      setProfile(nextProfile);
      return { user: nextUser, profile: nextProfile };
    }
    if (!hasLocalSession()) {
      setUser(null);
      setProfile(null);
      return null;
    }
    const nextProfile = await getLocalProfile();
    const nextUser = localUser();
    setUser(nextUser);
    setProfile(nextProfile);
    return { user: nextUser, profile: nextProfile };
  }, []);

  useEffect(() => {
    fetchMe()
      .catch((err) => {
        console.warn("Ryoko auth bootstrap failed", err);
        setUser(null);
        setProfile(null);
      })
      .finally(() => setLoading(false));
    if (!supabaseEnabled) return undefined;
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      fetchMe()
        .catch((err) => {
          console.warn("Ryoko auth refresh failed", err);
          setUser(null);
          setProfile(null);
        })
        .finally(() => setLoading(false));
    });
    return () => listener?.subscription?.unsubscribe?.();
  }, [fetchMe]);

  const logout = useCallback(async () => {
    if (supabaseEnabled) {
      await supabase.auth.signOut();
    }
    try { await api.post("/auth/logout"); } catch { endLocalSession(); }
    safeRemoveLocalStorage("tl_session_token");
    safeRemoveLocalStorage("gmail_provider_token");
    safeRemoveLocalStorage("gmail_provider_refresh_token");
    safeRemoveLocalStorage("gmail_provider_scopes");
    setUser(null);
    setProfile(null);
  }, []);

  const loginMock = useCallback(async () => {
    if (supabaseEnabled) {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${publicAppUrl()}/auth/callback`,
        },
      });
      return null;
    }
    startLocalSession();
    const nextProfile = await getLocalProfile();
    const nextUser = localUser();
    setUser(nextUser);
    setProfile(nextProfile);
    return { user: nextUser, profile: nextProfile };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, setProfile, loading, fetchMe, logout, loginMock, mockAuth: !supabaseEnabled, localFirst: !supabaseEnabled, supabaseEnabled }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
