import React from "react";
import { motion } from "framer-motion";
import { Camera, ChartNoAxesCombined, Plane, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Splash() {
  const { loginMock, supabaseEnabled } = useAuth();
  const handleStart = async () => {
    await loginMock();
  };

  return (
    <div className="h-full w-full relative flex flex-col overflow-hidden" data-testid="splash-page">
      <img
        src="https://images.pexels.com/photos/7595294/pexels-photo-7595294.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=600"
        alt="Airplane wing above clouds"
        className="absolute inset-0 w-full h-full object-cover opacity-80"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/70 to-background" />
      <div className="tl-radar-grid absolute inset-0 opacity-20 pointer-events-none" />

      <div className="relative z-10 flex flex-col h-full px-6 pt-12 pb-10">
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-2 text-white"
        >
          <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center border border-white/20">
            <Plane size={15} strokeWidth={2.5} />
          </div>
          <span className="text-[10px] uppercase tracking-[0.3em] text-white/80">Ryoko</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="mt-auto text-white"
        >
          <h1 className="text-[44px] leading-[1.05] font-light tracking-tighter">
            Your flights, <br />
            hours, cities, <br />
            <span className="italic font-normal">all in one place.</span>
          </h1>
          <p className="mt-5 text-white/75 text-[15px] leading-relaxed max-w-[28ch]">
            Ryoko finds flights from Gmail, PDFs, and boarding passes so travellers and consultants can understand their year in the air.
          </p>
          <div className="mt-6 grid gap-2.5 text-[12px] text-white/80">
            {[
              [Camera, "Scan boarding passes, PDFs, and email receipts"],
              [ChartNoAxesCombined, "Track flights, air hours, cities, and routes"],
              [Sparkles, "See home-away balance and yearly milestones"],
            ].map(([Icon, text]) => (
              <div key={text} className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
                  <Icon size={13} />
                </span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 flex flex-col gap-3"
        >
          <button
            onClick={handleStart}
            data-testid="google-signin-btn"
            className="w-full h-12 bg-white text-black/80 rounded border border-black/10 font-medium flex items-center justify-center gap-3 hover:bg-gray-50 hover:text-black hover:shadow-sm active:bg-gray-100 transition"
          >
            {supabaseEnabled ? (
              <>
                <svg width="18" height="18" viewBox="0 0 48 48" className="mr-1">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  <path fill="none" d="M0 0h48v48H0z"/>
                </svg>
                Sign in with Google
              </>
            ) : (
              <>
                <ShieldCheck size={18} />
                Start my Flight Timeline
              </>
            )}
          </button>
          <div className="flex items-center justify-center gap-2 text-[11px] text-white/60">
            <ShieldCheck size={12} /> {supabaseEnabled ? "Secure sync with Google sign-in." : "Local-first. No account required. Data stays on this device."}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
