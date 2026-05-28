import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Shell from "@/components/shell/Shell";
import LeafletTravelMap from "@/components/LeafletTravelMap";
import ComponentErrorBoundary from "@/components/ComponentErrorBoundary";
import { api } from "@/lib/api";
import { Building2, Plane, Play, Map } from "lucide-react";

export default function MapPage() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replay, setReplay] = useState(false);
  const [replayIndex, setReplayIndex] = useState(999);

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

  // Compute map data to be shown on the map
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

  return (
    <Shell title="Your world" contentClassName="!overflow-hidden !flex !flex-col">
      <div className="relative flex-1 h-full w-full bg-[#0a1628]" data-testid="map-page">
        {/* Starfield */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse at center, rgba(16,37,68,0.8) 0%, #060d1b 70%)",
        }} />

        <ComponentErrorBoundary>
          <LeafletTravelMap mapData={activeMapData} selectedYear={year} />
        </ComponentErrorBoundary>

        {/* Top controls */}
        <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between gap-2">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { k: currentYear, label: String(currentYear) },
              { k: currentYear - 1, label: String(currentYear - 1) },
              { k: currentYear - 2, label: String(currentYear - 2) },
            ].map((c) => (
              <button
                key={c.k}
                onClick={() => setYear(c.k)}
                data-testid={`map-filter-${c.k}`}
                className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap backdrop-blur-md border transition ${
                  year === c.k
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-white/10 text-white border-white/20 hover:bg-white/15"
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
              className="px-3 py-1.5 rounded-full text-[11px] font-medium bg-white/10 text-white border border-white/20 backdrop-blur-md flex items-center gap-1.5 hover:bg-white/15 transition"
            >
              <Building2 size={12} /> Cities
            </button>
            <button
              onClick={() => setReplay(true)}
              data-testid="replay-year-btn"
              className="px-3 py-1.5 rounded-full text-[11px] font-medium bg-white/10 text-white border border-white/20 backdrop-blur-md flex items-center gap-1.5 hover:bg-white/15 transition"
            >
              <Play size={12} /> Replay
            </button>
          </div>
        </div>

        {/* Bottom stats */}
        <div className="absolute bottom-4 left-3 right-3 z-30 tl-card p-3 flex items-center justify-between backdrop-blur-md bg-black/70 border-white/20" data-testid="map-stats">
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
          <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 z-30 tl-card p-6 text-center backdrop-blur-md bg-black/75 border-white/20" data-testid="map-empty">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 text-primary flex items-center justify-center mx-auto mb-3">
              <Plane size={20} />
            </div>
            <p className="text-sm font-semibold text-white">Your map is waiting</p>
            <p className="text-xs text-white/70 mt-1">No flights logged for {year}. Add older tickets to complete your history.</p>
            <button onClick={() => navigate("/import")} className="tl-btn-primary mt-4 text-xs">
              Add a flight
            </button>
          </div>
        )}
      </div>
    </Shell>
  );
}
