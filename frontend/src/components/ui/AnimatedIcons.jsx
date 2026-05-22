import React from "react";
import { motion } from "framer-motion";

/**
 * AnimatedGlobeIcon: Rotating glassmorphic globe with orbital rings
 */
export function AnimatedGlobeIcon({ size = 48 }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Outer Orbit Ring */}
      <motion.svg
        className="absolute w-full h-full text-primary/30"
        viewBox="0 0 100 100"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
      >
        <ellipse cx="50" cy="50" rx="45" ry="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" transform="rotate(-30, 50, 50)" />
      </motion.svg>

      {/* Core Globe Sphere */}
      <motion.div
        className="relative rounded-full bg-gradient-to-tr from-primary/20 via-primary/5 to-sky-400/20 border border-primary/30 flex items-center justify-center overflow-hidden shadow-[inset_0_4px_12px_rgba(255,255,255,0.15),0_8px_24px_rgba(37,99,235,0.1)]"
        style={{ width: size * 0.75, height: size * 0.75 }}
        animate={{
          scale: [1, 1.03, 1],
          boxShadow: [
            "0 8px 24px rgba(37,99,235,0.1)",
            "0 8px 30px rgba(37,99,235,0.2)",
            "0 8px 24px rgba(37,99,235,0.1)"
          ]
        }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
      >
        {/* Shiny Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

        {/* Animated continents/grid lines inside */}
        <motion.svg
          className="w-full h-full text-primary/70"
          viewBox="0 0 100 100"
          animate={{ x: [-20, 20, -20] }}
          transition={{ repeat: Infinity, duration: 12, ease: "easeInOut" }}
        >
          {/* Latitude lines */}
          <line x1="10" y1="35" x2="90" y2="35" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
          <line x1="5" y1="50" x2="95" y2="50" stroke="currentColor" strokeWidth="1" strokeOpacity="0.6" />
          <line x1="10" y1="65" x2="90" y2="65" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
          
          {/* Longitudinal arcs */}
          <path d="M 50 0 A 30 50 0 0 1 50 100" fill="none" stroke="currentColor" strokeWidth="1" strokeOpacity="0.5" />
          <path d="M 50 0 A 15 50 0 0 1 50 100" fill="none" stroke="currentColor" strokeWidth="1" strokeOpacity="0.5" />
          <path d="M 50 0 A 30 50 0 0 0 50 100" fill="none" stroke="currentColor" strokeWidth="1" strokeOpacity="0.5" />
        </motion.svg>
      </motion.div>
    </div>
  );
}

/**
 * AnimatedPlaneIcon: Floating, tilting, aerodynamic 3D flight icon
 */
export function AnimatedPlaneIcon({ size = 48 }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Wave Ring behind the plane */}
      <motion.div
        className="absolute rounded-full border border-sky-500/20 bg-sky-500/5 pointer-events-none"
        style={{ width: size * 1.1, height: size * 1.1 }}
        animate={{ scale: [0.9, 1.15, 0.9], opacity: [0.3, 0.6, 0.3] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
      />

      <motion.svg
        className="relative text-sky-400 filter drop-shadow-[0_8px_16px_rgba(56,189,248,0.25)]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: size * 0.75, height: size * 0.75 }}
        animate={{
          y: [0, -6, 0],
          rotate: [0, 4, -2, 0],
          scale: [1, 1.05, 1]
        }}
        transition={{
          repeat: Infinity,
          duration: 3.5,
          ease: "easeInOut"
        }}
      >
        <path d="M17.8 20.197a15.686 15.686 0 0 0 .8-5.197 3.5 3.5 0 0 0-7-0h-1.55a4.42 4.42 0 0 1-2.867-1.07l-3.36-2.8a1.272 1.272 0 0 1 0-2.22l3.36-2.8A4.42 4.42 0 0 1 10.05 5H11.6a3.5 3.5 0 0 0 7 0 15.686 15.686 0 0 0-.8 5.197" />
        <path d="M3 12h18" />
        <path d="m14 2 2 4" />
        <path d="m14 22 2-4" />
      </motion.svg>
    </div>
  );
}

