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
  "6E": { name: "IndiGo", bg: "bg-gradient-to-br from-blue-900 via-blue-950 to-slate-950 border-blue-900/40 text-white shadow-blue-900/20", textMuted: "text-blue-200/60" },
  "AI": { name: "Air India", bg: "bg-gradient-to-br from-red-600 via-red-800 to-red-950 border-red-600/40 text-white shadow-red-900/20", textMuted: "text-red-200/60" },
  "IX": { name: "Air India Express", bg: "bg-gradient-to-br from-orange-500 via-orange-700 to-orange-950 border-orange-500/40 text-white shadow-orange-900/20", textMuted: "text-orange-200/60" },
  "I5": { name: "Air India Express", bg: "bg-gradient-to-br from-orange-500 via-orange-700 to-orange-950 border-orange-500/40 text-white shadow-orange-900/20", textMuted: "text-orange-200/60" },
  "QP": { name: "Akasa Air", bg: "bg-gradient-to-br from-orange-500 via-orange-700 to-fuchsia-950 border-orange-500/40 text-white shadow-orange-900/20", textMuted: "text-orange-200/60" },
  "SG": { name: "SpiceJet", bg: "bg-gradient-to-br from-orange-500 via-red-700 to-red-950 border-orange-500/40 text-white shadow-orange-900/20", textMuted: "text-orange-200/60" },
  "UK": { name: "Vistara", bg: "bg-gradient-to-br from-fuchsia-900 via-fuchsia-950 to-slate-950 border-fuchsia-900/40 text-white shadow-fuchsia-900/20", textMuted: "text-fuchsia-200/60" },
  
  // Middle East
  "EK": { name: "Emirates", bg: "bg-gradient-to-br from-rose-700 via-rose-900 to-slate-950 border-rose-700/40 text-white shadow-rose-900/20", textMuted: "text-rose-200/60" },
  "QR": { name: "Qatar Airways", bg: "bg-gradient-to-br from-rose-800 via-rose-950 to-slate-950 border-rose-800/40 text-white shadow-rose-900/20", textMuted: "text-rose-200/60" },
  "EY": { name: "Etihad Airways", bg: "bg-gradient-to-br from-amber-900 via-stone-900 to-stone-950 border-amber-900/40 text-white shadow-amber-900/20", textMuted: "text-amber-200/60" },
  
  // Asia
  "SQ": { name: "Singapore Airlines", bg: "bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 border-slate-800/40 text-white shadow-slate-900/20", textMuted: "text-slate-300/60" },
  "AK": { name: "AirAsia", bg: "bg-gradient-to-br from-red-600 via-red-800 to-red-950 border-red-600/40 text-white shadow-red-900/20", textMuted: "text-red-200/60" },
  
  // Europe
  "LH": { name: "Lufthansa", bg: "bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 border-slate-800/40 text-white shadow-slate-900/20", textMuted: "text-slate-300/60" },
  "BA": { name: "British Airways", bg: "bg-gradient-to-br from-blue-800 via-blue-950 to-slate-950 border-blue-800/40 text-white shadow-blue-900/20", textMuted: "text-blue-200/60" },
  
  // US
  "AA": { name: "American Airlines", bg: "bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 border-slate-800/40 text-white shadow-slate-900/20", textMuted: "text-slate-300/60" },
  "DL": { name: "Delta Air Lines", bg: "bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 border-slate-800/40 text-white shadow-slate-900/20", textMuted: "text-slate-300/60" },
  "UA": { name: "United Airlines", bg: "bg-gradient-to-br from-blue-900 via-slate-900 to-slate-950 border-blue-900/40 text-white shadow-blue-900/20", textMuted: "text-blue-200/60" },
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

  return (
    <div 
      className={`tl-flight-card ${brand.bg} shadow-xl border relative ${isEditable ? "overflow-visible" : "overflow-hidden"} transition-all duration-500 rounded-[28px]`} 
      data-testid="boarding-pass-card"
    >
      {/* Flight header */}
      <div className={`px-6 pt-5 pb-3 flex items-start justify-between gap-3 border-b border-dashed ${brand.borderDashed || "border-white/10"}`}>
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
              <p className="text-[13px] font-bold truncate tracking-tight">{airline_name || brand.name || "Airline"} {flight_number || ""}</p>
            )}
            <p className={`text-[11px] ${brand.textMuted} truncate mt-1`}>{routeTitle || "Draft Flight"}</p>
          </div>
        </div>
        <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-medium tracking-wide uppercase ${needsReview ? "bg-amber-500/20 text-amber-300 border-amber-400/30" : brand.accentBadge}`}>
          {isEditable ? "Editing" : timeLabel}
        </span>
      </div>

      {/* Origin & Destination Airports */}
      <div className="px-6 pt-5 pb-4 flex items-end justify-between gap-3">
        <div className="flex-shrink-0 relative" ref={depRef}>
          <p className={`text-[10px] uppercase tracking-[0.16em] font-semibold ${brand.textMuted}`}>Leaving</p>
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
          <p className={`text-[11px] ${brand.textMuted} mt-1.5 truncate max-w-[120px]`}>{cityLabel(departure_airport_iata, departure_city_name)}</p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-2">
          <svg viewBox="0 0 100 24" className={`w-full h-5 ${brand.textMuted}`} aria-hidden="true">
            <path d="M2 18 Q 50 -6 98 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
            <circle cx="2" cy="18" r="2" fill="currentColor" />
            <circle cx="98" cy="18" r="2" fill="currentColor" />
          </svg>
          <Plane size={14} className={`${brand.textPrimary} -mt-1`} />
        </div>

        <div className="text-right flex-shrink-0 relative" ref={arrRef}>
          <p className={`text-[10px] uppercase tracking-[0.16em] font-semibold ${brand.textMuted}`}>Landing</p>
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
          <p className={`text-[11px] ${brand.textMuted} mt-1.5 truncate max-w-[120px] text-right`}>{cityLabel(arrival_airport_iata, arrival_city_name)}</p>
        </div>
      </div>

      {!compact && (
        <>
          {/* Time & Date Block */}
          <div className="px-6 py-4 flex justify-between text-xs items-center gap-4 bg-white/5 border-y border-dashed border-white/5">
            <div>
              <p className={`text-[10px] uppercase tracking-wider font-semibold ${brand.textMuted}`}>Takeoff</p>
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
              <p className={`text-[10px] uppercase tracking-wider font-semibold ${brand.textMuted}`}>Date</p>
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
              <p className={`text-[10px] uppercase tracking-wider font-semibold ${brand.textMuted}`}>Landing</p>
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
          <div className="px-6 pb-5 pt-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-[11px]">
            <div className={`grid ${isAllEditable ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" : "grid-cols-2 lg:grid-cols-4 gap-3"} flex-1`}>
              <div>
                <p className={`uppercase tracking-wider text-[9px] font-semibold flex items-center gap-1 ${brand.textMuted}`}><UserRound size={10} /> Passenger</p>
                {isAllEditable ? (
                  <input
                    type="text"
                    value={passenger_name || ""}
                    onChange={(e) => handleFieldChange("passenger_name", e.target.value)}
                    placeholder="Passenger Name"
                    className={`font-semibold bg-white/5 border rounded-lg px-2 h-9 mt-1 focus:outline-none text-xs w-full ${brand.inputBorder} ${brand.inputText}`}
                  />
                ) : (
                  <p className="text-foreground font-bold text-xs truncate max-w-[95px] mt-0.5">{passenger_name || "—"}</p>
                )}
              </div>
              <div>
                <p className={`uppercase tracking-wider text-[9px] font-semibold ${brand.textMuted}`}>Seat</p>
                {isAllEditable ? (
                  <input
                    type="text"
                    value={seat_number || ""}
                    onChange={(e) => handleFieldChange("seat_number", e.target.value.toUpperCase())}
                    placeholder="Seat"
                    className={`tl-mono font-semibold bg-white/5 border rounded-lg px-2 h-9 mt-1 focus:outline-none text-xs w-full ${brand.inputBorder} ${brand.inputText}`}
                  />
                ) : (
                  <p className="tl-mono text-foreground font-bold text-xs mt-0.5">{seat_number || "—"}</p>
                )}
              </div>
              <div>
                <p className={`uppercase tracking-wider text-[9px] font-semibold flex items-center gap-1 ${brand.textMuted}`}><MapPin size={10} /> Terminal/Gate</p>
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
                  <p className="tl-mono text-foreground font-bold text-xs mt-0.5">
                    {[terminal_departure, gate].filter(Boolean).join(" / ") || "—"}
                  </p>
                )}
              </div>
              <div>
                <p className={`uppercase tracking-wider text-[9px] font-semibold flex items-center gap-1 ${brand.textMuted}`}><Plane size={10} /> Aircraft</p>
                {isAllEditable ? (
                  <input
                    type="text"
                    value={aircraft_type || ""}
                    onChange={(e) => handleFieldChange("aircraft_type", e.target.value)}
                    placeholder="Aircraft"
                    className={`font-semibold bg-white/5 border rounded-lg px-2 h-9 mt-1 focus:outline-none text-xs w-full ${brand.inputBorder} ${brand.inputText}`}
                  />
                ) : (
                  <p className="text-foreground font-bold text-xs truncate mt-0.5">{aircraft_type || "—"}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              {isAllEditable ? (
                <div className="flex flex-col gap-1 items-end">
                  <p className={`uppercase tracking-wider text-[9px] font-semibold ${brand.textMuted}`}>PNR</p>
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
        </>
      )}
    </div>
  );
}
