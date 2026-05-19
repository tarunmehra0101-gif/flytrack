import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BriefcaseBusiness, Camera, MapPin, Plane, ShieldCheck, User2, Sparkles, Mail, Search } from "lucide-react";
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
  const [name, setName] = useState(profile?.preferred_name || "");
  const [homeAirport, setHomeAirport] = useState(
    profile?.home_airport_iata ? { iata: profile.home_airport_iata, city: profile.home_city_name } : null
  );
  const [travelType, setTravelType] = useState(profile?.travel_profile_type || "frequent_flyer");
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const profileSavedRef = useRef(false);

  useEffect(() => {
    if (!name && user?.name) setName(user.name.split(" ")[0]);
  }, [name, user?.name]);

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
    <div className="h-full w-full flex flex-col px-6 pt-14 pb-8" data-testid="onboarding-page">
      {/* Progress bar */}
      <div className="flex gap-1.5 mb-10">
        {steps.map((s, i) => (
          <div
            key={s.key}
            className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= stepIdx ? "bg-primary" : "bg-border"}`}
          />
        ))}
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
              <div className="grid gap-3">
                {[
                  ["consultant", BriefcaseBusiness, "Consultant", "Client cities, home time, airport hours", "emerald"],
                  ["creator", Camera, "Creator", "Shoots, places, memories", "violet"],
                  ["frequent_flyer", Plane, "Frequent Flyer", "Routes, airlines, yearly rhythm", "sky"],
                  ["exploring", MapPin, "Traveler", "Cities, stays, travel story", "gold"],
                ].map(([key, ChoiceIcon, label, desc, tone], idx) => (
                  <motion.button
                    key={key}
                    type="button"
                    onClick={() => setTravelType(key)}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    whileTap={{ scale: 0.97 }}
                    className={`tl-persona-card tl-persona-${tone} text-left flex items-center gap-3 ${
                      travelType === key ? "is-active" : ""
                    }`}
                    data-testid={`persona-${key}`}
                  >
                    <span className="tl-persona-icon">
                      <ChoiceIcon size={15} />
                    </span>
                    <span className="relative z-10">
                      <span className="block text-sm font-semibold">{label}</span>
                      <span className="block text-xs text-white/62">{desc}</span>
                    </span>
                  </motion.button>
                ))}
              </div>

            ) : null}
          </div>

          {/* Bottom CTA */}
          <div className="mt-auto">
            {stepIdx === 0 && (
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-3">
                <ShieldCheck size={11} /> Only what we need to shape your travel story.
              </p>
            )}
            <button
              data-testid="onboarding-next-btn"
              onClick={onNext}
              disabled={!step.valid() || submitting}
              className="tl-btn-primary w-full flex items-center justify-center gap-2"
            >
              {step.key === "persona"
                ? (submitting ? "Setting up…" : "Take me in")
                : "Continue"}
              {!submitting && <ArrowRight size={16} />}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