/**
 * AnimatedBarcodeIcon: Pulsating barcode with dynamic scanning laser
 */
export function AnimatedBarcodeIcon({ size = 48 }) {
  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl bg-primary/5 border border-primary/20" style={{ width: size * 1.3, height: size }}>
      {/* Pulsing lines */}
      <motion.svg
        className="text-foreground/80"
        viewBox="0 0 100 60"
        style={{ width: size, height: size * 0.6 }}
        animate={{ opacity: [0.75, 1, 0.75] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
      >
        <rect x="5" y="10" width="4" height="40" fill="currentColor" />
        <rect x="13" y="10" width="8" height="40" fill="currentColor" />
        <rect x="25" y="10" width="2" height="40" fill="currentColor" />
        <rect x="31" y="10" width="6" height="40" fill="currentColor" />
        <rect x="41" y="10" width="10" height="40" fill="currentColor" />
        <rect x="55" y="10" width="3" height="40" fill="currentColor" />
        <rect x="62" y="10" width="6" height="40" fill="currentColor" />
        <rect x="72" y="10" width="2" height="40" fill="currentColor" />
        <rect x="78" y="10" width="8" height="40" fill="currentColor" />
        <rect x="90" y="10" width="4" height="40" fill="currentColor" />
      </motion.svg>

      {/* Glowing Neon Laser Scanning Up and Down */}
      <motion.div
        className="absolute left-1 right-1 h-0.5 bg-gradient-to-r from-red-500/10 via-red-500 to-red-500/10 shadow-[0_0_8px_rgba(239,68,68,0.8),0_0_15px_rgba(239,68,68,0.4)]"
        animate={{
          y: [-size * 0.35, size * 0.35, -size * 0.35]
        }}
        transition={{
          repeat: Infinity,
          duration: 2.2,
          ease: "easeInOut"
        }}
      />
    </div>
  );
}

/**
 * AnimatedUploadIcon: Cloud bouncing with data droplets rising or falling
 */
export function AnimatedUploadIcon({ size = 48 }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Outer cloud frame */}
      <motion.svg
        className="text-primary filter drop-shadow-[0_4px_10px_rgba(37,99,235,0.15)]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: size * 0.75, height: size * 0.75 }}
        animate={{
          y: [0, -4, 0]
        }}
        transition={{
          repeat: Infinity,
          duration: 3,
          ease: "easeInOut"
        }}
      >
        <path d="M17.5 19A3.5 3.5 0 0 0 21 15.5c0-2.79-2.54-4.5-5-4.5-.42-1.89-1.74-3.5-3.5-4.5a7 7 0 0 0-11 5.5c0 2.79 2.54 4.5 5 4.5" />
        <path d="M12 12v9" />
        <path d="m15 15-3-3-3 3" />
      </motion.svg>

      {/* Floating droplets */}
      {[0, 1].map((i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-primary/80"
          style={{
            left: `${35 + i * 25}%`,
            bottom: "10%"
          }}
          animate={{
            y: [0, -22],
            opacity: [0, 0.8, 0]
          }}
          transition={{
            repeat: Infinity,
            duration: 1.8,
            delay: i * 0.8,
            ease: "easeOut"
          }}
        />
      ))}
    </div>
  );
}

/**
 * AnimatedSuccessIcon: Splendid exploding checkmark for celebratory states
 */
