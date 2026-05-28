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

export const AIRLINE_BRANDS = {
  // India
  "AI": { name: "Air India", from: "#d42b1e", to: "#8f0a0e", borderHex: "rgba(212, 43, 30, 0.3)", textMuted: "text-red-200/50", textPrimary: "text-white", accentBadge: "bg-amber-400/15 text-amber-200 border-amber-400/20", borderDashed: "border-red-400/20", inputBorder: "border-red-400/30 focus:border-red-200 focus:ring-red-400/20", inputText: "text-white" },
  "6E": { name: "IndiGo", from: "#002f6c", to: "#001e44", borderHex: "rgba(0, 47, 108, 0.3)", textMuted: "text-blue-200/50", textPrimary: "text-white", accentBadge: "bg-cyan-400/15 text-cyan-200 border-cyan-400/20", borderDashed: "border-blue-400/20", inputBorder: "border-blue-400/30 focus:border-blue-200 focus:ring-blue-400/20", inputText: "text-white" },
  "UK": { name: "Vistara", from: "#4f265d", to: "#2d1236", borderHex: "rgba(79, 38, 93, 0.3)", textMuted: "text-fuchsia-200/50", textPrimary: "text-white", accentBadge: "bg-amber-400/15 text-amber-200 border-amber-400/20", borderDashed: "border-fuchsia-400/20", inputBorder: "border-fuchsia-400/30 focus:border-fuchsia-200 focus:ring-fuchsia-400/20", inputText: "text-white" },
  "SG": { name: "SpiceJet", from: "#d50000", to: "#990000", borderHex: "rgba(213, 0, 0, 0.3)", textMuted: "text-orange-200/50", textPrimary: "text-white", accentBadge: "bg-yellow-400/15 text-yellow-200 border-yellow-400/20", borderDashed: "border-orange-400/20", inputBorder: "border-orange-400/30 focus:border-orange-200 focus:ring-orange-400/20", inputText: "text-white" },
  "QP": { name: "Akasa Air", from: "#ff6600", to: "#b34700", borderHex: "rgba(255, 102, 0, 0.3)", textMuted: "text-orange-100/50", textPrimary: "text-white", accentBadge: "bg-purple-400/15 text-purple-200 border-purple-400/20", borderDashed: "border-orange-400/20", inputBorder: "border-orange-400/30 focus:border-orange-200 focus:ring-orange-400/20", inputText: "text-white" },
  "IX": { name: "Air India Express", from: "#e04e26", to: "#a63315", borderHex: "rgba(224, 78, 38, 0.3)", textMuted: "text-orange-200/50", textPrimary: "text-white", accentBadge: "bg-amber-400/15 text-amber-200 border-amber-400/20", borderDashed: "border-orange-400/20", inputBorder: "border-orange-400/30 focus:border-orange-200 focus:ring-orange-400/20", inputText: "text-white" },
  "I5": { name: "AirAsia India", from: "#e11b22", to: "#9d0e13", borderHex: "rgba(225, 27, 34, 0.3)", textMuted: "text-red-200/50", textPrimary: "text-white", accentBadge: "bg-white/15 text-white border-white/20", borderDashed: "border-red-400/20", inputBorder: "border-red-400/30 focus:border-red-200 focus:ring-red-400/20", inputText: "text-white" },
  "G8": { name: "Go First", from: "#0057b8", to: "#003572", borderHex: "rgba(0, 87, 184, 0.3)", textMuted: "text-blue-200/50", textPrimary: "text-white", accentBadge: "bg-teal-400/15 text-teal-200 border-teal-400/20", borderDashed: "border-blue-400/20", inputBorder: "border-blue-400/30 focus:border-blue-200 focus:ring-blue-400/20", inputText: "text-white" },

  // Middle East
  "EK": { name: "Emirates", from: "#d71920", to: "#910b10", borderHex: "rgba(215, 25, 32, 0.3)", textMuted: "text-red-200/50", textPrimary: "text-white", accentBadge: "bg-amber-400/15 text-amber-200 border-amber-400/20", borderDashed: "border-red-400/20", inputBorder: "border-red-400/30 focus:border-red-200 focus:ring-red-400/20", inputText: "text-white" },
  "EY": { name: "Etihad", from: "#1c1c1c", to: "#302e2a", borderHex: "rgba(197, 160, 89, 0.3)", textMuted: "text-amber-200/50", textPrimary: "text-white", accentBadge: "bg-amber-400/15 text-amber-200 border-amber-400/20", borderDashed: "border-amber-500/20", inputBorder: "border-amber-500/30 focus:border-amber-200 focus:ring-amber-400/20", inputText: "text-white" },
  "QR": { name: "Qatar Airways", from: "#5c0632", to: "#36021c", borderHex: "rgba(92, 6, 50, 0.3)", textMuted: "text-rose-200/50", textPrimary: "text-white", accentBadge: "bg-amber-400/15 text-amber-200 border-amber-400/20", borderDashed: "border-rose-400/20", inputBorder: "border-rose-400/30 focus:border-rose-200 focus:ring-rose-400/20", inputText: "text-white" },

  // Europe
  "BA": { name: "British Airways", from: "#0b2265", to: "#051133", borderHex: "rgba(11, 34, 101, 0.3)", textMuted: "text-blue-200/50", textPrimary: "text-white", accentBadge: "bg-red-400/15 text-red-200 border-red-400/20", borderDashed: "border-blue-400/20", inputBorder: "border-blue-400/30 focus:border-blue-200 focus:ring-blue-400/20", inputText: "text-white" },
  "LH": { name: "Lufthansa", from: "#05164d", to: "#020a26", borderHex: "rgba(5, 22, 77, 0.3)", textMuted: "text-blue-200/50", textPrimary: "text-white", accentBadge: "bg-amber-400/25 text-amber-200 border-amber-400/30", borderDashed: "border-blue-400/20", inputBorder: "border-blue-400/30 focus:border-blue-200 focus:ring-blue-400/20", inputText: "text-white" },
  "AF": { name: "Air France", from: "#002060", to: "#001030", borderHex: "rgba(0, 32, 96, 0.3)", textMuted: "text-blue-200/50", textPrimary: "text-white", accentBadge: "bg-red-500/15 text-red-200 border-red-400/20", borderDashed: "border-blue-400/20", inputBorder: "border-blue-400/30 focus:border-blue-200 focus:ring-blue-400/20", inputText: "text-white" },
  "KL": { name: "KLM", from: "#00a1de", to: "#00709b", borderHex: "rgba(0, 161, 222, 0.3)", textMuted: "text-sky-100/50", textPrimary: "text-white", accentBadge: "bg-blue-900/20 text-white border-blue-900/30", borderDashed: "border-sky-200/20", inputBorder: "border-sky-300/30 focus:border-white focus:ring-white/20", inputText: "text-white" },
  "LX": { name: "SWISS", from: "#e30613", to: "#9e040c", borderHex: "rgba(227, 6, 19, 0.3)", textMuted: "text-red-100/50", textPrimary: "text-white", accentBadge: "bg-white/15 text-white border-white/20", borderDashed: "border-red-400/20", inputBorder: "border-red-400/30 focus:border-red-200 focus:ring-red-400/20", inputText: "text-white" },
  "TK": { name: "Turkish Airlines", from: "#c8102e", to: "#8c0b20", borderHex: "rgba(200, 16, 46, 0.3)", textMuted: "text-red-200/50", textPrimary: "text-white", accentBadge: "bg-slate-700/35 text-slate-200 border-slate-600/30", borderDashed: "border-red-400/20", inputBorder: "border-red-400/30 focus:border-red-200 focus:ring-red-400/20", inputText: "text-white" },

  // Asia / Pacific
  "SQ": { name: "Singapore Airlines", from: "#00205b", to: "#001030", borderHex: "rgba(0, 32, 91, 0.3)", textMuted: "text-blue-200/50", textPrimary: "text-white", accentBadge: "bg-amber-400/15 text-amber-200 border-amber-400/20", borderDashed: "border-blue-400/20", inputBorder: "border-blue-400/30 focus:border-blue-200 focus:ring-blue-400/20", inputText: "text-white" },
  "CX": { name: "Cathay Pacific", from: "#006564", to: "#00403f", borderHex: "rgba(0, 101, 100, 0.3)", textMuted: "text-teal-200/50", textPrimary: "text-white", accentBadge: "bg-amber-200/15 text-amber-200 border-amber-200/20", borderDashed: "border-teal-400/20", inputBorder: "border-teal-400/30 focus:border-teal-200 focus:ring-teal-400/20", inputText: "text-white" },
  "TG": { name: "Thai Airways", from: "#4a154b", to: "#2e0d2f", borderHex: "rgba(74, 21, 75, 0.3)", textMuted: "text-purple-200/50", textPrimary: "text-white", accentBadge: "bg-amber-400/15 text-amber-200 border-amber-400/20", borderDashed: "border-purple-400/20", inputBorder: "border-purple-400/30 focus:border-purple-200 focus:ring-purple-400/20", inputText: "text-white" },
  "UL": { name: "SriLankan Airlines", from: "#005740", to: "#003325", borderHex: "rgba(0, 87, 64, 0.3)", textMuted: "text-teal-200/50", textPrimary: "text-white", accentBadge: "bg-amber-400/15 text-amber-200 border-amber-400/20", borderDashed: "border-teal-400/20", inputBorder: "border-teal-400/30 focus:border-teal-200 focus:ring-teal-400/20", inputText: "text-white" },
  "MH": { name: "Malaysia Airlines", from: "#002060", to: "#001030", borderHex: "rgba(0, 32, 96, 0.3)", textMuted: "text-blue-200/50", textPrimary: "text-white", accentBadge: "bg-red-500/15 text-red-200 border-red-400/20", borderDashed: "border-blue-400/20", inputBorder: "border-blue-400/30 focus:border-blue-200 focus:ring-blue-400/20", inputText: "text-white" },
  "JL": { name: "Japan Airlines", from: "#d90011", to: "#9c0006", borderHex: "rgba(217, 0, 17, 0.3)", textMuted: "text-red-200/50", textPrimary: "text-white", accentBadge: "bg-zinc-800/40 text-white border-zinc-700/30", borderDashed: "border-red-400/20", inputBorder: "border-red-400/30 focus:border-red-200 focus:ring-red-400/20", inputText: "text-white" },
  "NH": { name: "ANA", from: "#004494", to: "#002a63", borderHex: "rgba(0, 68, 148, 0.3)", textMuted: "text-blue-200/50", textPrimary: "text-white", accentBadge: "bg-sky-400/15 text-sky-200 border-sky-400/20", borderDashed: "border-blue-400/20", inputBorder: "border-blue-400/30 focus:border-blue-200 focus:ring-blue-400/20", inputText: "text-white" },
  "KE": { name: "Korean Air", from: "#0055a5", to: "#00386d", borderHex: "rgba(0, 85, 165, 0.3)", textMuted: "text-blue-100/50", textPrimary: "text-white", accentBadge: "bg-red-500/15 text-red-200 border-red-400/20", borderDashed: "border-blue-300/20", inputBorder: "border-blue-400/30 focus:border-blue-200 focus:ring-blue-400/20", inputText: "text-white" },
  "QF": { name: "Qantas", from: "#e01a22", to: "#9d0d12", borderHex: "rgba(224, 26, 34, 0.3)", textMuted: "text-red-200/50", textPrimary: "text-white", accentBadge: "bg-white/15 text-white border-white/20", borderDashed: "border-red-400/20", inputBorder: "border-red-400/30 focus:border-red-200 focus:ring-red-400/20", inputText: "text-white" },
  "AK": { name: "AirAsia", from: "#e11b22", to: "#9d0e13", borderHex: "rgba(225, 27, 34, 0.3)", textMuted: "text-red-200/50", textPrimary: "text-white", accentBadge: "bg-black/20 text-white border-white/10", borderDashed: "border-red-400/20", inputBorder: "border-red-400/30 focus:border-red-200 focus:ring-red-400/20", inputText: "text-white" },

  // Americas
  "UA": { name: "United", from: "#002244", to: "#001020", borderHex: "rgba(0, 34, 68, 0.3)", textMuted: "text-blue-200/50", textPrimary: "text-white", accentBadge: "bg-sky-500/15 text-sky-200 border-sky-400/20", borderDashed: "border-blue-400/20", inputBorder: "border-blue-400/30 focus:border-blue-200 focus:ring-blue-400/20", inputText: "text-white" },
  "AA": { name: "American", from: "#0078d2", to: "#005290", borderHex: "rgba(0, 120, 210, 0.3)", textMuted: "text-blue-100/50", textPrimary: "text-white", accentBadge: "bg-red-500/15 text-red-200 border-red-400/20", borderDashed: "border-blue-300/20", inputBorder: "border-blue-400/30 focus:border-blue-200 focus:ring-blue-400/20", inputText: "text-white" },
  "DL": { name: "Delta", from: "#003366", to: "#001f3f", borderHex: "rgba(0, 51, 102, 0.3)", textMuted: "text-blue-200/50", textPrimary: "text-white", accentBadge: "bg-red-500/15 text-red-200 border-red-400/20", borderDashed: "border-blue-400/20", inputBorder: "border-blue-400/30 focus:border-blue-200 focus:ring-blue-400/20", inputText: "text-white" },
  "B6": { name: "JetBlue", from: "#00205b", to: "#001439", borderHex: "rgba(0, 32, 91, 0.3)", textMuted: "text-blue-200/50", textPrimary: "text-white", accentBadge: "bg-cyan-500/15 text-cyan-200 border-cyan-400/20", borderDashed: "border-blue-400/20", inputBorder: "border-blue-400/30 focus:border-blue-200 focus:ring-blue-400/20", inputText: "text-white" },
  "WN": { name: "Southwest", from: "#0f2c59", to: "#07162c", borderHex: "rgba(15, 44, 89, 0.3)", textMuted: "text-blue-200/50", textPrimary: "text-white", accentBadge: "bg-yellow-400/15 text-yellow-200 border-yellow-400/20", borderDashed: "border-blue-400/20", inputBorder: "border-blue-400/30 focus:border-blue-200 focus:ring-blue-400/20", inputText: "text-white" },
  "AC": { name: "Air Canada", from: "#1c1c1c", to: "#080808", borderHex: "rgba(211, 18, 69, 0.2)", textMuted: "text-zinc-400", textPrimary: "text-white", accentBadge: "bg-red-600/15 text-red-200 border-red-600/25", borderDashed: "border-zinc-800", inputBorder: "border-zinc-800 focus:border-red-600 focus:ring-red-600/20", inputText: "text-white" },
  "VS": { name: "Virgin Atlantic", from: "#da291c", to: "#951a11", borderHex: "rgba(218, 41, 28, 0.3)", textMuted: "text-red-200/50", textPrimary: "text-white", accentBadge: "bg-amber-400/15 text-amber-200 border-amber-400/20", borderDashed: "border-red-400/20", inputBorder: "border-red-400/30 focus:border-red-200 focus:ring-red-400/20", inputText: "text-white" },
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

  const containerStyle = {
    background: brand.from && brand.to 
      ? `linear-gradient(135deg, ${brand.from}, ${brand.to})` 
      : undefined,
    borderColor: brand.borderHex || undefined,
    boxShadow: brand.from ? `0 12px 36px -12px ${brand.from}88` : undefined,
  };

  return (
    <div 
      className={`tl-flight-card ${!brand.from ? brand.bg : "border text-white"} shadow-xl relative ${isEditable ? "overflow-visible" : "overflow-hidden"} transition-all duration-500 rounded-[28px]`} 
      style={containerStyle}
      data-testid="boarding-pass-card"
    >
      {/* Flight header */}
      <div className={`px-6 pt-5 pb-3.5 flex items-start justify-between gap-3 border-b border-dashed ${brand.borderDashed || "border-white/10"}`}>
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
              <p className="text-[13px] font-extrabold truncate tracking-tight uppercase">{airline_name || brand.name || "Airline"} {flight_number || ""}</p>
            )}
            <p className={`text-[11px] ${brand.textMuted} truncate mt-1 font-medium`}>{routeTitle || "Draft Flight"}</p>
          </div>
        </div>
        <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-semibold tracking-wide uppercase ${needsReview ? "bg-amber-500/20 text-amber-300 border-amber-400/30" : brand.accentBadge}`}>
          {isEditable ? "Editing" : timeLabel}
        </span>
      </div>

      {/* Tear-line circular notches */}
      <div className="absolute left-0 right-0 pointer-events-none flex justify-between z-10" style={{ top: '69px' }}>
        <div className="w-3.5 h-7 rounded-r-full bg-[#0b0f19] border border-l-0 border-white/10" />
        <div className="w-3.5 h-7 rounded-l-full bg-[#0b0f19] border border-r-0 border-white/10" />
      </div>

      {/* Origin & Destination Airports */}
      <div className="px-6 pt-6 pb-5 flex items-end justify-between gap-3">
        <div className="flex-shrink-0 relative" ref={depRef}>
          <p className={`text-[9px] uppercase tracking-[0.2em] font-extrabold ${brand.textMuted}`}>Departure</p>
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
            <p className="tl-mono text-3xl font-extrabold tracking-tight leading-none mt-1.5">{departure_airport_iata || "—"}</p>
          )}
          <p className={`text-[11px] ${brand.textMuted} mt-1.5 truncate max-w-[120px] font-semibold`}>{cityLabel(departure_airport_iata, departure_city_name)}</p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-2">
          <svg viewBox="0 0 100 24" className={`w-full h-5 ${brand.textMuted}`} aria-hidden="true">
            <path d="M2 18 Q 50 -6 98 18" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
            <circle cx="2" cy="18" r="2.5" fill="currentColor" />
            <circle cx="98" cy="18" r="2.5" fill="currentColor" />
          </svg>
          <Plane size={15} className={`${brand.textPrimary} -mt-1 transform rotate-90`} />
        </div>

        <div className="text-right flex-shrink-0 relative" ref={arrRef}>
          <p className={`text-[9px] uppercase tracking-[0.2em] font-extrabold ${brand.textMuted}`}>Arrival</p>
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
            <p className="tl-mono text-3xl font-extrabold tracking-tight leading-none mt-1.5 text-right">{arrival_airport_iata || "—"}</p>
          )}
          <p className={`text-[11px] ${brand.textMuted} mt-1.5 truncate max-w-[120px] text-right font-semibold`}>{cityLabel(arrival_airport_iata, arrival_city_name)}</p>
        </div>
      </div>

      {!compact && (
        <>
          {/* Time & Date Block */}
          <div className="px-6 py-4.5 flex justify-between text-xs items-center gap-4 bg-white/5 border-y border-dashed border-white/5">
            <div>
              <p className={`text-[9px] uppercase tracking-wider font-extrabold ${brand.textMuted}`}>Boarding</p>
              {isEditable ? (
                <input
                  type="time"
                  value={depTime}
                  onChange={(e) => handleFieldChange("departure_time_local", e.target.value)}
                  className={`tl-mono text-xs font-semibold mt-1 bg-white/5 border rounded-lg px-2 h-9 ${brand.inputBorder} ${brand.inputText} focus:outline-none`}
                />
              ) : (
                <p className="tl-mono text-[13px] font-bold mt-1 text-left">{depTime || "—"}</p>
              )}
            </div>
            <div className="text-center">
              <p className={`text-[9px] uppercase tracking-wider font-extrabold ${brand.textMuted}`}>Date</p>
              {isEditable ? (
                <input
                  type="date"
                  value={dateLabel}
                  onChange={(e) => handleFieldChange("flight_date", e.target.value)}
                  className={`text-xs font-semibold mt-1 bg-white/5 border rounded-lg px-2 h-9 ${brand.inputBorder} ${brand.inputText} focus:outline-none text-center`}
                />
              ) : (
                <p className="text-[13px] font-bold mt-1 text-center">{dateLabel || "Select date"}</p>
              )}
            </div>
            <div className="text-right">
              <p className={`text-[9px] uppercase tracking-wider font-extrabold ${brand.textMuted}`}>Landing</p>
              {isEditable ? (
                <input
                  type="time"
                  value={arrTime}
                  onChange={(e) => handleFieldChange("arrival_time_local", e.target.value)}
                  className={`tl-mono text-xs font-semibold mt-1 bg-white/5 border rounded-lg px-2 h-9 ${brand.inputBorder} ${brand.inputText} focus:outline-none text-right`}
                />
              ) : (
                <p className="tl-mono text-[13px] font-bold mt-1 text-right">{arrTime || "—"}</p>
              )}
            </div>
          </div>

          {/* Passenger details footer inside card */}
          <div className="px-6 pb-4 pt-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-[11px] border-b border-dashed border-white/5">
            <div className={`grid ${isAllEditable ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" : "grid-cols-2 lg:grid-cols-4 gap-3"} flex-1`}>
              <div>
                <p className={`uppercase tracking-wider text-[8px] font-extrabold flex items-center gap-1 ${brand.textMuted}`}><UserRound size={10} /> Passenger</p>
                {isAllEditable ? (
                  <input
                    type="text"
                    value={passenger_name || ""}
                    onChange={(e) => handleFieldChange("passenger_name", e.target.value)}
                    placeholder="Passenger Name"
                    className={`font-semibold bg-white/5 border rounded-lg px-2 h-9 mt-1 focus:outline-none text-xs w-full ${brand.inputBorder} ${brand.inputText}`}
                  />
                ) : (
                  <p className="text-white font-extrabold text-xs truncate max-w-[95px] mt-0.5">{passenger_name || "—"}</p>
                )}
              </div>
              <div>
                <p className={`uppercase tracking-wider text-[8px] font-extrabold ${brand.textMuted}`}>Seat</p>
                {isAllEditable ? (
                  <input
                    type="text"
                    value={seat_number || ""}
                    onChange={(e) => handleFieldChange("seat_number", e.target.value.toUpperCase())}
                    placeholder="Seat"
                    className={`tl-mono font-semibold bg-white/5 border rounded-lg px-2 h-9 mt-1 focus:outline-none text-xs w-full ${brand.inputBorder} ${brand.inputText}`}
                  />
                ) : (
                  <p className="tl-mono text-white font-extrabold text-xs mt-0.5">{seat_number || "—"}</p>
                )}
              </div>
              <div>
                <p className={`uppercase tracking-wider text-[8px] font-extrabold flex items-center gap-1 ${brand.textMuted}`}><MapPin size={10} /> Gate</p>
                {isAllEditable ? (
                  <div className="flex gap-1 mt-1 items-center">
                    <input
                      type="text"
                      value={terminal_departure || ""}
                      onChange={(e) => handleFieldChange("terminal_departure", e.target.value.toUpperCase())}
                      placeholder="T"
                      className={`tl-mono font-semibold bg-white/5 border rounded-lg text-[10px] w-10 h-9 text-center focus:outline-none ${brand.inputBorder} ${brand.inputText}`}
                    />
                    <span className={brand.textMuted}>/</span>
                    <input
                      type="text"
                      value={gate || ""}
                      onChange={(e) => handleFieldChange("gate", e.target.value.toUpperCase())}
                      placeholder="G"
                      className={`tl-mono font-semibold bg-white/5 border rounded-lg text-[10px] w-14 h-9 text-center focus:outline-none ${brand.inputBorder} ${brand.inputText}`}
                    />
                  </div>
                ) : (
                  <p className="tl-mono text-white font-extrabold text-xs mt-0.5">
                    {[terminal_departure, gate].filter(Boolean).join(" / ") || "—"}
                  </p>
                )}
              </div>
              <div>
                <p className={`uppercase tracking-wider text-[8px] font-extrabold flex items-center gap-1 ${brand.textMuted}`}><Plane size={10} /> Aircraft</p>
                {isAllEditable ? (
                  <input
                    type="text"
                    value={aircraft_type || ""}
                    onChange={(e) => handleFieldChange("aircraft_type", e.target.value)}
                    placeholder="Aircraft"
                    className={`font-semibold bg-white/5 border rounded-lg px-2 h-9 mt-1 focus:outline-none text-xs w-full ${brand.inputBorder} ${brand.inputText}`}
                  />
                ) : (
                  <p className="text-white font-extrabold text-xs truncate mt-0.5">{aircraft_type || "—"}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              {isAllEditable ? (
                <div className="flex flex-col gap-1 items-end">
                  <p className={`uppercase tracking-wider text-[8px] font-extrabold ${brand.textMuted}`}>PNR</p>
                  <input
                    type="text"
                    value={booking_reference || pnr || ""}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      onChange({
                        ...flight,
                        booking_reference: val,
                        pnr: val
                      });
                    }}
                    placeholder="PNR"
                    className={`tl-mono font-semibold bg-white/5 border rounded-lg px-2 h-9 mt-1 text-center focus:outline-none text-xs w-20 ${brand.inputBorder} ${brand.inputText}`}
                  />
                </div>
              ) : (
                <>
                  {(booking_reference || pnr) && (
                    <span className="hidden px-2.5 py-0.5 rounded-full bg-white/10 text-white text-[9px] font-mono tracking-wider sm:inline-flex border border-white/10">
                      PNR {booking_reference || pnr}
                    </span>
                  )}
                  {footerRight}
                </>
              )}
            </div>
          </div>

          {/* Barcode section */}
          <div className="px-6 pb-6 pt-3 flex flex-col items-center justify-center">
            <div className="w-full h-8 flex gap-[1px] opacity-40 hover:opacity-60 transition-opacity">
              {[1,3,1,2,1,4,1,2,3,1,2,1,1,3,2,1,4,1,2,1,3,1,2,1,4,1,2,3,1,2,1,1,3,2,1,4,1,2,1,3,1,2,1,4,1,2,3,1,2,1,1,3,2,1,4,1,2,1,3,1,2,1,4,1,2,3,1,2,1,1,3,2,1,4].map((width, idx) => (
                <div key={idx} className="bg-white h-full" style={{ flexGrow: width }} />
              ))}
            </div>
            <p className="text-[8px] font-mono tracking-[0.4em] opacity-45 mt-1.5 uppercase">
              {booking_reference || pnr || "FLIGHT-TRACK-BOARDING-PASS"}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
