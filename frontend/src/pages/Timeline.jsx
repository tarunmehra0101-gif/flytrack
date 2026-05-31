import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Clock4, MapPin, ChevronRight, ChevronDown, PlaneTakeoff, Building2, Home as HomeIcon, Search, Trash2, MoreHorizontal, Plane, Edit3, Check, X } from "lucide-react";
import Shell from "@/components/shell/Shell";
import BoardingPassCard, { AIRLINE_BRANDS } from "@/components/BoardingPassCard";
import AirlineLogo from "@/components/AirlineLogo";
import { api } from "@/lib/api";
import { toast } from "sonner";

function daysBetween(a, b) {
  if (!a || !b) return null;
  try {
    const diff = Math.max(0, (new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24));
    return diff;
  } catch { return null; }
}

function fmtDate(iso) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" }); } catch { return iso; }
}

function fmtMonth(iso) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString([], { month: "long", year: "numeric" }); } catch { return ""; }
}

function fmtDuration(minutes, type, isHome, city) {
  const hrs = Math.round((minutes || 0) / 60);
  const days = Math.max(0, (minutes || 0) / 1440);
  if (type === "flight") {
    const h = Math.floor((minutes || 0) / 60);
    const m = (minutes || 0) % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  if (type === "airport") return `${hrs}h estimated airport time`;
  if (isHome) return `Back home in ${city || "your home city"} for ${Math.max(1, Math.round(days))} days`;
  return days >= 1 ? `${days.toFixed(1)} days in ${city}` : `${hrs}h in ${city}`;
}

// Custom compact flight stub component matching the airline branding color
function FlightStub({ flight, onClick }) {
  const { airline_iata, airline_name, flight_number, departure_airport_iata, arrival_airport_iata, departure_time_local, departure_time_utc, flight_date, seat_number } = flight;
  
  const iataKey = String(airline_iata || (flight_number ? flight_number.substring(0, 2) : "")).toUpperCase();
  let matchedBrand = AIRLINE_BRANDS[iataKey];
  if (!matchedBrand && airline_name) {
    matchedBrand = Object.values(AIRLINE_BRANDS).find(b => 
      b.name.toLowerCase() === airline_name.toLowerCase() || 
      airline_name.toLowerCase().includes(b.name.toLowerCase())
    );
  }

  const brand = matchedBrand || { name: airline_name, color: "#292d30" };
  const brandColor = brand.color || "#292d30";
  
  const depTimeStr = (() => {
    try {
      const t = departure_time_local || departure_time_utc;
      if (!t) return "—";
      if (String(t).match(/^\d{1,2}[:.]\d{2}/)) return String(t).replace(".", ":").slice(0, 5);
      return new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch { return "—"; }
  })();

  const dateStr = (() => {
    try {
      const d = flight_date || departure_time_utc;
      if (!d) return "";
      const dateObj = String(d).length === 10 ? new Date(`${d}T00:00:00`) : new Date(d);
      return dateObj.toLocaleDateString([], { day: "2-digit", month: "short" });
    } catch { return ""; }
  })();

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full bg-white rounded-xl p-3 flex items-center justify-between overflow-hidden transition-all duration-200 hover:shadow-md active:scale-[0.985] shadow-sm"
      style={{ borderLeft: `3px solid ${brandColor}` }}
    >
      {/* Brand logo & flight ID */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="bg-gray-50 p-1 rounded-lg flex items-center justify-center flex-shrink-0 w-8 h-8 border border-gray-100">
          <AirlineLogo iata={iataKey} size={24} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">{dateStr} · {depTimeStr}</p>
          <p className="text-sm font-bold truncate mt-0.5 text-gray-900">{airline_name || brand.name || airline_iata} {flight_number || ""}</p>
        </div>
      </div>
      
      {/* Route */}
      <div className="flex items-center gap-2 px-2 flex-1 justify-center max-w-[140px]">
        <span className="font-mono text-sm font-extrabold tracking-wider text-gray-900">{departure_airport_iata}</span>
        <div className="flex-1 flex flex-col items-center min-w-[24px]">
          <Plane size={10} className="transform rotate-90 text-gray-400" />
          <div className="w-full border-b border-dashed border-gray-200 mt-0.5" />
        </div>
        <span className="font-mono text-sm font-extrabold tracking-wider text-gray-900">{arrival_airport_iata}</span>
      </div>

      {/* Seat & chevron */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {seat_number && (
          <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 border border-gray-200 text-[9px] font-mono tracking-wider">
            {seat_number}
          </span>
        )}
        <ChevronRight size={14} className="text-gray-400" />
      </div>
    </button>
  );
}

export default function Timeline() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [pending, setPending] = useState([]);
  const [windows, setWindows] = useState([]);
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [query, setQuery] = useState("");
  const [overflowOpen, setOverflowOpen] = useState(null);

  // States for inline expandable morphing flights
  const [expandedFlights, setExpandedFlights] = useState({});
  const [editingFlightId, setEditingFlightId] = useState(null);
  const [editedFlights, setEditedFlights] = useState({});

  const loadData = useCallback(async () => {
    try {
      const [t, p, w, f] = await Promise.all([
        api.get("/trips", { params: { year: "all" } }),
        api.get("/segments/pending"),
        api.get("/wrapped", { params: { year: "all" } }),
        api.get("/flights"),
      ]);
      setTrips(t.data);
      setPending(p.data);
      setWindows(w.data?.presence_windows || []);
      setFlights(f.data || []);
    } catch (err) {
      toast.error("Couldn't load timeline data");
    }
    setLoading(false);
  }, []);

  const handleDeleteFlight = async (flight, e) => {
    e.stopPropagation();
    const route = flight.route || `${flight.departure_airport_iata}-${flight.arrival_airport_iata}`;
    try {
      await api.delete(`/flights/${flight.id}`);
      toast.success(`Removed ${route}`, { description: "Flight removed from your Timeline" });
      await loadData();
    } catch {
      toast.error("Couldn't delete flight");
    }
  };

  const handleSaveFlight = async (flightId) => {
    const updatedData = editedFlights[flightId];
    if (!updatedData) {
      setEditingFlightId(null);
      return;
    }
    try {
      await api.patch(`/flights/${flightId}`, updatedData);
      toast.success("Flight details updated successfully");
      setEditingFlightId(null);
      await loadData();
    } catch (err) {
      toast.error("Couldn't update flight details");
    }
  };

  const handleCancelEdit = (flightId) => {
    setEditingFlightId(null);
    setEditedFlights((prev) => {
      const next = { ...prev };
      delete next[flightId];
      return next;
    });
  };

  const [viewMode, setViewMode] = useState("trips");

  useEffect(() => { loadData(); }, [loadData]);

  const hasContent = trips.length > 0 || pending.length > 0 || windows.length > 0;
  
  const filteredWindows = windows
    .slice()
    .reverse()
    .filter((w) => {
      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      return [w.route, w.city_name, w.airport_iata, w.type].some((x) => String(x || "").toLowerCase().includes(q));
    });

  const filteredTrips = trips.filter((t) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (
      String(t.trip_name).toLowerCase().includes(q) ||
      (t.segments || []).some((s) => 
        [s.departure_airport_iata, s.arrival_airport_iata, s.departure_city_name, s.arrival_city_name, s.airline_name, s.airline_iata, s.flight_number]
          .some((x) => String(x || "").toLowerCase().includes(q))
      )
    );
  });
  
  const flightByRouteTime = (w) => flights.find((f) => (
    f.id === w.segment_id ||
    (w.route && `${f.departure_airport_iata}-${f.arrival_airport_iata}` === w.route && (!w.start_time_utc || f.departure_time_utc === w.start_time_utc))
  ));

  return (
    <Shell title="Timeline">
      <div className="p-4 pb-10 flex flex-col gap-5 animate-fade-up" data-testid="timeline-page">

        {pending.length > 0 && (
          <section data-testid="pending-section">
            <p className="text-[10px] uppercase tracking-[0.22em] text-amber-500/80 mb-2">Needs a quick look</p>
            <ul className="flex flex-col gap-3">
              {pending.slice(0, 3).map((s) => (
                <li key={s.id} onClick={() => navigate(`/review/${s.id}`)} className="cursor-pointer" data-testid={`pending-${s.id}`}>
                  <BoardingPassCard flight={s} compact />
                </li>
              ))}
              {pending.length > 3 && (
                <p className="text-xs text-muted-foreground">+{pending.length - 3} more pending…</p>
              )}
            </ul>
          </section>
        )}

        {hasContent && (
          <div className="flex flex-col gap-3">
            {/* Search Input */}
            <div className="tl-card p-3 flex items-center gap-2" data-testid="timeline-filter">
              <Search size={14} className="text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search city, airport, airline, route"
                className="bg-transparent outline-none text-sm flex-1 placeholder:text-muted-foreground text-white"
              />
              <span className="tl-iata-pill !text-[10px] flex items-center gap-1">{new Date().getFullYear()} <ChevronDown size={10} /></span>
            </div>

            {/* Toggle Pills */}
            <div className="flex gap-1.5 p-1 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setViewMode("trips")}
                className={`flex-1 py-2 text-[11px] font-bold rounded-xl transition-all duration-300 uppercase tracking-wider ${
                  viewMode === "trips"
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                Trips ({filteredTrips.length})
              </button>
              <button
                type="button"
                onClick={() => setViewMode("detailed")}
                className={`flex-1 py-2 text-[11px] font-bold rounded-xl transition-all duration-300 uppercase tracking-wider ${
                  viewMode === "detailed"
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                Detailed ({filteredWindows.length})
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1,2,3].map((i) => <div key={i} className="h-24 tl-card animate-pulse" />)}
          </div>
        ) : !hasContent ? (
          <div className="flex flex-col items-center justify-center py-20 text-center" data-testid="timeline-empty-main">
            <div className="w-16 h-16 rounded-2xl bg-primary/12 text-primary flex items-center justify-center mb-4">
              <PlaneTakeoff size={24} />
            </div>
            <p className="text-lg font-semibold">No flights yet</p>
            <p className="text-sm text-muted-foreground mt-2 max-w-[280px]">Import your first flight to start building your timeline.</p>
            <button onClick={() => navigate("/import")} className="tl-btn-primary mt-6 text-sm" data-testid="timeline-empty-import-cta">Import a flight</button>
          </div>
        ) : viewMode === "detailed" ? (
          <section>
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3 font-semibold">Detailed History</p>
            {filteredWindows.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No matching timeline events</p>
            ) : (
              <div className="relative pl-6">
                <div className="absolute left-1.5 top-2 bottom-2 w-px bg-border" />
                <ul className="flex flex-col gap-3">
                  {filteredWindows.map((w, idx) => {
                    const Icon = w.type === "flight" ? PlaneTakeoff : w.type === "airport" ? Clock4 : w.is_home ? HomeIcon : Building2;
                    const flight = w.type === "flight" ? flightByRouteTime(w) : null;
                    const month = fmtMonth(w.start_time_utc);
                    const prevMonth = idx > 0 ? fmtMonth(filteredWindows[idx - 1].start_time_utc) : null;
                    
                    return (
                      <React.Fragment key={w.id}>
                      {month !== prevMonth && (
                        <li className="relative">
                          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground py-2 font-bold">{month}</p>
                        </li>
                      )}
                      <li className="relative">
                        <span className={`absolute -left-[22px] top-4 w-3 h-3 rounded-full ring-4 ring-background ${w.type === "flight" ? "bg-primary" : w.is_home ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                        
                        {w.type === "flight" && flight ? (
                          <motion.div layout className="w-full">
                            <AnimatePresence mode="wait">
                              {!expandedFlights[flight.id] ? (
                                <motion.div
                                  key="collapsed-stub"
                                  layoutId={`flight-card-container-${flight.id}`}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="relative"
                                >
                                  <FlightStub
                                    flight={flight}
                                    onClick={() => setExpandedFlights((prev) => ({ ...prev, [flight.id]: true }))}
                                  />
                                  <div className="absolute right-12 bottom-5">
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); setOverflowOpen(overflowOpen === flight.id ? null : flight.id); }}
                                      className="text-white/60 hover:text-white transition-colors p-1.5 rounded-md hover:bg-white/10"
                                      title="More options"
                                    >
                                      <MoreHorizontal size={14} />
                                    </button>
                                    {overflowOpen === flight.id && (
                                      <div className="absolute right-0 bottom-full mb-1 bg-[#0f172a]/95 border border-white/20 backdrop-blur-xl rounded-xl shadow-2xl z-50 min-w-[140px] py-1 animate-fade-up">
                                        <button
                                          type="button"
                                          onClick={(e) => { setOverflowOpen(null); handleDeleteFlight(flight, e); }}
                                          className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                                        >
                                          <Trash2 size={13} /> Delete flight
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              ) : (
                                <motion.div
                                  key="expanded-card"
                                  layoutId={`flight-card-container-${flight.id}`}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ type: "spring", stiffness: 350, damping: 26 }}
                                  className="flex flex-col gap-3 w-full"
                                >
                                  <BoardingPassCard
                                    flight={editedFlights[flight.id] || flight}
                                    isEditable={editingFlightId === flight.id}
                                    onChange={(updated) => setEditedFlights((prev) => ({ ...prev, [flight.id]: updated }))}
                                  />
                                  
                                  <div className="flex gap-2 justify-end px-1">
                                    {editingFlightId === flight.id ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleCancelEdit(flight.id)}
                                          className="px-4 py-2 rounded-full border border-white/10 hover:bg-white/5 transition text-xs font-semibold flex items-center gap-1.5 backdrop-blur bg-white/5 text-white"
                                        >
                                          <X size={12} /> Cancel
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleSaveFlight(flight.id)}
                                          className="px-4 py-2 rounded-full bg-primary hover:bg-primary/90 transition text-xs font-semibold text-primary-foreground flex items-center gap-1.5 shadow-lg shadow-primary/20"
                                        >
                                          <Check size={12} /> Save Changes
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => setExpandedFlights((prev) => ({ ...prev, [flight.id]: false }))}
                                          className="px-4 py-2 rounded-full border border-white/10 hover:bg-white/5 transition text-xs font-semibold flex items-center gap-1.5 backdrop-blur bg-white/5 text-white"
                                        >
                                          Collapse
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setEditingFlightId(flight.id)}
                                          className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 transition text-xs font-semibold flex items-center gap-1.5 text-white backdrop-blur border border-white/10"
                                        >
                                          <Edit3 size={12} /> Edit Ticket
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        ) : (
                          <div
                            className="w-full text-left tl-card p-4 flex items-start gap-3"
                          >
                            <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
                              <Icon size={15} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{fmtDate(w.start_time_utc)}</p>
                              <p className="text-sm font-semibold mt-0.5 capitalize">
                                {w.is_home
                                  ? `Back home in ${w.city_name || "Bengaluru"}`
                                  : w.city_name || w.airport_iata || w.type}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {fmtDuration(w.duration_minutes, w.type, w.is_home, w.city_name)}
                              </p>
                              {w.type !== "flight" && (
                                <span className="mt-2 inline-block text-[11px] text-primary">Add note</span>
                              )}
                            </div>
                          </div>
                        )}
                      </li>
                      </React.Fragment>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>
        ) : (
          <section>
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3 font-semibold">Trips</p>
            {filteredTrips.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No matching trips</p>
            ) : (
              <div className="relative pl-6">
                <div className="absolute left-1.5 top-2 bottom-2 w-px bg-border" />
                <ul className="flex flex-col gap-5">
                  {filteredTrips.map((t) => {
                    const nFlights = t.total_segments || t.segments?.length || 0;
                    const air = Math.round((t.total_air_minutes || 0) / 60);
                    const isOpen = expanded[t.id];
                    return (
                      <li key={t.id} className="relative" data-testid={`trip-${t.id}`}>
                        <span className={`absolute -left-[22px] top-3 w-3 h-3 rounded-full ring-4 ring-background ${t.returned_home ? "bg-primary" : "bg-emerald-500"}`} />
                        <button
                          onClick={() => setExpanded((p) => ({ ...p, [t.id]: !p[t.id] }))}
                          className="w-full text-left tl-card p-4 hover:border-primary/40 transition"
                          data-testid={`trip-toggle-${t.id}`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{fmtDate(t.start_time_utc)}</p>
                              <p className="text-[15px] font-semibold truncate mt-0.5">{t.trip_name}</p>
                              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground font-medium">
                                <span className="flex items-center gap-1"><PlaneTakeoff size={12} /> {nFlights} flights</span>
                                <span className="flex items-center gap-1"><Clock4 size={12} /> {air}h air</span>
                                {t.returned_home ? (
                                  <span className="tl-iata-pill !text-[9px] !bg-primary/15 !text-primary !border-primary/30">Home run</span>
                                ) : (
                                  <span className="tl-iata-pill !text-[9px] !bg-amber-500/15 !text-amber-500 !border-amber-500/30">Open</span>
                                )}
                              </div>
                            </div>
                            <ChevronRight size={16} className={`text-muted-foreground transition ${isOpen ? "rotate-90" : ""}`} />
                          </div>
                        </button>

                        {isOpen && t.segments?.length > 0 && (
                          <ul className="mt-3 flex flex-col gap-3">
                            {t.segments.map((s, idx) => {
                              const next = t.segments[idx + 1];
                              const stayDays = next ? daysBetween(s.arrival_time_utc, next.departure_time_utc) : null;
                              return (
                                <React.Fragment key={s.id}>
                                  <BoardingPassCard flight={s} compact />
                                  {stayDays !== null && stayDays > 0 && (
                                    <div className="flex items-center gap-2 pl-1.5 text-[11px] text-muted-foreground font-semibold">
                                      <MapPin size={11} /> {stayDays.toFixed(1)}d in {s.arrival_city_name || s.arrival_airport_iata}
                                    </div>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>
        )}
      </div>
    </Shell>
  );
}
