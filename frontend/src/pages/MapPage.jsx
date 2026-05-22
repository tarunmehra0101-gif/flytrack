import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Shell from "@/components/shell/Shell";
import { Globe3D } from "@/components/ui/3d-globe";
import MapLibreTravelMap from "@/components/MapLibreTravelMap";
import ComponentErrorBoundary from "@/components/ComponentErrorBoundary";
import { api } from "@/lib/api";
import { Globe2, Building2, Home as HomeIcon, Plane, Play, Map } from "lucide-react";

const ARC_PALETTE = ["#10b981", "#38bdf8", "#f59e0b", "#a855f7", "#ef4444", "#f472b6", "#14b8a6", "#eab308"];

function MarkerColor(count, maxCount, isHome) {
  if (isHome) return "#10b981";
  const ratio = Math.min(1, count / Math.max(1, maxCount));
  if (ratio > 0.7) return "#38bdf8";
  if (ratio > 0.4) return "#a855f7";
  if (ratio > 0.15) return "#f59e0b";
  return "#f472b6";
}

const WebGLFallback = () => (
  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-muted-foreground z-10 bg-black/60 backdrop-blur-sm">
    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
      <Globe2 size={32} />
    </div>
    <h3 className="text-lg font-bold text-white mb-2">Interactive Preview Unavailable</h3>
    <p className="text-xs max-w-xs text-muted-foreground leading-relaxed">
      It looks like WebGL or hardware acceleration is disabled in your browser. Enable it in your browser settings to see your interactive 3D travel map.
    </p>
  </div>
);

export default function MapPage() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);
  const [replay, setReplay] = useState(false);
  const [replayIndex, setReplayIndex] = useState(999);
  const [mode, setMode] = useState("globe");

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

  const { markers, arcs, airportCount, routeCount } = useMemo(() => {
    const isValidLat = (num) => typeof num === "number" && !isNaN(num) && num >= -90 && num <= 90;
    const isValidLng = (num) => typeof num === "number" && !isNaN(num) && num >= -180 && num <= 180;

    const airports = (mapData?.airport_markers || []).filter((a) => a && isValidLat(a.lat) && isValidLng(a.lng));
    const max = Math.max(1, ...airports.map((a) => a.count || 0));
    const m = airports.map((a) => {
      return {
        ...a,
        label: `${a.city} · ${a.count} visit${a.count !== 1 ? "s" : ""}`,
        accent: MarkerColor(a.count, max, a.is_home),
      };
    });

    const routeRows = replay ? (mapData?.routes || []).slice(0, replayIndex) : (mapData?.routes || []);
    const a = routeRows
      .filter((x) => x && x.from && x.to && isValidLat(x.from.lat) && isValidLng(x.from.lng) && isValidLat(x.to.lat) && isValidLng(x.to.lng))
      .map((x, i) => ({
        key: x.route,
        from: x.from,
        to: x.to,
        count: x.count,
        color: ARC_PALETTE[i % ARC_PALETTE.length],
      }));
    return { markers: m, arcs: a, airportCount: m.length, routeCount: a.length };
  }, [mapData, replay, replayIndex]);

  const selectedRoutes = selected
    ? (mapData?.routes || []).filter((r) => r.route?.startsWith(`${selected.iata}-`) || r.route?.endsWith(`-${selected.iata}`))
    : [];

  return (
    <Shell title="Your world" contentClassName="!overflow-hidden !flex !flex-col">
      <div className="relative flex-1 h-full w-full bg-black" data-testid="map-page">
        {/* Starfield */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse at center, rgba(10,15,30,0.8) 0%, #000 70%)",
        }} />

        <ComponentErrorBoundary fallback={<WebGLFallback />}>
          {mode === "globe" ? (
            <Globe3D
              markers={markers}
              arcs={arcs}
              onMarkerHover={setHovered}
              onMarkerClick={setSelected}
              config={{
                autoRotateSpeed: 0.25,
                enableZoom: true,
                atmosphereColor: "#4da6ff",
                atmosphereIntensity: 0.8,
                bumpScale: 4,
                minDistance: 2.5,
                maxDistance: 10,
              }}
            />
          ) : (
            <MapLibreTravelMap mapData={mapData} selectedYear={year} />
          )}
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

        <div className="absolute top-14 left-3 right-3 z-30 grid grid-cols-2 gap-2 rounded-full bg-black/55 border border-white/15 backdrop-blur-md p-1">
          {[
            ["globe", Globe2, "Globe"],
            ["map", Map, "Detailed map"],
          ].map(([key, Icon, label]) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={`rounded-full py-2 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition ${
                mode === key ? "bg-primary text-primary-foreground" : "text-white/70 hover:text-white"
              }`}
              data-testid={`map-mode-${key}`}
            >
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>

        {/* Hovered marker chip */}
        {mode === "globe" && hovered && (
          <div className="absolute top-28 left-1/2 -translate-x-1/2 z-30 tl-card px-3 py-2 bg-black/70 border-white/20 text-white backdrop-blur-md pointer-events-none">
            <p className="text-[11px] tl-mono font-bold">{hovered.iata}</p>
            <p className="text-[10px] opacity-80">{hovered.label}</p>
          </div>
        )}

        {mode === "globe" && selected && (
          <div className="absolute top-28 left-3 right-3 z-30 tl-card p-3 bg-black/75 border-white/20 text-white backdrop-blur-md">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] tl-mono font-bold">{selected.iata}</p>
                <p className="text-sm font-semibold">{selected.city}</p>
                <p className="text-[10px] text-white/70">{selected.count} touches in {year}</p>
              </div>
              {selected.is_home && <span className="tl-iata-pill !bg-primary !text-primary-foreground !border-primary !text-[9px] inline-flex items-center gap-1"><HomeIcon size={9} /> home</span>}
            </div>
            {selectedRoutes.length > 0 && (
              <div className="mt-3 flex flex-col gap-1.5">
                {selectedRoutes.slice(0, 3).map((r) => (
                  <div key={r.route} className="flex items-center justify-between text-[11px] text-white/75 border-t border-white/10 pt-1.5">
                    <span>{r.route.replace("-", " → ")}</span>
                    <span>{r.count} time{r.count !== 1 ? "s" : ""}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bottom stats */}
        <div className="absolute bottom-4 left-3 right-3 z-30 tl-card p-3 flex items-center justify-between backdrop-blur-md bg-black/70 border-white/20" data-testid="map-stats">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
              <Globe2 size={16} />
            </div>
            <div className="text-white">
              <p className="text-xs font-semibold leading-tight">
                {mapData?.total_flights || 0} flight{mapData?.total_flights !== 1 ? "s" : ""} · {airportCount} airport{airportCount !== 1 ? "s" : ""}
              </p>
              <p className="text-[10px] text-white/70 leading-tight mt-0.5">
                {routeCount} route{routeCount !== 1 ? "s" : ""} flown · tap & drag to spin
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
            <p className="text-sm font-semibold text-white">Your globe is waiting</p>
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
