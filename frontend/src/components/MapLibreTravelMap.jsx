import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { ComposableMap, Geographies, Geography, Marker, Line, Graticule } from "react-simple-maps";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export default function MapLibreTravelMap({ mapData, selectedYear }) {
  const [selected, setSelected] = useState(null);
  const [rotation, setRotation] = useState([-78.9629, -22.5937, 0]);
  const [isDragging, setIsDragging] = useState(false);
  const [zoom, setZoom] = useState(250);
  const dragRef = useRef({ x: 0, y: 0, rot: [0, 0] });

  // Handle Dragging
  const handlePointerDown = (e) => {
    setIsDragging(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragRef.current = { x: clientX, y: clientY, rot: rotation };
  };

  const handlePointerMove = useCallback((e) => {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const dx = clientX - dragRef.current.x;
    const dy = clientY - dragRef.current.y;
    
    const rX = dragRef.current.rot[0] + dx * 0.4;
    const rY = Math.max(-90, Math.min(90, dragRef.current.rot[1] - dy * 0.4));
    setRotation([rX, rY, 0]);
  }, [isDragging]);

  const handlePointerUp = () => setIsDragging(false);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handlePointerMove);
      window.addEventListener("mouseup", handlePointerUp);
      window.addEventListener("touchmove", handlePointerMove, { passive: false });
      window.addEventListener("touchend", handlePointerUp);
    } else {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("touchend", handlePointerUp);
    }
    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("touchend", handlePointerUp);
    };
  }, [isDragging, handlePointerMove]);

  // Handle Zoom
  const handleWheel = (e) => {
    e.preventDefault();
    setZoom((z) => Math.max(100, Math.min(1000, z - e.deltaY * 0.5)));
  };

  const airports = useMemo(() => (mapData?.airport_markers || []).filter(a => a.lng != null && a.lat != null), [mapData]);
  const routes = useMemo(() => (mapData?.routes || []).filter(r => r.from && r.to), [mapData]);

  // Center on home airport on mount
  useEffect(() => {
    const home = airports.find(a => a.is_home);
    if (home) {
      setRotation([-home.lng, -home.lat, 0]);
    } else if (airports.length > 0) {
      setRotation([-airports[0].lng, -airports[0].lat, 0]);
    }
  }, [airports]);

  return (
    <div 
      className="relative h-full w-full bg-transparent overflow-hidden" 
      onMouseDown={handlePointerDown} 
      onTouchStart={handlePointerDown}
      onWheel={handleWheel}
      style={{ cursor: isDragging ? "grabbing" : "grab" }}
      data-testid="react-simple-maps-container"
    >
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 bg-black/40 backdrop-blur-md rounded-lg p-1 border border-white/10 pointer-events-auto">
        <button className="w-8 h-8 rounded bg-white/5 hover:bg-white/20 text-white flex items-center justify-center font-bold text-lg" onClick={() => setZoom(z => Math.min(1000, z + 50))}>+</button>
        <button className="w-8 h-8 rounded bg-white/5 hover:bg-white/20 text-white flex items-center justify-center font-bold text-lg" onClick={() => setZoom(z => Math.max(100, z - 50))}>-</button>
      </div>

      <ComposableMap
        projection="geoOrthographic"
        projectionConfig={{
          scale: zoom,
          rotate: rotation,
        }}
        width={800}
        height={600}
        style={{ width: "100%", height: "100%", outline: "none" }}
      >
        <circle cx={400} cy={300} r={zoom} fill="rgba(14, 165, 233, 0.05)" />
        <Graticule stroke="rgba(255, 255, 255, 0.05)" strokeWidth={0.5} />
        
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#1f2937"
                stroke="#374151"
                strokeWidth={0.5}
                style={{
                  default: { outline: "none" },
                  hover: { fill: "#374151", outline: "none" },
                  pressed: { fill: "#4b5563", outline: "none" },
                }}
              />
            ))
          }
        </Geographies>

        {routes.map((r, i) => (
          <Line
            key={`line-${i}`}
            from={[r.from.lng, r.from.lat]}
            to={[r.to.lng, r.to.lat]}
            stroke="#67e8f9"
            strokeWidth={Math.max(1, Math.min(3, r.count * 0.6))}
            strokeLinecap="round"
            className="opacity-60 hover:opacity-100 transition-opacity"
            onClick={() => setSelected({ type: "route", ...r })}
            style={{ cursor: "pointer", default: { outline: "none" }, hover: { outline: "none" } }}
          />
        ))}

        {airports.map((a, i) => (
          <Marker
            key={`marker-${i}`}
            coordinates={[a.lng, a.lat]}
            onClick={() => setSelected({ type: "airport", ...a })}
            style={{ cursor: "pointer", default: { outline: "none" }, hover: { outline: "none" } }}
          >
            <circle 
              r={a.is_home ? 5 : Math.max(2.5, Math.min(6, 2 + (a.count || 0) * 0.4))} 
              fill={a.is_home ? "#10b981" : "#38bdf8"} 
              stroke="#ffffff" 
              strokeWidth={0.5} 
              className="opacity-90 hover:opacity-100 hover:scale-125 transition-all" 
            />
          </Marker>
        ))}
      </ComposableMap>
      
      {selected && (
        <div className="absolute left-3 right-3 bottom-6 z-20 tl-card tl-card-intense p-4 bg-black/78 border-white/15 text-white backdrop-blur-md pointer-events-auto shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/55">
                {selected.type === "airport" ? "Airport" : "Route"} · {selectedYear}
              </p>
              <p className="text-lg font-semibold mt-1">
                {selected.type === "airport" ? `${selected.city} (${selected.iata})` : String(selected.route || "").replace("-", " → ")}
              </p>
              <p className="text-xs text-white/70 mt-1">
                {selected.type === "airport"
                  ? `${selected.count || 0} flight touch${Number(selected.count) === 1 ? "" : "es"} · ${selected.country || "Global"}`
                  : `${selected.count || 0} time${Number(selected.count) === 1 ? "" : "s"} flown`}
              </p>
            </div>
            <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors">
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
