import React, { useState, useRef, useEffect } from "react";
import { Plane, MapPin, UserRound } from "lucide-react";
import AirlineLogo from "@/components/AirlineLogo";
import { AIRPORTS, AIRLINES } from "@/data/airports";

/**
 * Boarding-pass styled flight card.
 * - Props: flight (segment or flight object),
 *          compact (boolean),
 *          footerRight (React node),
 *          isEditable (boolean),
 *          onChange (function(updatedFlight))
 */
function fmtTime(value, date) {
  if (!value) return "";
  if (String(value).match(/^\d{1,2}[:.]\d{2}/)) return String(value).replace(".", ":").slice(0, 5);
  try {
    const d = new Date(value);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

function fmtDate(value) {
  if (!value) return "";
  try {
    const d = String(value).length === 10 ? new Date(`${value}T00:00:00`) : new Date(value);
    return d.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
  } catch { return value; }
}

function cityLabel(iata, explicit) {
  if (explicit) return explicit;
  const a = AIRPORTS[iata];
  return a ? a.city : iata || "—";
}

function formatDuration(minutes) {
  if (!minutes) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export const AIRLINE_BRANDS = {
  // India
  "AI": { name: "Air India", color: "#d42b1e", from: "#520c06", to: "#1f0502", borderHex: "rgba(212, 43, 30, 0.22)", textMuted: "text-red-200/50", textPrimary: "text-white", accentBadge: "bg-amber-400/15 text-amber-200 border-amber-400/20", borderDashed: "border-red-400/20", inputBorder: "border-red-400/30 focus:border-red-200 focus:ring-red-400/20", inputText: "text-white" },
  "6E": { name: "IndiGo", color: "#00a1de", from: "#001e44", to: "#000b1a", borderHex: "rgba(0, 161, 222, 0.22)", textMuted: "text-blue-200/50", textPrimary: "text-white", accentBadge: "bg-cyan-400/15 text-cyan-200 border-cyan-400/20", borderDashed: "border-blue-400/20", inputBorder: "border-blue-400/30 focus:border-blue-200 focus:ring-blue-400/20", inputText: "text-white" },
  "UK": { name: "Vistara", color: "#c5a059", from: "#291330", to: "#130917", borderHex: "rgba(197, 160, 89, 0.22)", textMuted: "text-fuchsia-200/50", textPrimary: "text-white", accentBadge: "bg-amber-400/15 text-amber-200 border-amber-400/20", borderDashed: "border-fuchsia-400/20", inputBorder: "border-fuchsia-400/30 focus:border-fuchsia-200 focus:ring-fuchsia-400/20", inputText: "text-white" },
  "SG": { name: "SpiceJet", color: "#d50000", from: "#4c0000", to: "#1f0000", borderHex: "rgba(213, 0, 0, 0.22)", textMuted: "text-orange-200/50", textPrimary: "text-white", accentBadge: "bg-yellow-400/15 text-yellow-200 border-yellow-400/20", borderDashed: "border-orange-400/20", inputBorder: "border-orange-400/30 focus:border-orange-200 focus:ring-orange-400/20", inputText: "text-white" },
  "QP": { name: "Akasa Air", color: "#ff6600", from: "#4c1f00", to: "#240e00", borderHex: "rgba(255, 102, 0, 0.22)", textMuted: "text-orange-100/50", textPrimary: "text-white", accentBadge: "bg-purple-400/15 text-purple-200 border-purple-400/20", borderDashed: "border-orange-400/20", inputBorder: "border-orange-400/30 focus:border-orange-200 focus:ring-orange-400/20", inputText: "text-white" },
  "IX": { name: "Air India Express", color: "#e04e26", from: "#45170b", to: "#200a05", borderHex: "rgba(224, 78, 38, 0.22)", textMuted: "text-orange-200/50", textPrimary: "text-white", accentBadge: "bg-amber-400/15 text-amber-200 border-amber-400/20", borderDashed: "border-orange-400/20", inputBorder: "border-orange-400/30 focus:border-orange-200 focus:ring-orange-400/20", inputText: "text-white" },
  "I5": { name: "AirAsia India", color: "#e11b22", to: "#1f0406", from: "#4a090b", borderHex: "rgba(225, 27, 34, 0.22)", textMuted: "text-red-200/50", textPrimary: "text-white", accentBadge: "bg-white/15 text-white border-white/20", borderDashed: "border-red-400/20", inputBorder: "border-red-400/30 focus:border-red-200 focus:ring-red-400/20", inputText: "text-white" },
  "G8": { name: "Go First", color: "#0057b8", from: "#002045", to: "#000d1c", borderHex: "rgba(0, 87, 184, 0.22)", textMuted: "text-blue-200/50", textPrimary: "text-white", accentBadge: "bg-teal-400/15 text-teal-200 border-teal-400/20", borderDashed: "border-blue-400/20", inputBorder: "border-blue-400/30 focus:border-blue-200 focus:ring-blue-400/20", inputText: "text-white" },

  // Middle East
  "EK": { name: "Emirates", color: "#d71920", from: "#47080b", to: "#1f0305", borderHex: "rgba(215, 25, 32, 0.22)", textMuted: "text-red-200/50", textPrimary: "text-white", accentBadge: "bg-amber-400/15 text-amber-200 border-amber-400/20", borderDashed: "border-red-400/20", inputBorder: "border-red-400/30 focus:border-red-200 focus:ring-red-400/20", inputText: "text-white" },
  "EY": { name: "Etihad", color: "#c5a059", from: "#292723", to: "#12110f", borderHex: "rgba(197, 160, 89, 0.22)", textMuted: "text-amber-200/50", textPrimary: "text-white", accentBadge: "bg-amber-400/15 text-amber-200 border-amber-400/20", borderDashed: "border-amber-500/20", inputBorder: "border-amber-500/30 focus:border-amber-200 focus:ring-amber-400/20", inputText: "text-white" },
  "QR": { name: "Qatar Airways", color: "#5c0632", from: "#2d0318", to: "#14010b", borderHex: "rgba(92, 6, 50, 0.22)", textMuted: "text-rose-200/50", textPrimary: "text-white", accentBadge: "bg-amber-400/15 text-amber-200 border-amber-400/20", borderDashed: "border-rose-400/20", inputBorder: "border-rose-400/30 focus:border-rose-200 focus:ring-rose-400/20", inputText: "text-white" },

  // Europe
  "BA": { name: "British Airways", color: "#075aaa", from: "#051336", to: "#020817", borderHex: "rgba(11, 34, 101, 0.22)", textMuted: "text-blue-200/50", textPrimary: "text-white", accentBadge: "bg-red-400/15 text-red-200 border-red-400/20", borderDashed: "border-blue-400/20", inputBorder: "border-blue-400/30 focus:border-blue-200 focus:ring-blue-400/20", inputText: "text-white" },
  "LH": { name: "Lufthansa", color: "#ffc72c", from: "#020a26", to: "#010412", borderHex: "rgba(5, 22, 77, 0.22)", textMuted: "text-blue-200/50", textPrimary: "text-white", accentBadge: "bg-amber-400/25 text-amber-200 border-amber-400/30", borderDashed: "border-blue-400/20", inputBorder: "border-blue-400/30 focus:border-blue-200 focus:ring-blue-400/20", inputText: "text-white" },
  "AF": { name: "Air France", color: "#e2001a", from: "#001030", to: "#000817", borderHex: "rgba(0, 32, 96, 0.22)", textMuted: "text-blue-200/50", textPrimary: "text-white", accentBadge: "bg-red-500/15 text-red-200 border-red-400/20", borderDashed: "border-blue-400/20", inputBorder: "border-blue-400/30 focus:border-blue-200 focus:ring-blue-400/20", inputText: "text-white" },
  "KL": { name: "KLM", color: "#00a1de", from: "#003b54", to: "#001b26", borderHex: "rgba(0, 161, 222, 0.22)", textMuted: "text-sky-100/50", textPrimary: "text-white", accentBadge: "bg-blue-900/20 text-white border-blue-900/30", borderDashed: "border-sky-200/20", inputBorder: "border-sky-300/30 focus:border-white focus:ring-white/20", inputText: "text-white" },
  "LX": { name: "SWISS", color: "#e30613", to: "#1f0103", from: "#4c0206", borderHex: "rgba(227, 6, 19, 0.22)", textMuted: "text-red-100/50", textPrimary: "text-white", accentBadge: "bg-white/15 text-white border-white/20", borderDashed: "border-red-400/20", inputBorder: "border-red-400/30 focus:border-red-200 focus:ring-red-400/20", inputText: "text-white" },
  "TK": { name: "Turkish Airlines", color: "#c8102e", from: "#42060f", to: "#1f0307", borderHex: "rgba(200, 16, 46, 0.22)", textMuted: "text-red-200/50", textPrimary: "text-white", accentBadge: "bg-slate-700/35 text-slate-200 border-slate-600/30", borderDashed: "border-red-400/20", inputBorder: "border-red-400/30 focus:border-red-200 focus:ring-red-400/20", inputText: "text-white" },

  // Asia / Pacific
  "SQ": { name: "Singapore Airlines", color: "#c5a059", from: "#00143a", to: "#000a1d", borderHex: "rgba(0, 32, 91, 0.22)", textMuted: "text-blue-200/50", textPrimary: "text-white", accentBadge: "bg-amber-400/15 text-amber-200 border-amber-400/20", borderDashed: "border-blue-400/20", inputBorder: "border-blue-400/30 focus:border-blue-200 focus:ring-blue-400/20", inputText: "text-white" },
  "CX": { name: "Cathay Pacific", color: "#006564", from: "#002d2d", to: "#001414", borderHex: "rgba(0, 101, 100, 0.22)", textMuted: "text-teal-200/50", textPrimary: "text-white", accentBadge: "bg-amber-200/15 text-amber-200 border-amber-200/20", borderDashed: "border-teal-400/20", inputBorder: "border-teal-400/30 focus:border-teal-200 focus:ring-teal-400/20", inputText: "text-white" },
  "TG": { name: "Thai Airways", color: "#e4a025", from: "#240a25", to: "#100411", borderHex: "rgba(74, 21, 75, 0.22)", textMuted: "text-purple-200/50", textPrimary: "text-white", accentBadge: "bg-amber-400/15 text-amber-200 border-amber-400/20", borderDashed: "border-purple-400/20", inputBorder: "border-purple-400/30 focus:border-purple-200 focus:ring-purple-400/20", inputText: "text-white" },
  "UL": { name: "SriLankan Airlines", color: "#005740", from: "#00291e", to: "#00120d", borderHex: "rgba(0, 87, 64, 0.22)", textMuted: "text-teal-200/50", textPrimary: "text-white", accentBadge: "bg-amber-400/15 text-amber-200 border-amber-400/20", borderDashed: "border-teal-400/20", inputBorder: "border-teal-400/30 focus:border-teal-200 focus:ring-teal-400/20", inputText: "text-white" },
  "MH": { name: "Malaysia Airlines", color: "#e2001a", from: "#001030", to: "#000817", borderHex: "rgba(0, 32, 96, 0.22)", textMuted: "text-blue-200/50", textPrimary: "text-white", accentBadge: "bg-red-500/15 text-red-200 border-red-400/20", borderDashed: "border-blue-400/20", inputBorder: "border-blue-400/30 focus:border-blue-200 focus:ring-blue-400/20", inputText: "text-white" },
  "JL": { name: "Japan Airlines", color: "#d90011", from: "#420005", to: "#1f0002", borderHex: "rgba(217, 0, 17, 0.22)", textMuted: "text-red-200/50", textPrimary: "text-white", accentBadge: "bg-zinc-800/40 text-white border-zinc-700/30", borderDashed: "border-red-400/20", inputBorder: "border-red-400/30 focus:border-red-200 focus:ring-red-400/20", inputText: "text-white" },
  "NH": { name: "ANA", color: "#0086d6", from: "#001b3b", to: "#000c1c", borderHex: "rgba(0, 68, 148, 0.22)", textMuted: "text-blue-200/50", textPrimary: "text-white", accentBadge: "bg-sky-400/15 text-sky-200 border-sky-400/20", borderDashed: "border-blue-400/20", inputBorder: "border-blue-400/30 focus:border-blue-200 focus:ring-blue-400/20", inputText: "text-white" },
  "KE": { name: "Korean Air", color: "#0055a5", from: "#001a33", to: "#000c17", borderHex: "rgba(0, 85, 165, 0.22)", textMuted: "text-blue-100/50", textPrimary: "text-white", accentBadge: "bg-red-500/15 text-red-200 border-red-400/20", borderDashed: "border-blue-300/20", inputBorder: "border-blue-400/30 focus:border-blue-200 focus:ring-blue-400/20", inputText: "text-white" },
  "QF": { name: "Qantas", color: "#e01a22", from: "#40080a", to: "#1a0304", borderHex: "rgba(224, 26, 34, 0.22)", textMuted: "text-red-200/50", textPrimary: "text-white", accentBadge: "bg-white/15 text-white border-white/20", borderDashed: "border-red-400/20", inputBorder: "border-red-400/30 focus:border-red-200 focus:ring-red-400/20", inputText: "text-white" },
  "AK": { name: "AirAsia", color: "#e11b22", from: "#4a090b", to: "#1f0406", borderHex: "rgba(225, 27, 34, 0.22)", textMuted: "text-red-200/50", textPrimary: "text-white", accentBadge: "bg-black/20 text-white border-white/10", borderDashed: "border-red-400/20", inputBorder: "border-red-400/30 focus:border-red-200 focus:ring-red-400/20", inputText: "text-white" },

  // Americas
  "UA": { name: "United", color: "#005b94", from: "#001020", to: "#000810", borderHex: "rgba(0, 34, 68, 0.22)", textMuted: "text-blue-200/50", textPrimary: "text-white", accentBadge: "bg-sky-500/15 text-sky-200 border-sky-400/20", borderDashed: "border-blue-400/20", inputBorder: "border-blue-400/30 focus:border-blue-200 focus:ring-blue-400/20", inputText: "text-white" },
  "AA": { name: "American", color: "#0078d2", from: "#002440", to: "#00101c", borderHex: "rgba(0, 120, 210, 0.22)", textMuted: "text-blue-100/50", textPrimary: "text-white", accentBadge: "bg-red-500/15 text-red-200 border-red-400/20", borderDashed: "border-blue-300/20", inputBorder: "border-blue-400/30 focus:border-blue-200 focus:ring-blue-400/20", inputText: "text-white" },
  "DL": { name: "Delta", color: "#c8102e", from: "#001020", to: "#000810", borderHex: "rgba(0, 51, 102, 0.22)", textMuted: "text-blue-200/50", textPrimary: "text-white", accentBadge: "bg-red-500/15 text-red-200 border-red-400/20", borderDashed: "border-blue-400/20", inputBorder: "border-blue-400/30 focus:border-blue-200 focus:ring-blue-400/20", inputText: "text-white" },
  "B6": { name: "JetBlue", color: "#00a3e0", from: "#001439", to: "#000a1d", borderHex: "rgba(0, 32, 91, 0.22)", textMuted: "text-blue-200/50", textPrimary: "text-white", accentBadge: "bg-cyan-500/15 text-cyan-200 border-cyan-400/20", borderDashed: "border-blue-400/20", inputBorder: "border-blue-400/30 focus:border-blue-200 focus:ring-blue-400/20", inputText: "text-white" },
  "WN": { name: "Southwest", color: "#ffc72c", from: "#07162c", to: "#030a14", borderHex: "rgba(15, 44, 89, 0.22)", textMuted: "text-blue-200/50", textPrimary: "text-white", accentBadge: "bg-yellow-400/15 text-yellow-200 border-yellow-400/20", borderDashed: "border-blue-400/20", inputBorder: "border-blue-400/30 focus:border-blue-200 focus:ring-blue-400/20", inputText: "text-white" },
  "AC": { name: "Air Canada", color: "#d31245", from: "#0d0d0d", to: "#030303", borderHex: "rgba(211, 18, 69, 0.18)", textMuted: "text-zinc-400", textPrimary: "text-white", accentBadge: "bg-red-600/15 text-red-200 border-red-600/25", borderDashed: "border-zinc-800", inputBorder: "border-zinc-800 focus:border-red-600 focus:ring-red-600/20", inputText: "text-white" },
  "VS": { name: "Virgin Atlantic", color: "#da291c", from: "#420b07", to: "#1f0503", borderHex: "rgba(218, 41, 28, 0.22)", textMuted: "text-red-200/50", textPrimary: "text-white", accentBadge: "bg-amber-400/15 text-amber-200 border-amber-400/20", borderDashed: "border-red-400/20", inputBorder: "border-red-400/30 focus:border-red-200 focus:ring-red-400/20", inputText: "text-white" },

  // Added GA & JT for Metallic Design reference
  "GA": { name: "Garuda Indonesia", color: "#008080", from: "#003030", to: "#001414", borderHex: "rgba(0, 128, 128, 0.25)", textMuted: "text-teal-200/50", textPrimary: "text-white", accentBadge: "bg-teal-400/15 text-teal-200 border-teal-400/20", borderDashed: "border-teal-400/20", inputBorder: "border-teal-400/30 focus:border-teal-200 focus:ring-teal-400/20", inputText: "text-white" },
  "JT": { name: "Lion Air", color: "#6b21a8", from: "#330b54", to: "#180329", borderHex: "rgba(107, 33, 168, 0.25)", textMuted: "text-purple-200/50", textPrimary: "text-white", accentBadge: "bg-purple-400/15 text-purple-200 border-purple-400/20", borderDashed: "border-purple-400/20", inputBorder: "border-purple-400/30 focus:border-purple-200 focus:ring-purple-400/20", inputText: "text-white" },
};

const getAirportSuggestions = (query) => {
  if (!query) return [];
  const q = query.trim().toUpperCase();
  const matches = [];
  
  for (const [iata, details] of Object.entries(AIRPORTS)) {
    if (iata.startsWith(q)) {
      matches.push({ iata, ...details });
    }
  }
  
  for (const [iata, details] of Object.entries(AIRPORTS)) {
    if (!iata.startsWith(q) && details.city && details.city.toUpperCase().includes(q)) {
      matches.push({ iata, ...details });
    }
  }
  
  return matches.slice(0, 5);
};

const getAirlineSuggestions = (query) => {
  if (!query) return [];
  const q = query.trim().toUpperCase();
  const matches = [];
  
  for (const [iata, name] of Object.entries(AIRLINES)) {
    if (iata.startsWith(q)) {
      matches.push({ iata, name });
    }
  }
  
  for (const [iata, name] of Object.entries(AIRLINES)) {
    if (!iata.startsWith(q) && name.toUpperCase().includes(q)) {
      matches.push({ iata, name });
    }
  }
  
  return matches.slice(0, 5);
};

export default function BoardingPassCard({ flight, compact = false, footerRight = null, isEditable = false, editMode = "all", onChange = () => {} }) {
  const {
    airline_iata, airline_name, flight_number,
    departure_airport_iata, arrival_airport_iata,
    departure_city_name, arrival_city_name,
    departure_time_utc, arrival_time_utc, flight_date,
    departure_time_local, arrival_time_local, time_confidence,
    seat_number, terminal_departure, terminal_arrival, gate, status_text,
    passenger_name, ticket_number, confidence, confidence_score, missing_fields,
    booking_reference, pnr, aircraft_type
  } = flight || {};

  let matchedBrand = AIRLINE_BRANDS[String(airline_iata).toUpperCase()];
  if (!matchedBrand && airline_name) {
    matchedBrand = Object.values(AIRLINE_BRANDS).find(b => 
      b.name.toLowerCase() === airline_name.toLowerCase() || 
      airline_name.toLowerCase().includes(b.name.toLowerCase())
    );
  }
  if (!matchedBrand && flight_number) {
    const prefix = String(flight_number).substring(0, 2).toUpperCase();
    if (AIRLINE_BRANDS[prefix]) {
      matchedBrand = AIRLINE_BRANDS[prefix];
    }
  }

  const brand = matchedBrand || {
    name: airline_name,
    color: "#38bdf8",
    bg: "bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl border border-white/20 text-white shadow-[0_8px_32px_0_rgba(31,38,135,0.37)]",
    textMuted: "text-white/50",
    textPrimary: "text-white",
    accentBadge: "bg-white/15 text-white border-white/20",
    borderDashed: "border-white/10",
    inputBorder: "border-white/20 focus:border-white focus:ring-1 focus:ring-white/10",
    inputText: "text-white placeholder:text-white/30",
  };

  const isAllEditable = isEditable && editMode === "all";

  const [showDepSuggestions, setShowDepSuggestions] = useState(false);
  const [showArrSuggestions, setShowArrSuggestions] = useState(false);
  const [showAirlineSuggestions, setShowAirlineSuggestions] = useState(false);

  const depRef = useRef(null);
  const arrRef = useRef(null);
  const airlineRef = useRef(null);

  const depSuggestions = getAirportSuggestions(departure_airport_iata);
  const arrSuggestions = getAirportSuggestions(arrival_airport_iata);
  const airlineSuggestions = getAirlineSuggestions(airline_iata);

  useEffect(() => {
    function handleClickOutside(event) {
      if (depRef.current && !depRef.current.contains(event.target)) {
        setShowDepSuggestions(false);
      }
      if (arrRef.current && !arrRef.current.contains(event.target)) {
        setShowArrSuggestions(false);
      }
      if (airlineRef.current && !airlineRef.current.contains(event.target)) {
        setShowAirlineSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const depTime = isEditable ? (departure_time_local || "") : fmtTime(departure_time_utc || departure_time_local, flight_date);
  const arrTime = isEditable ? (arrival_time_local || "") : fmtTime(arrival_time_utc || arrival_time_local, flight_date);
  const dateLabel = isEditable ? (flight_date || "") : fmtDate(departure_time_utc || flight_date);

  const needsReview = (missing_fields || []).length > 0 || time_confidence === "barcode_date_only" || time_confidence === "missing";
  const timeLabel = needsReview ? "Needs review" : time_confidence === "estimated" ? "Estimated" : "Upcoming";
  const routeTitle = `${cityLabel(departure_airport_iata, departure_city_name)} ${departure_airport_iata || ""} → ${cityLabel(arrival_airport_iata, arrival_city_name)} ${arrival_airport_iata || ""}`.trim();

  const handleFieldChange = (key, value) => {
    onChange({
      ...flight,
      [key]: value
    });
  };

  const durationMin = (() => {
    if (flight.duration_minutes) return flight.duration_minutes;
    if (departure_time_utc && arrival_time_utc) {
      try {
        const diff = (new Date(arrival_time_utc) - new Date(departure_time_utc)) / (1000 * 60);
        if (diff > 0) return diff;
      } catch {}
    }
    return null;
  })();

  const brandColor = brand.color || "#38bdf8";

  const containerStyle = {
    // Glassmorphic translucent dark backplate + brand color radial glow at top right + specular metallic sheen diagonal reflection
    background: `
      linear-gradient(105deg, transparent 40%, rgba(255, 255, 255, 0.05) 45%, rgba(255, 255, 255, 0.12) 50%, rgba(255, 255, 255, 0.05) 55%, transparent 60%),
      radial-gradient(circle at 80% 20%, ${brandColor}22, transparent 55%),
      linear-gradient(135deg, rgba(15, 22, 38, 0.85) 0%, rgba(6, 9, 15, 0.95) 100%)
    `,
    borderColor: brand.borderHex || `${brandColor}33`,
    boxShadow: `0 20px 40px -15px rgba(0, 0, 0, 0.5), 0 0 30px -5px ${brandColor}1c`,
    backdropFilter: "blur(20px)",
  };

  return (
    <div 
      className={`tl-flight-card border text-white shadow-xl relative ${isEditable ? "overflow-visible" : "overflow-hidden"} transition-all duration-500 rounded-[28px]`} 
      style={containerStyle}
      data-testid="boarding-pass-card"
    >
      {/* Flight header */}
      <div className="px-6 pt-5 pb-3.5 flex items-start justify-between gap-3 border-b border-dashed border-white/10 relative z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-white/95 p-1 rounded-xl shadow-sm flex items-center justify-center flex-shrink-0">
            <AirlineLogo iata={airline_iata || (flight_number ? flight_number.substring(0, 2) : "")} size={32} />
          </div>
          <div className="min-w-0">
            {isAllEditable ? (
              <div className="flex items-center gap-1.5 min-w-0 relative" ref={airlineRef}>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={2}
                    value={airline_iata || ""}
                    onChange={(e) => {
                      handleFieldChange("airline_iata", e.target.value.toUpperCase());
                      setShowAirlineSuggestions(true);
                    }}
                    onFocus={() => setShowAirlineSuggestions(true)}
                    placeholder="Airline"
                    className={`w-16 h-9 text-center text-xs font-bold bg-white/5 border rounded-lg ${brand.inputBorder} ${brand.inputText} focus:outline-none tracking-wider`}
                  />
                  {showAirlineSuggestions && airlineSuggestions.length > 0 && (
                    <div className="absolute left-0 top-full mt-1 w-52 bg-[#0f172a]/95 border border-white/20 backdrop-blur-xl rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto">
                      {airlineSuggestions.map((item) => (
                        <button
                          key={item.iata}
                          type="button"
                          onClick={() => {
                            handleFieldChange("airline_iata", item.iata);
                            handleFieldChange("airline_name", item.name);
                            setShowAirlineSuggestions(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-white/10 transition-colors cursor-pointer text-white flex items-center justify-between text-xs"
                        >
                          <span className="font-bold text-amber-500">{item.iata}</span>
                          <span className="text-white/60 text-[10px] truncate max-w-[120px]">{item.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  value={flight_number || ""}
                  onChange={(e) => handleFieldChange("flight_number", e.target.value.toUpperCase())}
                  placeholder="Flight #"
                  className={`w-24 h-9 px-2 text-xs font-bold bg-white/5 border rounded-lg ${brand.inputBorder} ${brand.inputText} focus:outline-none tracking-wider`}
                />
              </div>
            ) : (
              <>
                <p className="text-[13px] font-extrabold truncate tracking-tight uppercase leading-none">{airline_name || brand.name || "Airline"}</p>
                <p className={`text-[10px] ${brand.textMuted || "opacity-60"} truncate mt-1.5 font-bold leading-none`}>
                  {(airline_iata || (flight_number ? String(flight_number).substring(0,2) : "")).toUpperCase()}{flight_number || ""} · {aircraft_type || "Economy"}
                </p>
              </>
            )}
          </div>
        </div>
        <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-semibold tracking-wide uppercase ${needsReview ? "bg-amber-500/20 text-amber-300 border-amber-400/30" : brand.accentBadge}`}>
          {isEditable ? "Editing" : timeLabel}
        </span>
      </div>

      {/* Tear-line circular notches */}
      <div className="absolute left-0 right-0 pointer-events-none flex justify-between z-10" style={{ top: '69px' }}>
        <div className="w-3.5 h-7 rounded-r-full bg-background border border-l-0 border-white/10" />
        <div className="w-3.5 h-7 rounded-l-full bg-background border border-r-0 border-white/10" />
      </div>

      {/* Origin & Destination Airports */}
      <div className="px-6 pt-6 pb-5 flex items-center justify-between gap-3 relative z-10">
        <div className="flex-shrink-0 text-left min-w-[75px]" ref={depRef}>
          <p className="text-[9px] font-bold opacity-60 tracking-wider truncate max-w-[90px]">
            {cityLabel(departure_airport_iata, departure_city_name)}
          </p>
          {isAllEditable ? (
            <div className="relative mt-1.5">
              <input
                type="text"
                maxLength={3}
                value={departure_airport_iata || ""}
                onChange={(e) => {
                  handleFieldChange("departure_airport_iata", e.target.value.toUpperCase());
                  setShowDepSuggestions(true);
                }}
                onFocus={() => setShowDepSuggestions(true)}
                placeholder="FROM"
                className={`tl-mono w-24 h-11 text-center text-2xl font-extrabold bg-white/5 border rounded-xl ${brand.inputBorder} ${brand.inputText} focus:outline-none tracking-wider`}
              />
              {showDepSuggestions && depSuggestions.length > 0 && (
                <div className="absolute left-0 top-full mt-1 w-64 bg-[#0f172a]/95 border border-white/20 backdrop-blur-xl rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto">
                  {depSuggestions.map((item) => (
                    <button
                      key={item.iata}
                      type="button"
                      onClick={() => {
                        handleFieldChange("departure_airport_iata", item.iata);
                        handleFieldChange("departure_city_name", item.city);
                        setShowDepSuggestions(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-white/10 transition-colors cursor-pointer text-white flex items-center justify-between text-xs"
                    >
                      <span className="font-bold text-amber-500">{item.iata}</span>
                      <span className="text-white/60 text-[10px] truncate max-w-[150px]">{item.city}, {item.country}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-3xl font-black tracking-tight leading-none mt-1 text-white">{departure_airport_iata || "—"}</p>
          )}
          <p className="text-[10px] font-semibold opacity-85 mt-1">{depTime || "—"}</p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-2">
          <div className="flex items-center gap-1.5 w-full justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-white opacity-70 flex-shrink-0" />
            <div className="h-[1.5px] bg-white/20 flex-1 relative flex items-center justify-center">
              <Plane size={12} className="text-white transform rotate-90 absolute" />
            </div>
            <span className="w-1.5 h-1.5 rounded-full bg-white opacity-70 flex-shrink-0" />
          </div>
          {durationMin && (
            <span className="text-[9px] font-bold opacity-75 mt-1 bg-white/10 px-2 py-0.5 rounded-full">
              {formatDuration(durationMin)}
            </span>
          )}
        </div>

        <div className="text-right flex-shrink-0 min-w-[75px]" ref={arrRef}>
          <p className="text-[9px] font-bold opacity-60 tracking-wider truncate max-w-[90px] text-right">
            {cityLabel(arrival_airport_iata, arrival_city_name)}
          </p>
          {isAllEditable ? (
            <div className="relative mt-1.5 flex justify-end">
              <input
                type="text"
                maxLength={3}
                value={arrival_airport_iata || ""}
                onChange={(e) => {
                  handleFieldChange("arrival_airport_iata", e.target.value.toUpperCase());
                  setShowArrSuggestions(true);
                }}
                onFocus={() => setShowArrSuggestions(true)}
                placeholder="TO"
                className={`tl-mono w-24 h-11 text-center text-2xl font-extrabold bg-white/5 border rounded-xl ${brand.inputBorder} ${brand.inputText} focus:outline-none tracking-wider text-center`}
              />
              {showArrSuggestions && arrSuggestions.length > 0 && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-[#0f172a]/95 border border-white/20 backdrop-blur-xl rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto">
                  {arrSuggestions.map((item) => (
                    <button
                      key={item.iata}
                      type="button"
                      onClick={() => {
                        handleFieldChange("arrival_airport_iata", item.iata);
                        handleFieldChange("arrival_city_name", item.city);
                        setShowArrSuggestions(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-white/10 transition-colors cursor-pointer text-white flex items-center justify-between text-xs"
                    >
                      <span className="font-bold text-amber-500">{item.iata}</span>
                      <span className="text-white/60 text-[10px] truncate max-w-[150px]">{item.city}, {item.country}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-3xl font-black tracking-tight leading-none mt-1 text-white text-right">{arrival_airport_iata || "—"}</p>
          )}
          <p className="text-[10px] font-semibold opacity-85 mt-1 text-right">{arrTime || "—"}</p>
        </div>
      </div>

      {!compact && (
        <>
          {/* Passenger Details Grid */}
          <div className="px-6 py-5 border-t border-dashed border-white/10 relative z-10">
            <div className="grid grid-cols-3 gap-y-4 gap-x-2 text-left">
              <div>
                <p className="text-[9px] uppercase tracking-wider opacity-60 font-semibold">Passenger name</p>
                {isAllEditable ? (
                  <input
                    type="text"
                    value={passenger_name || ""}
                    onChange={(e) => handleFieldChange("passenger_name", e.target.value)}
                    placeholder="Passenger"
                    className={`font-semibold bg-white/5 border rounded-lg px-2 h-8 mt-1 focus:outline-none text-[11px] w-full ${brand.inputBorder}`}
                  />
                ) : (
                  <p className="text-xs font-bold text-white truncate mt-0.5">{passenger_name || "—"}</p>
                )}
              </div>
              
              <div>
                <p className="text-[9px] uppercase tracking-wider opacity-60 font-semibold">Flight type</p>
                {isAllEditable ? (
                  <input
                    type="text"
                    value={aircraft_type || ""}
                    onChange={(e) => handleFieldChange("aircraft_type", e.target.value)}
                    placeholder="Class"
                    className={`font-semibold bg-white/5 border rounded-lg px-2 h-8 mt-1 focus:outline-none text-[11px] w-full ${brand.inputBorder}`}
                  />
                ) : (
                  <p className="text-xs font-bold text-white mt-0.5">{aircraft_type || "Economy"}</p>
                )}
              </div>

              <div>
                <p className="text-[9px] uppercase tracking-wider opacity-60 font-semibold">Flight code</p>
                {isAllEditable ? (
                  <input
                    type="text"
                    value={flight_number || ""}
                    onChange={(e) => handleFieldChange("flight_number", e.target.value.toUpperCase())}
                    placeholder="Flight #"
                    className={`font-semibold bg-white/5 border rounded-lg px-2 h-8 mt-1 focus:outline-none text-[11px] w-full ${brand.inputBorder}`}
                  />
                ) : (
                  <p className="text-xs font-bold text-white mt-0.5">{(airline_iata || "").toUpperCase()}-{flight_number || ""}</p>
                )}
              </div>

              <div>
                <p className="text-[9px] uppercase tracking-wider opacity-60 font-semibold">Boarding</p>
                {isEditable ? (
                  <input
                    type="time"
                    value={depTime}
                    onChange={(e) => handleFieldChange("departure_time_local", e.target.value)}
                    className={`tl-mono font-semibold bg-white/5 border rounded-lg px-2 h-8 mt-1 focus:outline-none text-[11px] w-full ${brand.inputBorder}`}
                  />
                ) : (
                  <p className="text-xs font-bold text-white mt-0.5">{depTime || "—"}</p>
                )}
              </div>

              <div>
                <p className="text-[9px] uppercase tracking-wider opacity-60 font-semibold">Terminal / Gate</p>
                {isAllEditable ? (
                  <div className="flex gap-1 mt-1 items-center">
                    <input
                      type="text"
                      value={terminal_departure || ""}
                      onChange={(e) => handleFieldChange("terminal_departure", e.target.value.toUpperCase())}
                      placeholder="T"
                      className={`tl-mono font-semibold bg-white/5 border rounded-lg text-[10px] w-10 h-8 text-center focus:outline-none ${brand.inputBorder}`}
                    />
                    <span className="opacity-50">/</span>
                    <input
                      type="text"
                      value={gate || ""}
                      onChange={(e) => handleFieldChange("gate", e.target.value.toUpperCase())}
                      placeholder="G"
                      className={`tl-mono font-semibold bg-white/5 border rounded-lg text-[10px] w-14 h-8 text-center focus:outline-none ${brand.inputBorder}`}
                    />
                  </div>
                ) : (
                  <p className="text-xs font-bold text-white mt-0.5">
                    {[terminal_departure, gate].filter(Boolean).join(" / ") || "—"}
                  </p>
                )}
              </div>

              <div>
                <p className="text-[9px] uppercase tracking-wider opacity-60 font-semibold">Seat</p>
                {isAllEditable ? (
                  <input
                    type="text"
                    value={seat_number || ""}
                    onChange={(e) => handleFieldChange("seat_number", e.target.value.toUpperCase())}
                    placeholder="Seat"
                    className={`tl-mono font-semibold bg-white/5 border rounded-lg px-2 h-8 mt-1 focus:outline-none text-[11px] w-full ${brand.inputBorder}`}
                  />
                ) : (
                  <p className="text-xs font-bold text-white font-mono mt-0.5">{seat_number || "—"}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-5 pt-3 border-t border-white/5">
              <div>
                <p className="text-[9px] uppercase tracking-wider opacity-60 font-semibold">Date</p>
                {isEditable ? (
                  <input
                    type="date"
                    value={dateLabel}
                    onChange={(e) => handleFieldChange("flight_date", e.target.value)}
                    className={`text-[11px] font-semibold mt-1 bg-white/5 border rounded-lg px-2 h-8 focus:outline-none ${brand.inputBorder}`}
                  />
                ) : (
                  <p className="text-xs font-bold text-white mt-0.5">{dateLabel || "—"}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {(booking_reference || pnr) && (
                  <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white text-[9px] font-mono tracking-wider border border-white/10">
                    PNR {booking_reference || pnr}
                  </span>
                )}
                {footerRight}
              </div>
            </div>
          </div>

          {/* Barcode section */}
          <div className="px-6 pb-6 pt-2 relative z-10">
            <div 
              className="w-full rounded-2xl p-4 flex flex-col items-center justify-center gap-2 shadow-inner"
              style={{
                background: `linear-gradient(135deg, ${brandColor}c0, ${brandColor}75)`,
                boxShadow: `0 8px 24px -6px ${brandColor}44`,
                border: '1px solid rgba(255, 255, 255, 0.15)'
              }}
            >
              <div className="w-full h-12 flex gap-[1px] opacity-95">
                {[1,3,1,2,1,4,1,2,3,1,2,1,1,3,2,1,4,1,2,1,3,1,2,1,4,1,2,3,1,2,1,1,3,2,1,4,1,2,1,3,1,2,1,4,1,2,3,1,2,1,1,3,2,1,4,1,2,1,3,1,2,1,4,1,2,3,1,2,1,1,3,2,1,4].map((width, idx) => (
                  <div key={idx} className="bg-white h-full" style={{ flexGrow: width }} />
                ))}
              </div>
              <p className="text-[9px] font-mono tracking-[0.4em] text-white/95 font-bold uppercase mt-1">
                {booking_reference || pnr || "37485906345617"}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