export function AnimatedSuccessIcon({ size = 64 }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Explosive pulse rings */}
      <motion.div
        className="absolute rounded-full border border-emerald-500/30 bg-emerald-500/5"
        style={{ width: size, height: size }}
        initial={{ scale: 0.6, opacity: 1 }}
        animate={{ scale: 1.25, opacity: 0 }}
        transition={{ repeat: Infinity, duration: 1.6, ease: "easeOut" }}
      />
      <motion.div
        className="absolute rounded-full border border-emerald-500/20"
        style={{ width: size * 0.8, height: size * 0.8 }}
        initial={{ scale: 0.6, opacity: 1 }}
        animate={{ scale: 1.1, opacity: 0 }}
        transition={{ repeat: Infinity, duration: 1.6, delay: 0.4, ease: "easeOut" }}
      />

      {/* Success Ring & Checkmark */}
      <motion.div
        className="w-12 h-12 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
        animate={{
          scale: [1, 1.08, 1]
        }}
        transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="3"
          className="w-6 h-6"
        >
          <motion.path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.5 12.75l6 6 9-13.5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </svg>
      </motion.div>
    </div>
  );
}

/**
 * AnimatedClockIcon: Bouncing, glassmorphic clock with rotating hands representing time/hours
 */
export function AnimatedClockIcon({ size = 48 }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Outer clock ring with bouncing scale animation */}
      <motion.div
        className="relative rounded-full bg-gradient-to-tr from-primary/10 via-primary/5 to-sky-400/10 border border-primary/25 flex items-center justify-center shadow-[inset_0_2px_6px_rgba(255,255,255,0.08),0_4px_12px_rgba(37,99,235,0.08)]"
        style={{ width: size * 0.85, height: size * 0.85 }}
        animate={{
          scale: [1, 1.04, 1],
        }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
      >
        {/* Dial details */}
        <div className="absolute top-1 w-0.5 h-1 bg-primary/60 rounded-full" />
        <div className="absolute right-1 h-0.5 w-1 bg-primary/60 rounded-full" />
        <div className="absolute bottom-1 w-0.5 h-1 bg-primary/60 rounded-full" />
        <div className="absolute left-1 h-0.5 w-1 bg-primary/60 rounded-full" />

        {/* Moving Hour Hand (slow loop) */}
        <motion.div
          className="absolute w-0.5 bg-primary/80 rounded-full origin-bottom"
          style={{
            height: size * 0.22,
            bottom: "50%",
            left: "calc(50% - 1px)",
          }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
        />

        {/* Moving Minute Hand (faster loop) */}
        <motion.div
          className="absolute w-0.5 bg-sky-400 rounded-full origin-bottom"
          style={{
            height: size * 0.32,
            bottom: "50%",
            left: "calc(50% - 1px)",
          }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
        />

        {/* Center pivot dot */}
        <div className="absolute w-1.5 h-1.5 rounded-full bg-white border border-primary shadow-sm" />
      </motion.div>
    </div>
  );
}

/**
 * AnimatedHomeIcon: Cozy, glowing glassmorphic cabin with puffing chimney smoke
 */
export function AnimatedHomeIcon({ size = 48 }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Expanding halo behind the cabin */}
      <motion.div
        className="absolute rounded-full bg-primary/5 filter blur-sm pointer-events-none"
        style={{ width: size * 1.1, height: size * 1.1 }}
        animate={{ scale: [0.9, 1.15, 0.9], opacity: [0.2, 0.5, 0.2] }}
        transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
      />

      <div className="relative" style={{ width: size * 0.8, height: size * 0.8 }}>
        {/* Rising Chimney Smoke Puffs */}
        {[0, 1].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-primary/20"
            style={{
              width: size * 0.08,
              height: size * 0.08,
              top: "10%",
              right: "22%",
            }}
            animate={{
              y: [0, -18],
              x: [0, Math.sin(i + 1) * 6],
              opacity: [0, 0.7, 0],
              scale: [0.8, 1.4],
            }}
            transition={{
              repeat: Infinity,
              duration: 2.2,
              delay: i * 1.1,
              ease: "easeOut",
            }}
          />
        ))}

        {/* Glassmorphic Cabin Vector */}
        <motion.svg
          className="w-full h-full text-primary filter drop-shadow-[0_4px_8px_rgba(37,99,235,0.12)]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          animate={{
            y: [0, -2, 0],
          }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        >
          {/* House Structure */}
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
          <path d="M19 9v-4h-2v2" /> {/* Chimney */}
          
          {/* Glowing Window inside house */}
          <motion.rect
            x="11"
            y="7"
            width="2"
            height="2"
            fill="rgb(250, 204, 21)"
            stroke="rgb(234, 179, 8)"
            strokeWidth="0.5"
            animate={{
              opacity: [0.6, 1, 0.6],
            }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          />
        </motion.svg>
      </div>
    </div>
  );
}

