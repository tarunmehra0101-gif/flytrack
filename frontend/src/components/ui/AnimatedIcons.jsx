import React from "react";
import { motion } from "framer-motion";
import { 
  Plane, Globe2, ScanBarcode, UploadCloud, CheckCircle2, 
  Clock, Home, Building2, Trophy, Route, MapPin, Sparkles, 
  Radar, Compass, Briefcase, Wind, User, PenLine, Loader2 
} from "lucide-react";

const AnimatedWrapper = ({ children, animate, transition, className = "" }) => (
  <motion.div animate={animate} transition={transition} className={`inline-flex items-center justify-center ${className}`}>
    {children}
  </motion.div>
);

export const AnimatedGlobeIcon = ({ size = 24, className = "" }) => (
  <AnimatedWrapper animate={{ rotate: 360 }} transition={{ duration: 15, ease: "linear", repeat: Infinity }} className={className}>
    <Globe2 size={size} strokeWidth={1.5} />
  </AnimatedWrapper>
);

export const AnimatedPlaneIcon = ({ size = 24, className = "" }) => (
  <AnimatedWrapper 
    animate={{ y: [0, -3, 0], x: [0, 2, 0], rotate: [0, 5, 0] }} 
    transition={{ duration: 3, ease: "easeInOut", repeat: Infinity }} 
    className={className}
  >
    <Plane size={size} strokeWidth={1.5} />
  </AnimatedWrapper>
);

export const AnimatedBarcodeIcon = ({ size = 24, className = "" }) => (
  <AnimatedWrapper animate={{ opacity: [1, 0.7, 1] }} transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }} className={className}>
    <div className="relative">
      <ScanBarcode size={size} strokeWidth={1.5} />
      <motion.div 
        animate={{ top: ["0%", "100%", "0%"] }} 
        transition={{ duration: 2, ease: "linear", repeat: Infinity }} 
        className="absolute left-0 w-full h-0.5 bg-primary/60 blur-[1px]" 
      />
    </div>
  </AnimatedWrapper>
);

export const AnimatedUploadIcon = ({ size = 24, className = "" }) => (
  <AnimatedWrapper animate={{ y: [0, -2, 0] }} transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }} className={className}>
    <UploadCloud size={size} strokeWidth={1.5} />
  </AnimatedWrapper>
);

export const AnimatedSuccessIcon = ({ size = 24, className = "" }) => (
  <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 10 }}>
    <CheckCircle2 size={size} strokeWidth={1.5} className={className} />
  </motion.div>
);

export const AnimatedClockIcon = ({ size = 24, className = "" }) => (
  <AnimatedWrapper animate={{ rotate: 360 }} transition={{ duration: 10, ease: "linear", repeat: Infinity }} className={className}>
    <Clock size={size} strokeWidth={1.5} />
  </AnimatedWrapper>
);

export const AnimatedHomeIcon = ({ size = 24, className = "" }) => (
  <AnimatedWrapper animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 3, ease: "easeInOut", repeat: Infinity }} className={className}>
    <Home size={size} strokeWidth={1.5} />
  </AnimatedWrapper>
);

export const AnimatedBuildingIcon = ({ size = 24, className = "" }) => (
  <AnimatedWrapper animate={{ opacity: [1, 0.8, 1] }} transition={{ duration: 4, ease: "easeInOut", repeat: Infinity }} className={className}>
    <Building2 size={size} strokeWidth={1.5} />
  </AnimatedWrapper>
);

export const AnimatedTrophyIcon = ({ size = 24, className = "" }) => (
  <AnimatedWrapper animate={{ rotate: [-5, 5, -5] }} transition={{ duration: 4, ease: "easeInOut", repeat: Infinity }} className={className}>
    <Trophy size={size} strokeWidth={1.5} />
  </AnimatedWrapper>
);

export const AnimatedRouteIcon = ({ size = 24, className = "" }) => (
  <AnimatedWrapper animate={{ x: [-2, 2, -2] }} transition={{ duration: 3, ease: "easeInOut", repeat: Infinity }} className={className}>
    <Route size={size} strokeWidth={1.5} />
  </AnimatedWrapper>
);

export const AnimatedMapPinIcon = ({ size = 24, className = "" }) => (
  <AnimatedWrapper animate={{ y: [0, -3, 0] }} transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }} className={className}>
    <MapPin size={size} strokeWidth={1.5} />
  </AnimatedWrapper>
);

export const AnimatedSparklesIcon = ({ size = 24, className = "" }) => (
  <AnimatedWrapper animate={{ rotate: [0, 15, 0], scale: [1, 1.1, 1] }} transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }} className={className}>
    <Sparkles size={size} strokeWidth={1.5} />
  </AnimatedWrapper>
);

export const AnimatedRadarIcon = ({ size = 24, className = "" }) => (
  <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
    <Radar size={size} strokeWidth={1.5} className="relative z-10" />
    <motion.div animate={{ scale: [1, 1.5], opacity: [0.5, 0] }} transition={{ duration: 2, ease: "easeOut", repeat: Infinity }} className="absolute inset-0 bg-primary/20 rounded-full" />
  </div>
);

export const AnimatedCompassIcon = ({ size = 24, className = "" }) => (
  <AnimatedWrapper animate={{ rotate: [-15, 15, -15] }} transition={{ duration: 5, ease: "easeInOut", repeat: Infinity }} className={className}>
    <Compass size={size} strokeWidth={1.5} />
  </AnimatedWrapper>
);

export const AnimatedLuggageScannerIcon = ({ size = 24, className = "" }) => (
  <AnimatedWrapper animate={{ x: [-2, 2, -2] }} transition={{ duration: 2.5, ease: "easeInOut", repeat: Infinity }} className={className}>
    <Briefcase size={size} strokeWidth={1.5} />
  </AnimatedWrapper>
);

export const AnimatedTurbulenceIcon = ({ size = 24, className = "" }) => (
  <AnimatedWrapper animate={{ y: [-1, 1, -1], rotate: [-2, 2, -2] }} transition={{ duration: 0.5, ease: "easeInOut", repeat: Infinity }} className={className}>
    <Wind size={size} strokeWidth={1.5} />
  </AnimatedWrapper>
);

export const AnimatedUserIcon = ({ size = 24, className = "" }) => (
  <AnimatedWrapper animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 3, ease: "easeInOut", repeat: Infinity }} className={className}>
    <User size={size} strokeWidth={1.5} />
  </AnimatedWrapper>
);

export const AnimatedManualEntryIcon = ({ size = 24, className = "" }) => (
  <AnimatedWrapper animate={{ rotate: [-10, 0, -10] }} transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }} className={className}>
    <PenLine size={size} strokeWidth={1.5} />
  </AnimatedWrapper>
);

export const FlightLoadingAnimation = ({ size = 64, className = "" }) => (
  <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, ease: "linear", repeat: Infinity }}>
      <Loader2 size={size} className="text-primary/70" strokeWidth={1.5} />
    </motion.div>
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider animate-pulse">Loading Flight</p>
  </div>
);
