import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Shell from "@/components/shell/Shell";
import { api } from "@/lib/api";
import { ArrowUpRight, ArrowDownLeft, Home as HomeIcon, MapPin, Plus, Info } from "lucide-react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

// Curated, high-quality city hero images (Unsplash). Fallbacks degrade to solid gradient.
const CITY_IMAGES = {
  BOM: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=600&q=60", // Mumbai
  DEL: "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=600&q=60", // Delhi
  BLR: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=600&q=60", // Bengaluru
  MAA: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=600&q=60", // Chennai
  HYD: "https://images.unsplash.com/photo-1600100397961-fb1b89a75fbb?auto=format&fit=crop&w=600&q=60", // Hyderabad
  CCU: "https://images.unsplash.com/photo-1558431382-27e303142255?auto=format&fit=crop&w=600&q=60",   // Kolkata
  GOI: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=60", // Goa
  GOX: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=60",
  JAI: "https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=600&q=60", // Jaipur
  COK: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=600&q=60", // Kochi
  AMD: "https://images.unsplash.com/photo-1610552251056-10d8b9c7a4e0?auto=format&fit=crop&w=600&q=60", // Ahmedabad
  PNQ: "https://images.unsplash.com/photo-1585484173186-9cb1ccf04a41?auto=format&fit=crop&w=600&q=60", // Pune
  SXR: "https://images.unsplash.com/photo-1590689080414-8fa2dea7658c?auto=format&fit=crop&w=600&q=60", // Srinagar
  IXL: "https://images.unsplash.com/photo-1580289143186-03d6ab1bcfba?auto=format&fit=crop&w=600&q=60", // Leh
  DXB: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=600&q=60", // Dubai
  AUH: "https://images.unsplash.com/photo-1530521954074-e64f6810b32d?auto=format&fit=crop&w=600&q=60", // Abu Dhabi
  DOH: "https://images.unsplash.com/photo-1568805794613-a07ef97e3cd6?auto=format&fit=crop&w=600&q=60", // Doha
  SIN: "https://images.unsplash.com/photo-1565967511849-76a60a516170?auto=format&fit=crop&w=600&q=60", // Singapore
  HKG: "https://images.unsplash.com/photo-1536599018102-9f803c140fc1?auto=format&fit=crop&w=600&q=60", // HK
  BKK: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=600&q=60", // Bangkok
  LHR: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=600&q=60", // London
  LGW: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=600&q=60",
  CDG: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=600&q=60", // Paris
  FRA: "https://images.unsplash.com/photo-1527866512907-a35a62a0f6c3?auto=format&fit=crop&w=600&q=60", // Frankfurt
  MUC: "https://images.unsplash.com/photo-1599982048981-3fa0d2ac7930?auto=format&fit=crop&w=600&q=60", // Munich
  AMS: "https://images.unsplash.com/photo-1534351590666-13e3e96c5017?auto=format&fit=crop&w=600&q=60", // Amsterdam
  ZRH: "https://images.unsplash.com/photo-1508433957232-3107f5fd5995?auto=format&fit=crop&w=600&q=60", // Zurich
  JFK: "https://images.unsplash.com/photo-1500916434205-0c77489c6cf7?auto=format&fit=crop&w=600&q=60", // NYC
  EWR: "https://images.unsplash.com/photo-1500916434205-0c77489c6cf7?auto=format&fit=crop&w=600&q=60",
  LAX: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=600&q=60", // LA
  SFO: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=60", // SF
  NRT: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=600&q=60", // Tokyo
  HND: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=600&q=60",
  SYD: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=600&q=60", // Sydney
  MEL: "https://images.unsplash.com/photo-1514395462725-fb4566210144?auto=format&fit=crop&w=600&q=60", // Melbourne
  ICN: "https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?auto=format&fit=crop&w=600&q=60", // Seoul
  KUL: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=600&q=60", // KL
  IST: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=600&q=60", // Istanbul
  BCN: "https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=600&q=60", // Barcelona
  FCO: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=600&q=60", // Rome
  VCE: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=600&q=60", // Venice
  ATH: "https://images.unsplash.com/photo-1555993539-1732b0258235?auto=format&fit=crop&w=600&q=60", // Athens
  ORD: "https://images.unsplash.com/photo-1494522855154-9297ac14b55f?auto=format&fit=crop&w=600&q=60", // Chicago
  SEA: "https://images.unsplash.com/photo-1502175353174-a7a70e73b4c3?auto=format&fit=crop&w=600&q=60", // Seattle
  BOS: "https://images.unsplash.com/photo-1501979376754-1d745e4fa2e7?auto=format&fit=crop&w=600&q=60", // Boston
  ATL: "https://images.unsplash.com/photo-1575917649111-0cee4e7e42d3?auto=format&fit=crop&w=600&q=60", // Atlanta
  IAD: "https://images.unsplash.com/photo-1617581629397-a72507c3de9e?auto=format&fit=crop&w=600&q=60", // DC
  MIA: "https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?auto=format&fit=crop&w=600&q=60", // Miami
  CAI: "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?auto=format&fit=crop&w=600&q=60", // Cairo
  JNB: "https://images.unsplash.com/photo-1577948000111-9c970dfe3743?auto=format&fit=crop&w=600&q=60", // Johannesburg
  CPT: "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?auto=format&fit=crop&w=600&q=60", // Cape Town
  LIS: "https://images.unsplash.com/photo-1585208798174-6cedd86e019a?auto=format&fit=crop&w=600&q=60", // Lisbon
  MAD: "https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=600&q=60", // Madrid
  VIE: "https://images.unsplash.com/photo-1516550893923-42d28e5677af?auto=format&fit=crop&w=600&q=60", // Vienna
  PRG: "https://images.unsplash.com/photo-1519677100203-a0e668c92439?auto=format&fit=crop&w=600&q=60", // Prague
  BUD: "https://images.unsplash.com/photo-1549923746-c502d488b3ea?auto=format&fit=crop&w=600&q=60", // Budapest
  CMB: "https://images.unsplash.com/photo-1586017153113-1b29eb5c7e21?auto=format&fit=crop&w=600&q=60", // Colombo
  MLE: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=600&q=60", // Maldives
  KTM: "https://images.unsplash.com/photo-1558799401-1dcba79834c2?auto=format&fit=crop&w=600&q=60", // Kathmandu
  DAC: "https://images.unsplash.com/photo-1617143207675-e7e6131e3061?auto=format&fit=crop&w=600&q=60", // Dhaka
  RUH: "https://images.unsplash.com/photo-1586724237569-9c920b4bbe78?auto=format&fit=crop&w=600&q=60", // Riyadh
  BAH: "https://images.unsplash.com/photo-1617859047452-8510bcf207fd?auto=format&fit=crop&w=600&q=60", // Bahrain
  MCT: "https://images.unsplash.com/photo-1559662780-c3bab6f7e00b?auto=format&fit=crop&w=600&q=60", // Muscat
};