/**
 * AnimatedBuildingIcon: Modern skyline with glittering windows and rising searchlights
 */
export function AnimatedBuildingIcon({ size = 48 }) {
  return (
    <div className="relative flex items-center justify-center overflow-hidden rounded-2xl bg-sky-500/5 border border-sky-500/15" style={{ width: size * 1.2, height: size }}>
      {/* Twinkling ambient night sky */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-t from-sky-950/20 via-transparent to-transparent pointer-events-none"
        animate={{ opacity: [0.6, 0.9, 0.6] }}
        transition={{ repeat: Infinity, duration: 3.5 }}
      />

      {/* Skyscrapers */}
      <motion.svg
        className="text-sky-400/80"
        viewBox="0 0 100 60"
        style={{ width: size * 0.95, height: size * 0.65 }}
        animate={{ y: [0, -1.5, 0] }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
      >
        {/* Tall Skyscraper */}
        <rect x="15" y="10" width="18" height="50" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        {/* Glowing window dots */}
        <circle cx="21" cy="20" r="1" fill="#facc15" />
        <circle cx="27" cy="20" r="1" fill="#67e8f9" />
        <circle cx="21" cy="30" r="1" fill="#67e8f9" />
        <circle cx="27" cy="30" r="1" fill="#facc15" />
        <circle cx="21" cy="40" r="1" fill="#facc15" />
        <circle cx="27" cy="40" r="1" fill="#67e8f9" />

        {/* Medium Skyscraper */}
        <rect x="42" y="22" width="22" height="38" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="49" cy="30" r="1" fill="#67e8f9" />
        <circle cx="57" cy="30" r="1" fill="#facc15" />
        <circle cx="49" cy="40" r="1" fill="#facc15" />
        <circle cx="57" cy="40" r="1" fill="#67e8f9" />

        {/* Small Tower */}
        <rect x="73" y="32" width="14" height="28" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="80" cy="40" r="1" fill="#67e8f9" />
        <circle cx="80" cy="48" r="1" fill="#facc15" />
      </motion.svg>

      {/* Glittering window stars */}
      {[0, 1].map((i) => (
        <motion.div
          key={i}
          className="absolute w-0.5 h-0.5 rounded-full bg-yellow-400"
          style={{
            top: `${30 + i * 20}%`,
            left: `${25 + i * 40}%`,
          }}
          animate={{ opacity: [0.1, 1, 0.1], scale: [0.6, 1.4, 0.6] }}
          transition={{ repeat: Infinity, duration: 1.4, delay: i * 0.7 }}
        />
      ))}
    </div>
  );
}

/**
 * AnimatedTrophyIcon: Gleaming travel trophy cup that rotates and sparkles
 */
export function AnimatedTrophyIcon({ size = 48 }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Twinkling star particle 1 */}
      <motion.svg
        className="absolute text-yellow-400 w-3 h-3"
        style={{ top: "12%", left: "15%" }}
        viewBox="0 0 24 24"
        animate={{ scale: [0, 1, 0], rotate: 90 }}
        transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
      >
        <path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </motion.svg>

      {/* Twinkling star particle 2 */}
      <motion.svg
        className="absolute text-yellow-400 w-3 h-3"
        style={{ bottom: "16%", right: "12%" }}
        viewBox="0 0 24 24"
        animate={{ scale: [0, 1, 0], rotate: -90 }}
        transition={{ repeat: Infinity, duration: 1.8, delay: 0.9, ease: "easeInOut" }}
      >
        <path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </motion.svg>

      {/* Glassmorphic Trophy cup */}
      <motion.svg
        className="text-amber-500 filter drop-shadow-[0_4px_10px_rgba(245,158,11,0.25)]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: size * 0.75, height: size * 0.75 }}
        animate={{
          y: [0, -4, 0],
          rotate: [0, 2, -2, 0],
        }}
        transition={{ repeat: Infinity, duration: 3.2, ease: "easeInOut" }}
      >
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" />
        <path d="M12 2a6 6 0 0 1 6 6v5a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8a6 6 0 0 1 6-6Z" />
      </motion.svg>
    </div>
  );
}

