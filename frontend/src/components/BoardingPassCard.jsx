import React, { useState, useRef, useEffect } from "react";
import { Plane, MapPin, UserRound, CalendarDays } from "lucide-react";
import AirlineLogo from "@/components/AirlineLogo";
import { AIRPORTS, AIRLINES } from "@/data/airports";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parse } from "date-fns";

/**
 * Boarding-pass styled flight card — realistic white physical pass design.
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
  "AI": { name: "Air India", color: "#d42b1e" },
  "6E": { name: "IndiGo", color: "#00a1de" },
  "UK": { name: "Vistara", color: "#563c72" },
  "SG": { name: "SpiceJet", color: "#d50000" },
  "QP": { name: "Akasa Air", color: "#ff6600" },
  "IX": { name: "Air India Express", color: "#e04e26" },
  "I5": { name: "AirAsia India", color: "#e11b22" },
  "G8": { name: "Go First", color: "#0057b8" },
  // Middle East
  "EK": { name: "Emirates", color: "#d71920" },
  "EY": { name: "Etihad", color: "#bd8b2d" },
  "QR": { name: "Qatar Airways", color: "#5c0632" },
  // Europe
  "BA": { name: "British Airways", color: "#075aaa" },
  "LH": { name: "Lufthansa", color: "#05164d" },
  "AF": { name: "Air France", color: "#002157" },
  "KL": { name: "KLM", color: "#00a1de" },
  "LX": { name: "SWISS", color: "#e30613" },
  "TK": { name: "Turkish Airlines", color: "#c8102e" },
  // Asia / Pacific
  "SQ": { name: "Singapore Airlines", color: "#002d5e" },
  "CX": { name: "Cathay Pacific", color: "#006564" },
  "TG": { name: "Thai Airways", color: "#4a154b" },
  "UL": { name: "SriLankan Airlines", color: "#005740" },
  "MH": { name: "Malaysia Airlines", color: "#002060" },
  "JL": { name: "Japan Airlines", color: "#d90011" },
  "NH": { name: "ANA", color: "#003a7e" },
  "KE": { name: "Korean Air", color: "#0055a5" },
  "QF": { name: "Qantas", color: "#e01a22" },
  "AK": { name: "AirAsia", color: "#e11b22" },
  // Americas
  "UA": { name: "United", color: "#002244" },
  "AA": { name: "American", color: "#0078d2" },
  "DL": { name: "Delta", color: "#003366" },
  "B6": { name: "JetBlue", color: "#003a70" },
  "WN": { name: "Southwest", color: "#304cb2" },
  "AC": { name: "Air Canada", color: "#d31245" },
  "VS": { name: "Virgin Atlantic", color: "#da291c" },
  // Others
  "GA": { name: "Garuda Indonesia", color: "#007a6e" },
  "JT": { name: "Lion Air", color: "#e11b22" },
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

  const iataKey = String(airline_iata || (flight_number ? flight_number.substring(0, 2) : "")).toUpperCase();
  let matchedBrand = AIRLINE_BRANDS[iataKey];
  if (!matchedBrand && airline_name) {
    matchedBrand = Object.values(AIRLINE_BRANDS).find(b => 
      b.name.toLowerCase() === airline_name.toLowerCase() || 
      airline_name.toLowerCase().includes(b.name.toLowerCase())
    );
  }

  const brand = matchedBrand || { name: airline_name || "Airline", color: "#292d30" };
  const brandColor = brand.color || "#292d30";

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

  const handleFieldChange = (key, value) => {
    onChange({ ...flight, [key]: value });
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

  // Editable input styles (for light bg)
  const inputCls = "font-semibold bg-gray-100 border border-gray-300 rounded-md px-2 focus:outline-none focus:border-[var(--color-electric-blue)] focus:ring-1 focus:ring-[var(--color-electric-blue)] text-[var(--color-void-black)] text-[11px] h-7 w-full shadow-sm placeholder:text-gray-400";
  const suggestionDropdownCls = "absolute left-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto";
  const suggestionItemCls = "w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors cursor-pointer text-gray-900 flex items-center justify-between text-xs";

  return (
    <div 
      className={`rounded-2xl bg-white shadow-[0_4px_24px_rgba(0,0,0,0.10)] relative ${isEditable ? "overflow-visible" : "overflow-hidden"} transition-all duration-300`} 
      data-testid="boarding-pass-card"
    >
      {/* Airline Header Bar */}
      <div 
        className="px-5 py-3.5 flex items-center justify-between gap-3 rounded-t-2xl"
        style={{ background: brandColor }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-white p-1 rounded-lg shadow-sm flex items-center justify-center flex-shrink-0">
            <AirlineLogo iata={iataKey} size={28} rounded="rounded-md" />
          </div>
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
                  placeholder="AL"
                  className="w-14 h-8 text-center text-xs font-bold bg-white/90 border-0 rounded-md text-gray-900 focus:outline-none tracking-wider"
                />
                {showAirlineSuggestions && airlineSuggestions.length > 0 && (
                  <div className={suggestionDropdownCls}>
                    {airlineSuggestions.map((item) => (
                      <button
                        key={item.iata}
                        type="button"
                        onClick={() => {
                          handleFieldChange("airline_iata", item.iata);
                          handleFieldChange("airline_name", item.name);
                          setShowAirlineSuggestions(false);
                        }}
                        className={suggestionItemCls}
                      >
                        <span className="font-bold text-blue-600">{item.iata}</span>
                        <span className="text-gray-500 text-[10px] truncate max-w-[120px]">{item.name}</span>
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
                className="w-24 h-8 px-2 text-xs font-bold bg-white/90 border-0 rounded-md text-gray-900 focus:outline-none tracking-wider"
              />
            </div>
          ) : (
            <div className="min-w-0">
              <p className="text-[13px] font-bold truncate text-white leading-none tracking-tight">{airline_name || brand.name}</p>
              <p className="text-[10px] text-white/70 truncate mt-1 font-medium leading-none">
                {iataKey}{flight_number || ""} · {aircraft_type || "Economy"}
              </p>
            </div>
          )}
        </div>
        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wide uppercase ${
          needsReview 
            ? "bg-amber-500/80 text-white" 
            : isEditable 
              ? "bg-white/20 text-white" 
              : "bg-white/20 text-white"
        }`}>
          {isEditable ? "Editing" : timeLabel}
        </span>
      </div>

      {/* Tear-line circular notches */}
      <div className="absolute left-0 right-0 pointer-events-none flex justify-between z-10" style={{ top: '130px' }}>
        <div className="w-4 h-8 rounded-r-full bg-[hsl(var(--background))]" style={{ marginLeft: '-1px' }} />
        <div className="w-4 h-8 rounded-l-full bg-[hsl(var(--background))]" style={{ marginRight: '-1px' }} />
      </div>

      {/* Route Section — white bg, dark text */}
      <div className="px-5 pt-6 pb-5 flex items-center justify-between gap-3 bg-white relative z-0">
        {/* Departure */}
        <div className="flex-shrink-0 text-left min-w-[80px]" ref={depRef}>
          <p className="text-[9px] font-semibold text-gray-400 tracking-wider uppercase truncate max-w-[100px]">
            {cityLabel(departure_airport_iata, departure_city_name)}
          </p>
          {isAllEditable ? (
            <div className="relative mt-1">
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
                className={`tl-mono w-20 h-10 text-center text-xl font-extrabold ${inputCls} tracking-wider`}
              />
              {showDepSuggestions && depSuggestions.length > 0 && (
                <div className={suggestionDropdownCls} style={{ width: '16rem' }}>
                  {depSuggestions.map((item) => (
                    <button
                      key={item.iata}
                      type="button"
                      onClick={() => {
                        handleFieldChange("departure_airport_iata", item.iata);
                        handleFieldChange("departure_city_name", item.city);
                        setShowDepSuggestions(false);
                      }}
                      className={suggestionItemCls}
                    >
                      <span className="font-bold text-blue-600">{item.iata}</span>
                      <span className="text-gray-500 text-[10px] truncate max-w-[150px]">{item.city}, {item.country}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-[28px] font-black tracking-tight leading-none mt-1 text-gray-900">{departure_airport_iata || "—"}</p>
          )}
          <p className="text-[10px] font-semibold text-gray-500 mt-1">{depTime || "—"}</p>
        </div>

        {/* Route line */}
        <div className="flex-1 flex flex-col items-center justify-center px-2">
          <div className="flex items-center gap-1.5 w-full justify-center">
            <span className="w-2 h-2 rounded-full border-2 border-gray-300 flex-shrink-0" />
            <div className="h-[1px] border-t border-dashed border-gray-300 flex-1 relative flex items-center justify-center">
              <Plane size={14} className="text-gray-400 transform rotate-90 absolute bg-white px-0.5" />
            </div>
            <span className="w-2 h-2 rounded-full bg-gray-900 flex-shrink-0" />
          </div>
          {durationMin && (
            <span className="text-[9px] font-bold text-gray-400 mt-1.5 bg-gray-50 px-2 py-0.5 rounded-full">
              {formatDuration(durationMin)}
            </span>
          )}
        </div>

        {/* Arrival */}
        <div className="text-right flex-shrink-0 min-w-[80px]" ref={arrRef}>
          <p className="text-[9px] font-semibold text-gray-400 tracking-wider uppercase truncate max-w-[100px] text-right">
            {cityLabel(arrival_airport_iata, arrival_city_name)}
          </p>
          {isAllEditable ? (
            <div className="relative mt-1 flex justify-end">
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
                className={`tl-mono w-20 h-10 text-center text-xl font-extrabold ${inputCls} tracking-wider`}
              />
              {showArrSuggestions && arrSuggestions.length > 0 && (
                <div className={`${suggestionDropdownCls} !left-auto right-0`} style={{ width: '16rem' }}>
                  {arrSuggestions.map((item) => (
                    <button
                      key={item.iata}
                      type="button"
                      onClick={() => {
                        handleFieldChange("arrival_airport_iata", item.iata);
                        handleFieldChange("arrival_city_name", item.city);
                        setShowArrSuggestions(false);
                      }}
                      className={suggestionItemCls}
                    >
                      <span className="font-bold text-blue-600">{item.iata}</span>
                      <span className="text-gray-500 text-[10px] truncate max-w-[150px]">{item.city}, {item.country}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-[28px] font-black tracking-tight leading-none mt-1 text-gray-900 text-right">{arrival_airport_iata || "—"}</p>
          )}
          <p className="text-[10px] font-semibold text-gray-500 mt-1 text-right">{arrTime || "—"}</p>
        </div>
      </div>

      {!compact && (
        <>
          {/* Passenger Details Grid — white bg, dark text */}
          <div className="px-5 py-4 border-t border-dashed border-gray-200 bg-white relative z-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-3 text-left">
              <div>
                <p className="text-[8px] uppercase tracking-widest text-gray-400 font-semibold">Passenger</p>
                {isAllEditable ? (
                  <input
                    type="text"
                    value={passenger_name || ""}
                    onChange={(e) => handleFieldChange("passenger_name", e.target.value)}
                    placeholder="Name"
                    className={`${inputCls} h-7 mt-1 w-full`}
                  />
                ) : (
                  <p className="text-[11px] font-bold text-gray-900 truncate mt-0.5">{passenger_name || "—"}</p>
                )}
              </div>

              <div>
                <p className="text-[8px] uppercase tracking-widest text-gray-400 font-semibold">Class</p>
                {isAllEditable ? (
                  <input
                    type="text"
                    value={aircraft_type || ""}
                    onChange={(e) => handleFieldChange("aircraft_type", e.target.value)}
                    placeholder="Class"
                    className={`${inputCls} h-7 mt-1 w-full`}
                  />
                ) : (
                  <p className="text-[11px] font-bold text-gray-900 mt-0.5">{aircraft_type || "Economy"}</p>
                )}
              </div>

              <div>
                <p className="text-[8px] uppercase tracking-widest text-gray-400 font-semibold">Flight</p>
                {isAllEditable ? (
                  <input
                    type="text"
                    value={flight_number || ""}
                    onChange={(e) => handleFieldChange("flight_number", e.target.value.toUpperCase())}
                    placeholder="No."
                    className={`${inputCls} h-7 mt-1 w-full`}
                  />
                ) : (
                  <p className="text-[11px] font-bold text-gray-900 mt-0.5 tl-mono">{iataKey}-{flight_number || ""}</p>
                )}
              </div>

              <div>
                <p className="text-[8px] uppercase tracking-widest text-gray-400 font-semibold">Boarding</p>
                {isEditable ? (
                  <input
                    type="time"
                    value={depTime}
                    onChange={(e) => handleFieldChange("departure_time_local", e.target.value)}
                    className={`${inputCls} tl-mono mt-1`}
                  />
                ) : (
                  <p className="text-[11px] font-bold text-gray-900 mt-0.5">{depTime || "—"}</p>
                )}
              </div>

              <div>
                <p className="text-[8px] uppercase tracking-widest text-gray-400 font-semibold">Terminal / Gate</p>
                {isAllEditable ? (
                  <div className="flex gap-1 mt-1 items-center">
                    <input
                      type="text"
                      value={terminal_departure || ""}
                      onChange={(e) => handleFieldChange("terminal_departure", e.target.value.toUpperCase())}
                      placeholder="T"
                      className={`${inputCls} tl-mono w-8 h-7 text-center`}
                    />
                    <span className="text-gray-300">/</span>
                    <input
                      type="text"
                      value={gate || ""}
                      onChange={(e) => handleFieldChange("gate", e.target.value.toUpperCase())}
                      placeholder="G"
                      className={`${inputCls} tl-mono w-12 h-7 text-center`}
                    />
                  </div>
                ) : (
                  <p className="text-[11px] font-bold text-gray-900 mt-0.5">
                    {[terminal_departure, gate].filter(Boolean).join(" / ") || "—"}
                  </p>
                )}
              </div>

              <div>
                <p className="text-[8px] uppercase tracking-widest text-gray-400 font-semibold">Seat</p>
                {isAllEditable ? (
                  <input
                    type="text"
                    value={seat_number || ""}
                    onChange={(e) => handleFieldChange("seat_number", e.target.value.toUpperCase())}
                    placeholder="Seat"
                    className={`${inputCls} tl-mono h-7 mt-1 w-full`}
                  />
                ) : (
                  <p className="text-[11px] font-bold text-gray-900 tl-mono mt-0.5">{seat_number || "—"}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
              <div>
                <p className="text-[8px] uppercase tracking-widest text-gray-400 font-semibold">Date</p>
                {isEditable ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className={`${inputCls} mt-1 flex items-center justify-between px-2 text-left w-full max-w-[140px]`}>
                        <span className={dateLabel ? "text-gray-900 font-semibold truncate" : "text-gray-400"}>
                          {dateLabel ? format(parse(dateLabel, "yyyy-MM-dd", new Date()), "PP") : "Date..."}
                        </span>
                        <CalendarDays size={12} className="text-gray-500 ml-1 flex-shrink-0" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateLabel ? parse(dateLabel, "yyyy-MM-dd", new Date()) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            handleFieldChange("flight_date", format(date, "yyyy-MM-dd"));
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                ) : (
                  <p className="text-[11px] font-bold text-gray-900 mt-0.5">{dateLabel || "—"}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {(booking_reference || pnr) && (
                  <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[9px] font-mono tracking-wider border border-gray-200">
                    PNR {booking_reference || pnr}
                  </span>
                )}
                {footerRight}
              </div>
            </div>
          </div>

          {/* Barcode section — black on white */}
          <div className="px-5 pb-5 pt-2 bg-white rounded-b-2xl">
            <div className="w-full rounded-xl bg-gray-50 border border-gray-100 p-3 flex flex-col items-center justify-center gap-1.5">
              <div className="w-full h-10 flex gap-[1px]">
                {[1,3,1,2,1,4,1,2,3,1,2,1,1,3,2,1,4,1,2,1,3,1,2,1,4,1,2,3,1,2,1,1,3,2,1,4,1,2,1,3,1,2,1,4,1,2,3,1,2,1,1,3,2,1,4,1,2,1,3,1,2,1,4,1,2,3,1,2,1,1,3,2,1,4].map((width, idx) => (
                  <div key={idx} className="bg-gray-900 h-full" style={{ flexGrow: width }} />
                ))}
              </div>
              <p className="text-[8px] font-mono tracking-[0.35em] text-gray-400 font-medium uppercase">
                {booking_reference || pnr || "37485906345617"}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
