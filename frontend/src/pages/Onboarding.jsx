import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Check, MapPin, Plane, ShieldCheck, User2, Video } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { saveMockProfile, useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import Autocomplete from "@/components/Autocomplete";
import { supabase, supabaseEnabled } from "@/lib/supabaseClient";


export default function Onboarding() {
  const navigate = useNavigate();
  const { user, profile, fetchMe, mockAuth, setProfile } = useAuth();
  const [stepIdx, setStepIdx] = useState(0);
  const [name, setName] = useState("");
  const [homeAirport, setHomeAirport] = useState(
    profile?.home_airport_iata ? { iata: profile.home_airport_iata, city: profile.home_city_name } : null
  );
  const [travelType, setTravelType] = useState(profile?.travel_profile_type || "frequent_traveler");
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const profileSavedRef = useRef(false);



  const steps = [
    {
      key: "name",
      icon: User2,
      title: "Hey! What should we call you?",
      hint: "Just a first name — we like to keep it friendly.",
      valid: () => name.trim().length > 0,
    },
    {
      key: "home",
      icon: MapPin,
      title: "Where's home base for you?",
      hint: "This helps us figure out when you're traveling vs. at home.",
      valid: () => !!homeAirport?.iata,
    },
    {
      key: "persona",
      icon: Plane,
      title: "How do you usually travel?",
      hint: "We'll personalize your travel insights based on this.",
      valid: () => !!travelType,
    }
  ];

  const step = steps[stepIdx];
  const Icon = step.icon;

  /* ---------- Save profile ---------- */
  const saveProfile = async () => {
    if (profileSavedRef.current) return true;
    try {
      const updates = {
        preferred_name: name.trim(),
        home_city_name: homeAirport?.city || null,
        home_airport_iata: homeAirport?.iata || null,
        home_country_code: homeAirport?.country || null,
        travel_profile_type: travelType,
        onboarding_completed: true,
      };
      if (mockAuth) {
        const nextProfile = await saveMockProfile(updates);
        setProfile(nextProfile);
        profileSavedRef.current = true;
        return true;
      }
      if (supabaseEnabled) {
        const { data: { user: sbUser } } = await supabase.auth.getUser();
        const row = { id: sbUser.id, ...updates, updated_at: new Date().toISOString() };
        const { error } = await supabase.from("profiles").upsert(row, { onConflict: "id" });
        if (error) throw error;
      } else {
        await api.patch("/profile", updates);
      }
      const freshData = await fetchMe();
      if (freshData?.profile) setProfile(freshData.profile);
      profileSavedRef.current = true;
      return true;
    } catch (err) {
      console.error("Profile save failed:", err);
      return false;
    }
  };

  /* ---------- Step navigation ---------- */
  const onNext = async () => {
    if (!step.valid() || submitting) return;

    // If we're on the last step ("persona"), save profile then redirect to import
    if (step.key === "persona") {
      setSubmitting(true);
      const ok = await saveProfile();
      setSubmitting(false);
      if (!ok) {
        setSaveError("Could not save your profile. Please try again.");
        return;
      }
      navigate("/import?onboarding=true", { replace: true });
      return;
    }

    // If we're on a regular step, advance
    if (stepIdx < steps.length - 1) {
      setStepIdx(stepIdx + 1);
      return;
    }

    // If no gmail step, save profile and go home
    setSubmitting(true);
    const ok = await saveProfile();
    setSubmitting(false);
    if (ok) goHome();
  };

  const goHome = () => {
    // Directly navigate — profile is already saved with onboarding_completed=true
    navigate("/home", { replace: true });
  };

  return (
    <div className="h-full w-full flex flex-col px-6 pt-14 pb-8 overflow-y-auto no-scrollbar" data-testid="onboarding-page">
      {/* Back button + Progress bar */}
      <div className="flex items-center gap-3 mb-10">
        {stepIdx > 0 && (
          <button
            type="button"
            onClick={() => setStepIdx(stepIdx - 1)}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition"
            aria-label="Go back"
          >
            <ArrowLeft size={16} />
          </button>
        )}
        <div className="flex gap-1.5 flex-1">
          {steps.map((s, i) => (
            <div
              key={s.key}
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= stepIdx ? "bg-primary" : "bg-border"}`}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step.key}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
          className="flex flex-col flex-1"
        >
          {/* Standard header for non-gmail steps */}
          {step.key !== "gmail" && (
            <>
              <div className="w-10 h-10 rounded-2xl bg-primary/12 text-primary flex items-center justify-center mb-6">
                <Icon size={18} strokeWidth={2.2} />
              </div>
              <h2 className="text-[26px] font-light tracking-tight leading-snug">{step.title}</h2>
              <p className="text-sm text-muted-foreground mt-2">{step.hint}</p>
            </>
          )}

          <div className="mt-10 flex-1">
            {step.key === "name" ? (
              <Input
                data-testid="onboarding-input-preferred_name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Suba"
                autoFocus
                className="bg-transparent border-0 border-b-2 border-border rounded-none px-0 text-2xl focus-visible:ring-0 focus-visible:border-primary h-14 tracking-tight"
              />
            ) : step.key === "home" ? (
              <Autocomplete
                kind="airport"
                value={homeAirport}
                onSelect={(it) => setHomeAirport(it)}
                placeholder="Mumbai, Delhi, Bengaluru…"
                testId="onboarding-home-ac"
              />
            ) : step.key === "persona" ? (
              <div className="grid gap-4 mt-2">
                {[
                  ["consultant", BriefcaseBusiness, "Business Traveler", "Client meetings, airport hours, home-away balance", "emerald"],
                  ["frequent_traveler", Plane, "Frequent Traveler", "Routes, airlines, miles, and yearly rhythm", "sky"],
                  ["creator", Video, "Travel Influencer", "Destinations, stories, and content inspiration", "violet"],
                ].map(([key, ChoiceIcon, label, desc, tone], idx) => {
                  const isActive = travelType === key;
                  return (
                  <motion.button
                    key={key}
                    type="button"
                    onClick={() => setTravelType(key)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.08, duration: 0.4 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative overflow-hidden text-left flex items-start gap-4 p-5 rounded-[22px] border transition-all duration-300 ${
                      isActive 
                        ? "bg-primary/5 border-primary shadow-sm" 
                        : "bg-card border-border hover:bg-muted/50 hover:border-muted-foreground/30"
                    }`}
                    data-testid={`persona-${key}`}
                  >
                    {isActive && (
                      <motion.div 
                        layoutId="active-persona-bg"
                        className="absolute inset-0 bg-primary/5"
                        initial={false}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <div className={`relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors duration-300 ${
                      isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      <ChoiceIcon size={22} strokeWidth={2} />
                    </div>
                    <div className="relative z-10 flex-1 pt-0.5">
                      <span className={`block text-base font-semibold mb-1 transition-colors duration-300 ${isActive ? "text-primary" : "text-foreground"}`}>{label}</span>
                      <span className="block text-sm text-muted-foreground leading-relaxed pr-4">{desc}</span>
                    </div>
                    <div className={`relative z-10 w-6 h-6 mt-1 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isActive ? "bg-primary text-primary-foreground scale-100" : "border-2 border-muted text-transparent scale-90 opacity-50"
                    }`}>
                      <Check size={14} strokeWidth={3} />
                    </div>
                  </motion.button>
                )})}
              </div>

            ) : null}
          </div>

          {/* Bottom CTA */}
          <div className="mt-auto pt-6 flex-shrink-0">
            {stepIdx === 0 && (
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-3">
                <ShieldCheck size={11} /> Only what we need to shape your travel story.
              </p>
            )}
            <button
              data-testid="onboarding-next-btn"
              onClick={onNext}
              disabled={!step.valid() || submitting}
              className={`tl-btn-primary w-full flex items-center justify-center gap-2 ${!step.valid() ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              {step.key === "persona"
                ? (submitting ? "Setting up…" : "Let's go ✈️")
                : "Continue"}
              {!submitting && step.key !== "persona" && <ArrowRight size={16} />}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