/**
 * AnimatedRouteIcon: Dynamic dotted flight route path connecting two airports
 */
export function AnimatedRouteIcon({ size = 48 }) {
  return (
    <div className="relative flex items-center justify-center overflow-hidden rounded-2xl bg-violet-500/5 border border-violet-500/15" style={{ width: size * 1.3, height: size }}>
      {/* Route dashed line and paper plane tracer */}
      <svg className="w-full h-full text-violet-400" viewBox="0 0 80 40">
        {/* Anchor point 1 */}
        <circle cx="15" cy="20" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="15" cy="20" r="1.2" fill="currentColor" />

        {/* Curved dashed route line */}
        <path
          d="M 15 20 Q 40 5 65 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeDasharray="4 3"
        />

        {/* Anchor point 2 */}
        <circle cx="65" cy="20" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="65" cy="20" r="1.2" fill="currentColor" />

        {/* Bouncing moving trace dot */}
        <motion.circle
          cx="0"
          cy="0"
          r="2.5"
          fill="#38bdf8"
          style={{ originX: 0, originY: 0 }}
          animate={{
            offsetDistance: ["0%", "100%"],
          }}
          transition={{
            repeat: Infinity,
            duration: 3,
            ease: "easeInOut",
          }}
          // Approximate curve position using css motion path or coordinates animation
          motionPath={{
            path: "M 15 20 Q 40 5 65 20",
          }}
          className="shadow-sm"
        />
      </svg>
    </div>
  );
}

/**
 * AnimatedMapPinIcon: Map marker bouncing up and down with expanding ripple rings
 */
export function AnimatedMapPinIcon({ size = 48 }) {
  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
      {/* Floating marker SVG */}
      <motion.svg
        className="text-emerald-400 filter drop-shadow-[0_4px_8px_rgba(16,185,129,0.3)] z-10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: size * 0.65, height: size * 0.65 }}
        animate={{
          y: [-2, -7, -2],
        }}
        transition={{
          repeat: Infinity,
          duration: 2.2,
          ease: "easeInOut",
        }}
      >
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" fill="currentColor" />
      </motion.svg>

      {/* Ground ripple ring expanding */}
      <motion.div
        className="absolute rounded-full border-2 border-emerald-500/40 pointer-events-none"
        style={{
          width: size * 0.45,
          height: size * 0.12,
          bottom: "15%",
        }}
        initial={{ scale: 0.5, opacity: 0.8 }}
        animate={{
          scale: [0.5, 1.4, 0.5],
          opacity: [0.8, 0, 0.8],
        }}
        transition={{
          repeat: Infinity,
          duration: 2.2,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}

/**
 * AnimatedSparklesIcon: Magic twinkling stars for visual accents
 */
export function AnimatedSparklesIcon({ size = 48 }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Star 1 */}
      <motion.svg
        className="absolute text-yellow-400"
        style={{ width: size * 0.5, height: size * 0.5, top: "10%", left: "10%" }}
        viewBox="0 0 24 24"
        fill="currentColor"
        animate={{
          scale: [0.6, 1.1, 0.6],
          rotate: [0, 30, 0],
          opacity: [0.6, 1, 0.6],
        }}
        transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
      >
        <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9Z" />
      </motion.svg>

      {/* Star 2 */}
      <motion.svg
        className="absolute text-primary"
        style={{ width: size * 0.35, height: size * 0.35, bottom: "15%", right: "12%" }}
        viewBox="0 0 24 24"
        fill="currentColor"
        animate={{
          scale: [1, 0.5, 1],
          rotate: [0, -45, 0],
          opacity: [1, 0.5, 1],
        }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", delay: 0.5 }}
      >
        <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9Z" />
      </motion.svg>
    </div>
  );
}

/**
 * AnimatedUserIcon: Glowing, floating silhouette for step 1 of onboarding.
 */
export function AnimatedUserIcon({ size = 48 }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <motion.div
        className="absolute rounded-full bg-primary/10 border border-primary/20"
        style={{ width: size, height: size }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
      />
      <motion.svg
        className="text-primary relative"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: size * 0.6, height: size * 0.6 }}
        animate={{ y: [0, -3, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
      >
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </motion.svg>
    </div>
  );
}

/**
 * AnimatedManualEntryIcon: A card-perforated ticket with a glowing plus-badge in the corner.
 */
export function AnimatedManualEntryIcon({ size = 48 }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <motion.div
        className="absolute rounded-2xl bg-primary/5 border border-primary/20"
        style={{ width: size * 1.2, height: size }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
      />
      <motion.svg
        className="text-primary relative"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: size * 0.65, height: size * 0.65 }}
        animate={{ rotate: [0, 1, -1, 0], y: [0, -2, 0] }}
        transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
      >
        <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
        <path d="M12 5v14" strokeDasharray="3 3" />
      </motion.svg>
      {/* Glowing plus badge in the corner */}
      <motion.div
        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-sky-500 flex items-center justify-center text-[10px] font-bold text-white shadow-[0_0_8px_rgba(14,165,233,0.8)]"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
      >
        +
      </motion.div>
    </div>
  );
}

