import React from "react";
import { Plane, MapPin, UserRound } from "lucide-react";
import AirlineLogo from "@/components/AirlineLogo";
import { AIRPORTS } from "@/data/airports";

/**
 * Boarding-pass styled flight card.
 * - Props: airline_iata, airline_name, flight_number, departure_airport_iata,
 *          arrival_airport_iata, departure_city_name, arrival_city_name,
 *          departure_time_utc, arrival_time_utc, seat_number,
 *          terminal_departure, terminal_arrival, status_text, flight_date.
 */
function fmtTime(value, date) {
  if (!value) return "--:--";
  if (String(value).match(/^\d{1,2}[:.]\d{2}/)) return String(value).replace(".", ":").slice(0, 5);
  try {
    const d = new Date(value);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch { return "--:--"; }
}
function fmtDate(value) {
  if (!value) return "Date needed";
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

export default function BoardingPassCard({ flight, compact = false, footerRight = null }) {
  const {
    airline_iata, airline_name, flight_number,
    departure_airport_iata, arrival_airport_iata,
    departure_city_name, arrival_city_name,
    departure_time_utc, arrival_time_utc, flight_date,
    departure_time_local, arrival_time_local, time_confidence,
    seat_number, terminal_departure, terminal_arrival, gate, status_text,
    passenger_name, ticket_number, confidence, confidence_score, missing_fields,
  } = flight || {};

  const depTime = fmtTime(departure_time_utc || departure_time_local, flight_date);
  const arrTime = fmtTime(arrival_time_utc || arrival_time_local, flight_date);
  const dateLabel = fmtDate(departure_time_utc || flight_date);
  const needsReview = (missing_fields || []).length > 0 || time_confidence === "barcode_date_only" || time_confidence === "missing";
  const timeLabel = needsReview ? "Needs review" : time_confidence === "estimated" ? "Estimated" : "Upcoming";
  const routeTitle = `${cityLabel(departure_airport_iata, departure_city_name)} ${departure_airport_iata || ""} -> ${cityLabel(arrival_airport_iata, arrival_city_name)} ${arrival_airport_iata || ""}`.trim();

  return (
    <div className="tl-flight-card tl-card-interactive overflow-hidden" data-testid="boarding-pass-card">
      <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <AirlineLogo iata={airline_iata} size={32} />
          <div className="min-w-0">
            <p className="text-[12px] font-semibold truncate">{airline_name || "Airline"} {flight_number || ""}</p>
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{routeTitle}</p>
          </div>
        </div>
        <span className={`tl-friendly-badge ${needsReview ? "is-warn" : "is-ok"}`}>{timeLabel}</span>
      </div>

      <div className="px-5 pt-4 pb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Leaving</p>
          <p className="tl-mono text-3xl font-bold tracking-tight leading-none mt-1">{departure_airport_iata || "—"}</p>
          <p className="text-xs text-muted-foreground mt-1 truncate max-w-[120px]">{cityLabel(departure_airport_iata, departure_city_name)}</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center">
          <svg viewBox="0 0 100 24" className="w-full h-5 text-primary/70" aria-hidden>
            <path d="M2 18 Q 50 -6 98 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 3" />
            <circle cx="2" cy="18" r="2" fill="currentColor" />
            <circle cx="98" cy="18" r="2" fill="currentColor" />
          </svg>
          <Plane size={14} className="text-primary -mt-1" />
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Landing</p>
          <p className="tl-mono text-3xl font-bold tracking-tight leading-none mt-1">{arrival_airport_iata || "—"}</p>
          <p className="text-xs text-muted-foreground mt-1 truncate max-w-[120px]">{cityLabel(arrival_airport_iata, arrival_city_name)}</p>
        </div>
      </div>

      {!compact && (
        <>
          <div className="px-5 flex justify-between text-xs">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Takeoff</p>
              <p className="tl-mono text-sm font-semibold mt-0.5">{depTime}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Date</p>
              <p className="text-sm font-semibold mt-0.5">{dateLabel}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Landing</p>
              <p className="tl-mono text-sm font-semibold mt-0.5">{arrTime}</p>
            </div>
          </div>
          <div className="tl-dashed-divider mt-4" />
          <div className="px-5 pb-4 pt-3 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
            <div className="grid grid-cols-3 gap-3 flex-1">
              <div>
                <p className="uppercase tracking-wider text-[9px] flex items-center gap-1"><UserRound size={10} /> Flyer</p>
                <p className="text-foreground font-medium text-xs max-w-[92px] truncate">{passenger_name || "—"}</p>
              </div>
              <div>
                <p className="uppercase tracking-wider text-[9px]">Seat</p>
                <p className="tl-mono text-foreground font-medium text-xs">{seat_number || "—"}</p>
              </div>
              <div>
                <p className="uppercase tracking-wider text-[9px] flex items-center gap-1"><MapPin size={10} /> Gate</p>
                <p className="tl-mono text-foreground font-medium text-xs">
                  {[terminal_departure, gate].filter(Boolean).join(" / ") || "—"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(confidence || confidence_score || (missing_fields || []).length > 0) && (
                <span className={`tl-status-badge ${(missing_fields || []).length ? "tl-status-warn" : "tl-status-ok"}`}>
                  {(missing_fields || []).length ? "Review" : "Ready"}
                </span>
              )}
              {ticket_number && (
                <span className="hidden px-2 py-0.5 rounded-full bg-secondary text-[10px] uppercase tracking-wider sm:inline-flex">
                  TKT {String(ticket_number).slice(-4)}
                </span>
              )}
              {status_text && (
                <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] uppercase tracking-wider">
                  {status_text}
                </span>
              )}
              {footerRight}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
