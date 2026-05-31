import React from "react";
import { Plane } from "lucide-react";
import AirlineLogo from "@/components/AirlineLogo";
import { AIRPORTS, AIRLINES } from "@/data/airports";
import { format, parse } from "date-fns";

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

export default function BoardingPassCard({ flight, compact = false, footerRight = null }) {
  const {
    airline_iata, airline_name, flight_number,
    departure_airport_iata, arrival_airport_iata,
    departure_city_name, arrival_city_name,
    departure_time_utc, arrival_time_utc, flight_date,
    departure_time_local, arrival_time_local, time_confidence,
    seat_number, terminal_departure, terminal_arrival, gate,
    passenger_name, ticket_number, missing_fields,
    booking_reference, pnr, aircraft_type
  } = flight || {};

  const iataKey = String(airline_iata || (flight_number ? flight_number.substring(0, 2) : "")).toUpperCase();

  const depTime = fmtTime(departure_time_utc || departure_time_local, flight_date);
  const arrTime = fmtTime(arrival_time_utc || arrival_time_local, flight_date);
  const dateLabel = fmtDate(departure_time_utc || flight_date);

  const needsReview = (missing_fields || []).length > 0 || time_confidence === "barcode_date_only" || time_confidence === "missing";
  const timeLabel = needsReview ? "Needs review" : time_confidence === "estimated" ? "Estimated" : "Confirmed";

  const durationMin = (() => {
    if (flight?.duration_minutes) return flight.duration_minutes;
    if (departure_time_utc && arrival_time_utc) {
      try {
        const diff = (new Date(arrival_time_utc) - new Date(departure_time_utc)) / (1000 * 60);
        if (diff > 0) return diff;
      } catch {}
    }
    return null;
  })();

  return (
    <div 
      className="rounded-[24px] premium-card mesh-bg overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:glow-intense-primary group relative"
      data-testid="boarding-pass-card"
    >
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

      {/* Header Bar */}
      <div className="px-6 py-5 flex items-center justify-between gap-4 border-b border-white/5 relative z-10">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1.5 rounded-xl shadow-lg flex items-center justify-center flex-shrink-0">
            <AirlineLogo iata={iataKey} size={28} rounded="rounded-lg" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white/90 font-sans tracking-wide uppercase">
              {airline_name || "Airline"}
            </p>
            <p className="text-[11px] text-white/50 mt-0.5 font-mono tracking-widest uppercase">
              {iataKey}{flight_number || ""}
            </p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border ${
          needsReview 
            ? "border-amber-500/30 text-amber-500 bg-amber-500/10 glow-amber" 
            : "border-accent/30 text-accent bg-accent/10 glow-emerald"
        }`}>
          {timeLabel}
        </div>
      </div>

      {/* Tear-line circular notches */}
      <div className="absolute left-0 right-0 pointer-events-none flex justify-between z-20" style={{ top: '80px' }}>
        <div className="w-5 h-8 rounded-r-full bg-[#020401] border-r border-white/5 shadow-inner" style={{ marginLeft: '-1px' }} />
        <div className="w-5 h-8 rounded-l-full bg-[#020401] border-l border-white/5 shadow-inner" style={{ marginRight: '-1px' }} />
      </div>

      {/* Main Route Section */}
      <div className="px-6 pt-8 pb-6 flex flex-col gap-6 relative z-10">
        <div className="flex items-center justify-between">
          {/* Departure */}
          <div className="flex-1 text-left">
            <p className="text-[42px] font-display text-white leading-none tracking-tight">
              {departure_airport_iata || "—"}
            </p>
            <p className="text-xs text-white/50 uppercase tracking-widest mt-2 font-semibold">
              {cityLabel(departure_airport_iata, departure_city_name)}
            </p>
            <p className="text-lg text-primary font-mono mt-1 glow-primary">
              {depTime || "--:--"}
            </p>
          </div>

          {/* Flight Path Indicator */}
          <div className="flex-shrink-0 flex flex-col items-center justify-center px-4 w-32 relative">
            <div className="w-full flex items-center gap-2">
              <div className="w-2 h-2 rounded-full border-2 border-white/20" />
              <div className="flex-1 h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent relative overflow-hidden">
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-[scanSweep_2s_ease-in-out_infinite]" />
              </div>
              <div className="w-2 h-2 rounded-full border-2 border-primary glow-primary" />
            </div>
            <Plane size={24} className="text-white/30 transform rotate-90 absolute group-hover:text-primary transition-colors duration-500" />
            {durationMin && (
              <span className="text-[10px] text-white/40 mt-3 font-mono tracking-widest uppercase bg-white/5 px-2 py-0.5 rounded-full backdrop-blur-md">
                {formatDuration(durationMin)}
              </span>
            )}
          </div>

          {/* Arrival */}
          <div className="flex-1 text-right">
            <p className="text-[42px] font-display text-white leading-none tracking-tight">
              {arrival_airport_iata || "—"}
            </p>
            <p className="text-xs text-white/50 uppercase tracking-widest mt-2 font-semibold">
              {cityLabel(arrival_airport_iata, arrival_city_name)}
            </p>
            <p className="text-lg text-accent font-mono mt-1 glow-emerald">
              {arrTime || "--:--"}
            </p>
          </div>
        </div>
      </div>

      {!compact && (
        <>
          {/* Passenger Details Grid */}
          <div className="px-6 py-5 border-t border-white/5 bg-white/5 backdrop-blur-sm relative z-10">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-6 gap-x-4 text-left">
              <div className="col-span-2">
                <p className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-semibold mb-1">Passenger</p>
                <p className="text-sm font-semibold text-white/90 truncate">{passenger_name || "—"}</p>
              </div>

              <div>
                <p className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-semibold mb-1">Date</p>
                <p className="text-sm font-semibold text-white/90 truncate">{dateLabel || "—"}</p>
              </div>

              <div>
                <p className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-semibold mb-1">Class</p>
                <p className="text-sm font-semibold text-white/90">{aircraft_type || "Economy"}</p>
              </div>

              <div>
                <p className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-semibold mb-1">Terminal</p>
                <p className="text-sm font-mono text-white/90">{terminal_departure || "—"}</p>
              </div>

              <div>
                <p className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-semibold mb-1">Gate</p>
                <p className="text-sm font-mono text-white/90">{gate || "—"}</p>
              </div>

              <div>
                <p className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-semibold mb-1">Seat</p>
                <p className="text-sm font-mono text-white/90 text-primary">{seat_number || "—"}</p>
              </div>

              <div>
                <p className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-semibold mb-1">PNR</p>
                <p className="text-sm font-mono text-white/90">{booking_reference || pnr || "—"}</p>
              </div>
            </div>
            
            {footerRight && (
              <div className="mt-4 pt-4 border-t border-white/5 flex justify-end">
                {footerRight}
              </div>
            )}
          </div>

          {/* Barcode section */}
          <div className="px-6 py-4 bg-white/5 backdrop-blur-md relative z-10 border-t border-white/5">
            <div className="w-full h-12 flex gap-[2px] opacity-70 group-hover:opacity-100 transition-opacity">
              {[1,3,1,2,1,4,1,2,3,1,2,1,1,3,2,1,4,1,2,1,3,1,2,1,4,1,2,3,1,2,1,1,3,2,1,4,1,2,1,3,1,2,1,4,1,2,3,1,2,1,1,3,2,1,4,1,2,1,3,1,2,1,4,1,2,3,1,2,1,1,3,2,1,4].map((width, idx) => (
                <div key={idx} className="bg-white h-full" style={{ flexGrow: width }} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
