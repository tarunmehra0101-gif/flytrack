import React from "react";
import { PlaneTakeoff, Clock4, Armchair, MapPin, Briefcase, Ticket, Navigation, UserRound } from "lucide-react";
import AirlineLogo from "@/components/AirlineLogo";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function fmtDateTime(iso) {
  if (!iso) return "Unknown";
  if (String(iso).match(/^\d{1,2}[:.]\d{2}/)) return String(iso).replace(".", ":").slice(0, 5);
  try {
    return new Date(iso).toLocaleString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function minutesBetween(a, b) {
  if (!a || !b) return null;
  const minutes = Math.max(0, Math.round((new Date(b) - new Date(a)) / 60000));
  if (!Number.isFinite(minutes)) return null;
  return minutes;
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="tl-card p-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground">
        <Icon size={15} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate mt-0.5">{value || "Unknown"}</p>
      </div>
    </div>
  );
}

export default function FlightDetailSheet({ flight, open, onOpenChange }) {
  const duration = minutesBetween(flight?.departure_time_utc, flight?.arrival_time_utc);
  const hours = duration == null ? null : `${Math.floor(duration / 60)}h ${duration % 60}m`;
  const route = flight ? `${flight.departure_airport_iata || "—"} → ${flight.arrival_airport_iata || "—"}` : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <AirlineLogo iata={flight?.airline_iata} size={34} />
            <span className="min-w-0">
              <span className="block text-base truncate">
                {flight?.airline_name || flight?.airline_iata || "Flight"} {flight?.flight_number || ""}
              </span>
              <span className="block tl-mono text-xs text-primary mt-0.5">{route}</span>
            </span>
          </DialogTitle>
          <DialogDescription>
            {flight?.departure_city_name || "Departure"} to {flight?.arrival_city_name || "arrival"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <DetailRow icon={PlaneTakeoff} label="Takeoff" value={fmtDateTime(flight?.departure_time_utc || flight?.departure_time_local)} />
            <DetailRow icon={Navigation} label="Landing" value={fmtDateTime(flight?.arrival_time_utc || flight?.arrival_time_local)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DetailRow icon={Clock4} label="Duration" value={hours || `${Math.round((flight?.flight_duration_minutes || 0) / 60)}h estimated`} />
            <DetailRow icon={MapPin} label="Distance" value={flight?.distance_km ? `${Math.round(flight.distance_km).toLocaleString()} km` : "Unknown"} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DetailRow icon={Armchair} label="Seat" value={flight?.seat_number || flight?.seat || "Not saved"} />
            <DetailRow icon={Briefcase} label="Cabin" value={flight?.cabin_class || flight?.class || "Economy"} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DetailRow icon={UserRound} label="Ticket holder" value={flight?.passenger_name || "Not saved"} />
            <DetailRow icon={Ticket} label="PNR" value={flight?.booking_reference || flight?.pnr || "Not saved"} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DetailRow icon={Ticket} label="Ticket no." value={flight?.ticket_number || "Not saved"} />
            <DetailRow icon={PlaneTakeoff} label="Aircraft" value={flight?.aircraft_type || "Not enriched yet"} />
          </div>
          <div className="tl-card p-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Airport details</p>
            <p className="text-sm mt-1">
              Takeoff terminal {flight?.terminal_departure || flight?.departure_terminal || "TBD"} · Gate {flight?.gate || flight?.departure_gate || "TBD"}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Arrive {flight?.terminal_arrival || flight?.arrival_terminal || "TBD"} · Gate {flight?.arrival_gate || "TBD"}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
