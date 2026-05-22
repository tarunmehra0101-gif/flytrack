import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ChevronRight, Download, FileText, Link2, LogOut, Moon, Sun, Trash2, RefreshCcw, User2, MapPin, Plane } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { api } from "@/lib/api";
import { saveMockProfile, useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Autocomplete from "@/components/Autocomplete";

export default function Settings() {
  const navigate = useNavigate();
  const { user, profile, fetchMe, logout, mockAuth, setProfile } = useAuth();
  
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || user?.picture || null;
  const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.name || "Traveler";
  const importRef = useRef(null);
  const [editOpen, setEditOpen] = useState(false);
  const [preferredName, setPreferredName] = useState(profile?.preferred_name || "");
  const [homeAirport, setHomeAirport] = useState(
    profile?.home_airport_iata ? { iata: profile.home_airport_iata, city: profile.home_city_name } : null
  );
  const [dark, setDark] = useState(() => {
    if (typeof document === "undefined") return true;
    return document.documentElement.classList.contains("dark");
  });
  const [installReady, setInstallReady] = useState(() => !!window.ryokoInstallPrompt);

  useEffect(() => {
    setPreferredName(profile?.preferred_name || "");
    setHomeAirport(
      profile?.home_airport_iata ? { iata: profile.home_airport_iata, city: profile.home_city_name } : null
    );
  }, [profile]);

  useEffect(() => {
    const onReady = () => setInstallReady(true);
    window.addEventListener("ryoko-install-ready", onReady);
    return () => window.removeEventListener("ryoko-install-ready", onReady);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    setDark(next);
    localStorage.setItem("tl_theme", next ? "dark" : "light");
    api.patch("/profile", { theme_preference: next ? "dark" : "light" }).catch(() => {});
  };

  const saveProfile = async () => {
    try {
      const updates = {
        preferred_name: preferredName,
        home_city_name: homeAirport?.city || null,
        home_airport_iata: homeAirport?.iata || null,
        home_country_code: homeAirport?.country || null,
      };
      if (mockAuth) {
        const nextProfile = await saveMockProfile(updates);
        setProfile(nextProfile);
      } else {
        await api.patch("/profile", updates);
      }
      await fetchMe();
      toast.success("Profile saved");
      setEditOpen(false);
    } catch { toast.error("Couldn't save your profile"); }
  };

  const recompute = async () => {
    if (mockAuth) {
      toast.success("Demo analytics refreshed");
      return;
    }
    try {
      const { data } = await api.post("/recompute");
      toast.success(`Recomputed: ${data.trips} trips · ${data.city_stays} stays`);
    } catch { toast.error("Recompute failed"); }
  };

  const deleteUploads = async () => {
    if (!window.confirm("Delete all your local travel data on this device? This cannot be undone unless you exported a backup.")) return;
    try {
      await api.post("/local/delete-all");
      await fetchMe();
      toast.success("Local travel data cleared");
    } catch { toast.error("Couldn't clear data"); }
  };

  const exportData = async () => {
    try {
      const { data } = await api.get("/local/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ryoko-flight-timeline-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Local backup exported as JSON");
    } catch {
      toast.error("Couldn't export your Flight Timeline");
    }
  };

  const importData = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      await api.post("/local/import", JSON.parse(text));
      await fetchMe();
      toast.success("Flight Timeline imported on this device");
    } catch {
      toast.error("That backup file could not be imported");
    }
  };

  const signOut = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  const installApp = async () => {
    const prompt = window.ryokoInstallPrompt;
    if (!prompt) {
      toast.info("Use your browser menu to add Ryoko to your home screen.");
      return;
    }
    prompt.prompt();
    await prompt.userChoice.catch(() => null);
    window.ryokoInstallPrompt = null;
    setInstallReady(false);
  };

  return (
    <Shell title="Settings">
      <div className="p-4 pb-10 flex flex-col gap-5 animate-fade-up" data-testid="settings-page">
        {/* Profile */}
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Profile</p>
        <div className="tl-card p-4 flex items-center gap-4" data-testid="profile-card">
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt={fullName} 
              className="w-12 h-12 rounded-full border border-primary/30 object-cover shadow-[0_4px_12px_rgba(37,99,235,0.15)] flex-shrink-0 backdrop-blur-sm" 
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-primary/15 text-primary flex items-center justify-center">
              <User2 size={18} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{profile?.preferred_name || fullName || "Private Flight Timeline"}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            <p className="text-[11px] text-primary mt-1 capitalize">{(profile?.travel_profile_type || "frequent_flyer").replace("_", " ")}</p>
          </div>
        </div>

        {/* Home info */}
        <div className="tl-card" data-testid="home-card">
          <button
            onClick={() => setEditOpen((v) => !v)}
            className="w-full p-4 flex items-center justify-between"
            data-testid="home-edit-toggle"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center"><MapPin size={16} /></div>
              <div>
                <p className="text-xs text-muted-foreground">Home base</p>
                <p className="text-sm font-medium mt-0.5">
                  {profile?.home_city_name || "—"} · <span className="tl-mono">{profile?.home_airport_iata || "—"}</span>
                </p>
              </div>
            </div>
            <ChevronRight size={16} className={`text-muted-foreground transition ${editOpen ? "rotate-90" : ""}`} />
          </button>
          {editOpen && (
            <div className="p-4 pt-0 flex flex-col gap-3 border-t border-border" data-testid="home-edit-form">
              <Input
                data-testid="settings-preferred-name"
                placeholder="Preferred name"
                value={preferredName}
                onChange={(e) => setPreferredName(e.target.value)}
              />
              <Autocomplete
                kind="airport"
                value={homeAirport}
                onSelect={setHomeAirport}
                placeholder="Search home city or airport"
                testId="settings-home-airport"
              />
              <button onClick={saveProfile} className="tl-btn-primary text-sm mt-1" data-testid="save-home-btn">Save</button>
            </div>
          )}
        </div>

        {/* Preferences */}
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Preferences</p>
        <div className="tl-card overflow-hidden">
          <button
            onClick={installApp}
            className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition"
            data-testid="install-pwa"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center"><Download size={16} /></div>
              <div>
                <p className="text-sm font-medium">Install Ryoko</p>
                <p className="text-xs text-muted-foreground">{installReady ? "Add your Flight Timeline to this device" : "Available from your browser menu"}</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
          <div className="h-px bg-border" />
          <button
            onClick={toggleTheme}
            className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition"
            data-testid="toggle-theme"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
                {dark ? <Moon size={16} /> : <Sun size={16} />}
              </div>
              <div>
                <p className="text-sm font-medium">Theme</p>
                <p className="text-xs text-muted-foreground capitalize">{dark ? "Dark" : "Light"} mode</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
          <div className="h-px bg-border" />
          <button
            onClick={recompute}
            className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition"
            data-testid="recompute-btn"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center"><RefreshCcw size={16} /></div>
              <div>
                <p className="text-sm font-medium">Refresh my stats</p>
                <p className="text-xs text-muted-foreground">Recalculate trips, stays, and monthly stats</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
        </div>

        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Notifications</p>
        <div className="tl-card overflow-hidden">
          {[
            ["Remind after travel days", "Nudge me when a new flight probably happened"],
            ["Milestone alerts", "Tell me when I hit route, city, or airport milestones"],
          ].map(([title, desc]) => (
            <div key={title} className="p-4 flex items-center justify-between border-b last:border-b-0 border-border opacity-50 pointer-events-none">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center"><Bell size={16} /></div>
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
              <span className="tl-iata-pill !text-[9px]">soon</span>
            </div>
          ))}
        </div>

        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Data and export</p>
        <div className="tl-card overflow-hidden">
          {[
            [Download, "Export local backup", "JSON file with flights, cities, airports, and stays", exportData],
            [FileText, "Import local backup", "Restore a Ryoko JSON export on this device", () => importRef.current?.click()],
            [Link2, "Connected accounts", "Disabled in local-first beta"],
          ].map(([Icon, title, desc, action]) => (
            <button key={title} onClick={action} className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition border-b last:border-b-0 border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center"><Icon size={16} /></div>
                <div className="text-left">
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          ))}
          <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => importData(e.target.files?.[0])} />
        </div>

        {/* Danger zone */}
        <p className="text-[10px] uppercase tracking-[0.22em] text-destructive">Danger zone</p>
        <div className="tl-card overflow-hidden border-destructive/30">
          <button onClick={deleteUploads} className="w-full p-4 flex items-center justify-between hover:bg-destructive/5 transition" data-testid="delete-uploads">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-destructive/15 text-destructive flex items-center justify-center"><Trash2 size={16} /></div>
              <div className="text-left">
                <p className="text-sm font-medium">Delete all travel data</p>
                <p className="text-xs text-muted-foreground">Artifacts, parsed segments, confirmed flights</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="tl-card overflow-hidden">
          <button onClick={signOut} className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition" data-testid="logout-btn">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center"><LogOut size={16} /></div>
              <p className="text-sm font-medium">{mockAuth ? "Clear session" : "Sign out"}</p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 mt-2 text-[11px] text-muted-foreground">
          <Plane size={11} className="text-primary" />
          Ryoko v2.3 · 旅行 · Built with ❤️
        </div>
      </div>
    </Shell>
  );
}