/**
 * FlightLoadingAnimation: An aerodynamic jet silhouette tilting and hovering with orange/yellow combustion flames, moving grid lines, and wind swirls.
 */
export function FlightLoadingAnimation({ size = 110 }) {
  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden" style={{ width: size * 1.5, height: size }}>
      {/* Wind swirls/speed lines in the background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute h-[1px] bg-gradient-to-r from-transparent via-sky-400/40 to-transparent"
            style={{
              width: "50%",
              top: `${25 + i * 25}%`,
              left: "-50%",
            }}
            animate={{
              left: ["100%", "-50%"],
            }}
            transition={{
              repeat: Infinity,
              duration: 1.2 + i * 0.3,
              ease: "linear",
              delay: i * 0.4,
            }}
          />
        ))}
      </div>

      {/* Aerodynamic jet container */}
      <motion.div
        className="relative flex items-center justify-center"
        style={{ width: size * 0.7, height: size * 0.7 }}
        animate={{
          y: [-4, 4, -4],
          rotate: [-3, 3, -3],
        }}
        transition={{
          repeat: Infinity,
          duration: 2.5,
          ease: "easeInOut",
        }}
      >
        {/* Glow behind jet */}
        <div className="absolute w-12 h-12 bg-sky-400/25 blur-xl rounded-full" />

        {/* Jet Silhouette */}
        <svg
          className="text-sky-400 filter drop-shadow-[0_8px_20px_rgba(56,189,248,0.4)]"
          viewBox="0 0 24 24"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="0.5"
          style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }} // Rotated to fly forward (facing right)
        >
          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16Z" />
        </svg>

        {/* Combustion engine flames */}
        <div className="absolute left-[15%] top-[40%] flex flex-col gap-[6px] transform -translate-x-full rotate-[90deg] origin-right">
          <motion.div
            className="w-3 h-1 bg-gradient-to-r from-red-500 via-orange-400 to-yellow-300 rounded-full"
            style={{ originX: 1 }}
            animate={{
              scaleX: [0.6, 1.4, 0.6],
              opacity: [0.8, 1, 0.8],
            }}
            transition={{
              repeat: Infinity,
              duration: 0.15,
              ease: "linear",
            }}
          />
          <motion.div
            className="w-3 h-1 bg-gradient-to-r from-red-500 via-orange-400 to-yellow-300 rounded-full"
            style={{ originX: 1 }}
            animate={{
              scaleX: [1.4, 0.6, 1.4],
              opacity: [1, 0.8, 1],
            }}
            transition={{
              repeat: Infinity,
              duration: 0.12,
              ease: "linear",
            }}
          />
        </div>
      </motion.div>
      <span className="text-[10px] tracking-[0.3em] font-semibold text-sky-400/80 uppercase mt-2 select-none animate-pulse">
        Retrieving flight status...
      </span>
    </div>
  );
}