/** Fallback: use city name to search Unsplash for a skyline photo (free, no key). */
function cityImageUrl(iata, cityName) {
  if (CITY_IMAGES[iata]) return CITY_IMAGES[iata];
  if (cityName) return `https://source.unsplash.com/600x400/?${encodeURIComponent(cityName)}+city+skyline`;
  return "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=600&q=60";
}

const DEFAULT_CITY_IMAGE = "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=600&q=60";

const WINDOWS = [
  { k: "3m", label: "Last 3 months" },
  { k: "6m", label: "6 months" },
  { k: "12m", label: "12 months" },
  { k: "ytd", label: "This year" },
  { k: "all", label: "Lifetime" },
];

function fmtDate(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return iso; }
}

export default function Cities() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [window, setWindow] = useState("all");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("cities");
  const [selectedCity, setSelectedCity] = useState(null);

  const load = async (w) => {
    setLoading(true);
    try {
      const { data } = await api.get("/cities", { params: { window: w } });
      setData(data);
    } catch {
      toast.error("Couldn't load city data");
    }
    setLoading(false);
  };

  useEffect(() => { load(window); }, [window]);

  const cities = useMemo(() => data?.cities || [], [data]);
  const totalAway = useMemo(() => cities.filter(c => !c.is_home).reduce((s, c) => s + (c.days_spent || 0), 0), [cities]);
  const totalHome = useMemo(() => cities.filter(c => c.is_home).reduce((s, c) => s + (c.days_spent || 0), 0), [cities]);
  const countries = useMemo(() => {
    const grouped = {};
    cities.forEach((c) => {
      const key = c.country || "Unknown";
      grouped[key] ||= { country: key, days: 0, cities: 0, flights: 0 };
      grouped[key].days += c.days_spent || 0;
      grouped[key].cities += 1;
      grouped[key].flights += (c.flights_in || 0) + (c.flights_out || 0);
    });
    return Object.values(grouped).sort((a, b) => b.days - a.days);
  }, [cities]);

  return (
    <Shell title="Your cities">
      <div className="p-4 pb-10 flex flex-col gap-5 animate-fade-up" data-testid="cities-page">

        {/* Window chooser */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4" data-testid="window-chips">
          {WINDOWS.map((w) => (
            <button
              key={w.k}
              onClick={() => setWindow(w.k)}
              data-testid={`window-${w.k}`}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition ${
                window === w.k
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary/60 text-foreground border-border hover:bg-secondary"
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {["cities", "countries"].map((k) => (
            <button
              key={k}
              onClick={() => setView(k)}
              className={`py-2 rounded-full text-xs font-semibold capitalize border transition ${
                view === k ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/60 border-border"
              }`}
            >
              {k}
            </button>
          ))}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="tl-card p-4" data-testid="summary-home">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <HomeIcon size={12} /> At home
            </div>
            <p className="text-2xl tl-number font-light tracking-tight mt-2">{totalHome.toFixed(1)}<span className="text-sm text-muted-foreground ml-1">days</span></p>
            {totalHome === 0 && <p className="text-[10px] text-muted-foreground mt-1">No home time in this window.</p>}
          </div>
          <div className="tl-card p-4" data-testid="summary-away">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <MapPin size={12} /> Away
            </div>
            <p className="text-2xl tl-number font-light tracking-tight mt-2">{totalAway.toFixed(1)}<span className="text-sm text-muted-foreground ml-1">days</span></p>
          </div>
        </div>

        {/* Cities list */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1,2,3].map((i) => <div key={i} className="h-24 tl-card animate-pulse" />)}
          </div>
        ) : cities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center" data-testid="cities-empty">
            <div className="w-14 h-14 rounded-2xl bg-primary/12 text-primary flex items-center justify-center mb-3">
              <MapPin size={20} />
            </div>
            <p className="text-lg font-semibold">Nothing in this window</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-[260px]">Add a few flights or widen the time window.</p>
            <button onClick={() => navigate("/import")} className="tl-btn-primary text-sm mt-5">Add a flight</button>
          </div>
        ) : view === "countries" ? (
          <ul className="flex flex-col gap-3" data-testid="countries-list">
            {countries.map((c) => (
              <li key={c.country} className="tl-card p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{c.country}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.cities} cities · {c.flights} airport touches</p>
                </div>
                <p className="tl-number text-xl">{c.days.toFixed(1)}<span className="text-xs text-muted-foreground ml-1">d</span></p>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="flex flex-col gap-3" data-testid="cities-list">
            {cities.map((c, idx) => (
              <motion.li
                key={c.iata}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(0.4, idx * 0.04) }}
                className="tl-card overflow-hidden cursor-pointer hover:border-primary/40 transition"
                data-testid={`city-${c.iata}`}
                onClick={() => setSelectedCity(c)}
              >
                <div className="relative h-28 w-full overflow-hidden">
                  <img
                    src={cityImageUrl(c.iata, c.city)}
                    alt={c.city}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.src = DEFAULT_CITY_IMAGE; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                    {c.is_home && (
                      <span className="tl-iata-pill !bg-primary !text-primary-foreground !border-primary !text-[9px] inline-flex items-center gap-1">
                        <HomeIcon size={9} /> home
                      </span>
                    )}
                    {!c.both_legs && (c.flights_in + c.flights_out) > 0 && (
                      <span className="tl-iata-pill !text-[9px] !bg-amber-500/85 !text-black !border-amber-500 inline-flex items-center gap-1" title="Missing return leg">
                        <Info size={9} /> one-way only
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-2 left-3 right-3 text-white flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-white/70">{c.country || "—"}</p>
                      <h3 className="text-lg font-semibold truncate">{c.city}</h3>
                    </div>
                    <span className="tl-mono text-xs tracking-wider bg-black/50 px-2 py-0.5 rounded-md">{c.iata}</span>
                  </div>
                </div>
                <div className="p-4 grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Time here</p>
                    <p className="text-xl tl-number font-light mt-0.5">{(c.days_spent ?? 0).toFixed(1)}<span className="text-xs text-muted-foreground ml-1">d</span></p>
                    {c.incomplete && <p className="text-[10px] text-amber-500 mt-1">Needs times</p>}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-0.5"><ArrowDownLeft size={10} /> Arrivals</p>
                    <p className="text-xl tl-number font-light mt-0.5">{c.flights_in}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-0.5"><ArrowUpRight size={10} /> Departures</p>
                    <p className="text-xl tl-number font-light mt-0.5">{c.flights_out}</p>
                  </div>
                  {(c.connected_to || []).length > 0 && (
                    <div className="col-span-3 flex flex-wrap gap-1 pt-2 border-t border-border/40 mt-1">
                      <span className="text-[10px] text-muted-foreground mr-1 mt-1">Connected with:</span>
                      {(c.connected_to || []).slice(0, 8).map((x) => (
                        <span key={x} className="tl-iata-pill !text-[10px]">{x}</span>
                      ))}
                    </div>
                  )}
                  {c.last_visit && (
                    <p className="col-span-3 text-[11px] text-muted-foreground mt-1">Last visit: {fmtDate(c.last_visit)}</p>
                  )}
                </div>
                {c.incomplete && (
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate("/import"); }}
                    className="w-full p-3 border-t border-border text-[11px] font-medium text-primary hover:bg-primary/5 transition flex items-center justify-center gap-1.5"
                    data-testid={`add-missing-${c.iata}`}
                  >
                    <Plus size={12} /> Add missing flight details for {c.city}
                  </button>
                )}
              </motion.li>
            ))}
          </ul>
        )}
      </div>
      <Dialog open={!!selectedCity} onOpenChange={(v) => !v && setSelectedCity(null)}>
        <DialogContent className="max-w-[420px] overflow-hidden p-0">
          {selectedCity && (
            <>
              <div className="relative h-48">
                <img src={cityImageUrl(selectedCity.iata, selectedCity.city)} alt={selectedCity.city} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/70">{selectedCity.country}</p>
                  <h2 className="text-2xl font-semibold">{selectedCity.city}</h2>
                  <p className="tl-mono text-xs mt-1">{selectedCity.iata}</p>
                </div>
              </div>
              <div className="p-4">
                <DialogHeader>
                  <DialogTitle className="text-base">City details</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="tl-card p-3">
                    <p className="text-[10px] uppercase text-muted-foreground">Time</p>
                    <p className="text-lg tl-number">{(selectedCity.days_spent || 0).toFixed(1)}d</p>
                  </div>
                  <div className="tl-card p-3">
                    <p className="text-[10px] uppercase text-muted-foreground">In</p>
                    <p className="text-lg tl-number">{selectedCity.flights_in || 0}</p>
                  </div>
                  <div className="tl-card p-3">
                    <p className="text-[10px] uppercase text-muted-foreground">Out</p>
                    <p className="text-lg tl-number">{selectedCity.flights_out || 0}</p>
                  </div>
                </div>
                <div className="tl-card p-3 mt-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Connected routes</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(selectedCity.connected_to || []).map((x) => <span key={x} className="tl-iata-pill !text-[10px]">{selectedCity.iata} ↔ {x}</span>)}
                  </div>
                </div>
                <button onClick={() => toast.info("Memory notes coming soon!")} className="w-full mt-3 tl-btn-primary text-sm">Add memory note</button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
