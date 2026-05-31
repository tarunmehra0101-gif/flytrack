import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Shell from "@/components/shell/Shell";
import LeafletTravelMap from "@/components/LeafletTravelMap";
import ComponentErrorBoundary from "@/components/ComponentErrorBoundary";
import { api } from "@/lib/api";
import { Building2, Plane, Play, Map, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function MapPage() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState("all");
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replay, setReplay] = useState(false);
  const [replayIndex, setReplayIndex] = useState(999);
  const [selectedItem, setSelectedItem] = useState(null); // { type: 'route' | 'airport', data: ... }

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/map-data", { params: { year } });
        setMapData(data);
      } catch (err) { console.error("Map data fetch failed:", err); }
      setLoading(false);
    })();
  }, [year]);

  useEffect(() => {
    if (!replay) return;
    setReplayIndex(0);
    const id = window.setInterval(() => {
      setReplayIndex((idx) => {
        if (idx >= (mapData?.routes || []).length) {
          window.clearInterval(id);
          setReplay(false);
          return 999;
        }
        return idx + 1;
      });
    }, 650);
    return () => window.clearInterval(id);
  }, [replay, mapData?.routes]);

  const activeMapData = useMemo(() => {
    if (!mapData) return null;
    if (!replay) return mapData;
    return {
      ...mapData,
      routes: (mapData.routes || []).slice(0, replayIndex)
    };
  }, [mapData, replay, replayIndex]);

  const { airportCount, routeCount } = useMemo(() => {
    const isValidLat = (num) => typeof num === "number" && !isNaN(num) && num >= -90 && num <= 90;
    const isValidLng = (num) => typeof num === "number" && !isNaN(num) && num >= -180 && num <= 180;

    const airports = (mapData?.airport_markers || []).filter((a) => a && isValidLat(a.lat) && isValidLng(a.lng));
    const activeRoutes = activeMapData?.routes || [];
    return { 
      airportCount: airports.length, 
      routeCount: activeRoutes.length 
    };
  }, [mapData, activeMapData]);

  const handleSelectRoute = (route) => {
    setSelectedItem({ type: 'route', data: route });
  };

  const handleSelectAirport = (airport) => {
    setSelectedItem({ type: 'airport', data: airport });
  };

  return (
    <Shell title="Your world" contentClassName="!overflow-hidden !flex !flex-col">
      <div className="relative flex-1 h-full w-full bg-black" data-testid="map-page">
        <ComponentErrorBoundary>
          <LeafletTravelMap 
            mapData={activeMapData} 
            selectedYear={year === "all" ? "All" : year} 
            onSelectRoute={handleSelectRoute}
            onSelectAirport={handleSelectAirport}
          />
        </ComponentErrorBoundary>

        {/* Top controls */}
        <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between gap-2">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setYear("all")}
              data-testid="map-filter-all"
              className={`px-3 py-1.5 rounded-md text-[11px] font-medium whitespace-nowrap backdrop-blur-md border transition ${
                year === "all"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-black/50 text-white border-white/20 hover:bg-black/70"
              }`}
            >
              All
            </button>
            {[
              { k: currentYear, label: String(currentYear) },
              { k: currentYear - 1, label: String(currentYear - 1) },
              { k: currentYear - 2, label: String(currentYear - 2) },
            ].map((c) => (
              <button
                key={c.k}
                onClick={() => setYear(c.k)}
                data-testid={`map-filter-${c.k}`}
                className={`px-3 py-1.5 rounded-md text-[11px] font-medium whitespace-nowrap backdrop-blur-md border transition ${
                  year === c.k
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-black/50 text-white border-white/20 hover:bg-black/70"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => navigate("/cities")}
              data-testid="cities-link"
              className="px-3 py-1.5 rounded-md text-[11px] font-medium bg-black/50 text-white border border-white/20 backdrop-blur-md flex items-center gap-1.5 hover:bg-black/70 transition"
            >
              <Building2 size={12} /> Cities
            </button>
            <button
              onClick={() => setReplay(true)}
              data-testid="replay-year-btn"
              className="px-3 py-1.5 rounded-md text-[11px] font-medium bg-black/50 text-white border border-white/20 backdrop-blur-md flex items-center gap-1.5 hover:bg-black/70 transition"
            >
              <Play size={12} /> Replay
            </button>
          </div>
        </div>

        {/* Interactive detail card overlay */}
        <AnimatePresence>
          {selectedItem && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute bottom-20 left-3 right-3 z-30 bg-black/90 backdrop-blur-xl border border-white/15 rounded-2xl p-4 text-white"
              data-testid="map-detail-card"
            >
              <button 
                onClick={() => setSelectedItem(null)} 
                className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
              >
                <X size={12} />
              </button>
              
              {selectedItem.type === 'route' ? (
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-white/50 font-semibold">Route Details</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-2xl font-black tl-mono tracking-tight">{selectedItem.data.from?.iata}</span>
                    <div className="flex-1 flex items-center">
                      <div className="h-[1px] flex-1 border-t border-dashed border-white/30" />
                      <Plane size={14} className="mx-2 text-primary transform rotate-90" />
                      <div className="h-[1px] flex-1 border-t border-dashed border-white/30" />
                    </div>
                    <span className="text-2xl font-black tl-mono tracking-tight">{selectedItem.data.to?.iata}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-white/70">
                    <span>{selectedItem.data.count || 0} flight{(selectedItem.data.count || 0) !== 1 ? 's' : ''}</span>
                    {selectedItem.data.from?.city && <span>{selectedItem.data.from.city} → {selectedItem.data.to?.city}</span>}
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-white/50 font-semibold">Airport</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-2xl font-black tl-mono tracking-tight">{selectedItem.data.iata}</span>
                    {selectedItem.data.is_home && (
                      <span className="text-[9px] uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md font-bold border border-emerald-500/30">
                        Home
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white/80 mt-1 font-medium">{selectedItem.data.city}, {selectedItem.data.country}</p>
                  <p className="text-xs text-white/50 mt-1">{selectedItem.data.count || 0} visit{(selectedItem.data.count || 0) !== 1 ? 's' : ''}</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom stats */}
        <div className="absolute bottom-4 left-3 right-3 z-30 rounded-xl p-3 flex items-center justify-between backdrop-blur-md bg-black/80 border border-white/15" data-testid="map-stats">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
              <Map size={16} />
            </div>
            <div className="text-white">
              <p className="text-xs font-semibold leading-tight">
                {mapData?.total_flights || 0} flight{mapData?.total_flights !== 1 ? "s" : ""} · {airportCount} airport{airportCount !== 1 ? "s" : ""}
              </p>
              <p className="text-[10px] text-white/70 leading-tight mt-0.5">
                {routeCount} route{routeCount !== 1 ? "s" : ""} flown
              </p>
            </div>
          </div>
          {loading && <div className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />}
        </div>

        {!loading && (mapData?.total_flights || 0) === 0 && (
          <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 z-30 rounded-2xl p-6 text-center backdrop-blur-md bg-black/85 border border-white/15" data-testid="map-empty">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 text-primary flex items-center justify-center mx-auto mb-3">
              <Plane size={20} />
            </div>
            <p className="text-sm font-semibold text-white">Your map is waiting</p>
            <p className="text-xs text-white/70 mt-1">No flights logged for {year === "all" ? "any year" : year}. Add older tickets to complete your history.</p>
            <button onClick={() => navigate("/import")} className="tl-btn-primary mt-4 text-xs">
              Add a flight
            </button>
          </div>
        )}
      </div>
    </Shell>
  );
}