/**
 * AnimatedRadarIcon: Circular radar screen with sweeping green beam and blinking flight blips
 */
export function AnimatedRadarIcon({ size = 48 }) {
  return (
    <div className="relative flex items-center justify-center overflow-hidden rounded-full bg-emerald-950/20 border border-emerald-500/20 shadow-[inset_0_2px_8px_rgba(16,185,129,0.1),0_0_15px_rgba(16,185,129,0.05)]" style={{ width: size, height: size }}>
      {/* Concentric rings */}
      <div className="absolute rounded-full border border-emerald-500/10" style={{ width: "80%", height: "80%" }} />
      <div className="absolute rounded-full border border-emerald-500/15" style={{ width: "50%", height: "50%" }} />
      
      {/* Crosshairs */}
      <div className="absolute h-full w-[1px] bg-emerald-500/10" />
      <div className="absolute w-full h-[1px] bg-emerald-500/10" />

      {/* Sweeper beam */}
      <motion.div
        className="absolute w-[50%] h-[50%] origin-bottom-right"
        style={{
          bottom: "50%",
          right: "50%",
          background: "conic-gradient(from 90deg at 100% 100%, rgba(16,185,129,0.3) 0deg, rgba(16,185,129,0) 90deg)",
        }}
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
      />

      {/* Target Blip 1 */}
      <motion.div
        className="absolute w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,1)]"
        style={{ top: "30%", left: "40%" }}
        animate={{
          opacity: [0.1, 1, 0.4, 0.1, 0.1, 0.1]
        }}
        transition={{
          repeat: Infinity,
          duration: 3,
          delay: 0.8,
          ease: "easeInOut"
        }}
      />

      {/* Target Blip 2 (Plane silhouette) */}
      <motion.div
        className="absolute flex items-center justify-center text-emerald-400"
        style={{ bottom: "25%", right: "30%" }}
        animate={{
          opacity: [0.1, 0.1, 0.1, 1, 0.4, 0.1]
        }}
        transition={{
          repeat: Infinity,
          duration: 3,
          delay: 1.8,
          ease: "easeInOut"
        }}
      >
        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16Z" />
        </svg>
      </motion.div>
    </div>
  );
}

/**
 * AnimatedCompassIcon: Aviation navigation compass rose with swaying needle
 */
export function AnimatedCompassIcon({ size = 48 }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Outer Dial */}
      <div className="absolute rounded-full border border-sky-500/20 bg-sky-500/5 shadow-md flex items-center justify-center" style={{ width: size * 0.9, height: size * 0.9 }}>
        {/* N, S, E, W Labels */}
        <span className="absolute top-0.5 text-[8px] font-bold text-sky-400/80">N</span>
        <span className="absolute bottom-0.5 text-[8px] font-bold text-sky-400/40">S</span>
        <span className="absolute right-0.5 text-[8px] font-bold text-sky-400/40">E</span>
        <span className="absolute left-0.5 text-[8px] font-bold text-sky-400/40">W</span>
      </div>

      {/* Rotating compass rose and needle */}
      <motion.svg
        className="relative text-sky-400 filter drop-shadow-[0_4px_8px_rgba(56,189,248,0.2)]"
        viewBox="0 0 100 100"
        style={{ width: size * 0.7, height: size * 0.7 }}
        animate={{
          rotate: [0, 8, -4, 12, 0]
        }}
        transition={{
          repeat: Infinity,
          duration: 6,
          ease: "easeInOut"
        }}
      >
        {/* Inner star design */}
        <polygon points="50,10 54,46 50,50 46,46" fill="#38bdf8" />
        <polygon points="50,90 54,54 50,50 46,54" fill="#0284c7" />
        <polygon points="90,50 54,46 50,50 54,54" fill="#0284c7" />
        <polygon points="10,50 46,46 50,50 46,54" fill="#38bdf8" />
        
        {/* Center hub */}
        <circle cx="50" cy="50" r="4" fill="white" stroke="#0284c7" strokeWidth="1" />
      </motion.svg>
    </div>
  );
}

/**
 * AnimatedLuggageScannerIcon: Conveyor belt scanner with a bag transitioning through blue X-ray laser
 */
export function AnimatedLuggageScannerIcon({ size = 48 }) {
  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl bg-indigo-500/5 border border-indigo-500/15" style={{ width: size * 1.3, height: size }}>
      {/* Scanner Arch */}
      <div className="absolute inset-x-4 top-2 bottom-3 border-2 border-b-0 border-indigo-400/30 rounded-t-xl" />
      
      {/* Laser line in scanner center */}
      <motion.div
        className="absolute w-[2px] top-2 bottom-3 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] z-10"
        style={{ left: "50%" }}
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
      />

      {/* Luggage bag sliding across conveyor belt */}
      <motion.div
        className="absolute bottom-3.5 flex items-center justify-center"
        style={{ left: "0", right: "0" }}
        animate={{
          x: [-size * 0.7, size * 0.7]
        }}
        transition={{
          repeat: Infinity,
          duration: 3.5,
          ease: "linear"
        }}
      >
        {/* The bag body changes look when passing center (X-ray overlay effect) */}
        <motion.svg
          className="w-7 h-6 mx-auto"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          animate={{
            color: ["rgba(161,161,170,0.8)", "rgba(34,211,238,1)", "rgba(161,161,170,0.8)"]
          }}
          transition={{
            repeat: Infinity,
            duration: 3.5,
            ease: "linear"
          }}
        >
          {/* Suitcase Handle */}
          <path d="M9 6V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
          {/* Suitcase Body */}
          <rect x="4" y="6" width="16" height="14" rx="2" fill="currentColor" fillOpacity="0.15" />
          {/* Small wheels */}
          <circle cx="7" cy="21" r="1" fill="currentColor" />
          <circle cx="17" cy="21" r="1" fill="currentColor" />
        </motion.svg>
      </motion.div>

      {/* Conveyor belt roller line */}
      <div className="absolute bottom-2 left-1.5 right-1.5 h-[3px] bg-slate-700/60 rounded-full" />
    </div>
  );
}

/**
 * AnimatedTurbulenceIcon: Curved airfoil wing with wind vectors sweeping over it representing lift
 */
export function AnimatedTurbulenceIcon({ size = 48 }) {
  return (
    <div className="relative flex items-center justify-center overflow-hidden rounded-2xl bg-violet-500/5 border border-violet-500/15" style={{ width: size * 1.3, height: size }}>
      {/* Airfoil Wing in Center */}
      <svg className="absolute w-[40%] h-[30%] text-violet-400/80 z-10" viewBox="0 0 40 20" style={{ left: "30%" }}>
        {/* Tear shape representing aircraft wing cross section */}
        <path d="M 5 10 C 15 2, 35 7, 38 10 C 35 13, 15 18, 5 10 Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="1.5" />
      </svg>

      {/* Streamlines moving past */}
      <svg className="w-full h-full text-sky-400/40" viewBox="0 0 100 60">
        {[15, 30, 45].map((y, idx) => (
          <motion.path
            key={idx}
            d={`M -20 ${y} Q 30 ${y - 12} 50 ${y + 2} T 120 ${y}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="4 6"
            animate={{
              strokeDashOffset: [-20, 20]
            }}
            transition={{
              repeat: Infinity,
              duration: 2 - idx * 0.3,
              ease: "linear"
            }}
          />
        ))}
      </svg>
    </div>
  );
}


