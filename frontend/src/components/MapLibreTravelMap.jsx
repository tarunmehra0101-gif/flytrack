import React, { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

function routeFeature(route) {
  if (!route?.from || !route?.to) return null;
  return {
    type: "Feature",
    properties: {
      route: route.route,
      count: route.count || 1,
      from: route.from?.iata,
      to: route.to?.iata,
    },
    geometry: {
      type: "LineString",
      coordinates: [
        [route.from.lng, route.from.lat],
        [route.to.lng, route.to.lat],
      ],
    },
  };
}

function airportFeature(airport) {
  if (airport?.lat == null || airport?.lng == null) return null;
  return {
    type: "Feature",
    properties: {
      iata: airport.iata,
      city: airport.city,
      country: airport.country,
      count: airport.count || 0,
      is_home: Boolean(airport.is_home),
    },
    geometry: {
      type: "Point",
      coordinates: [airport.lng, airport.lat],
    },
  };
}

export default function MapLibreTravelMap({ mapData, selectedYear }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [selected, setSelected] = useState(null);

  const geojson = useMemo(() => ({
    airports: {
      type: "FeatureCollection",
      features: (mapData?.airport_markers || []).map(airportFeature).filter(Boolean),
    },
    routes: {
      type: "FeatureCollection",
      features: (mapData?.routes || []).map(routeFeature).filter(Boolean),
    },
  }), [mapData]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: process.env.REACT_APP_MAPLIBRE_STYLE_URL || "https://demotiles.maplibre.org/style.json",
      center: [78.9629, 22.5937],
      zoom: 2.8,
      attributionControl: false,
    });
    mapRef.current.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    mapRef.current.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    mapRef.current.on("load", () => {
      const map = mapRef.current;
      map.addSource("ryoko-routes", { type: "geojson", data: geojson.routes });
      map.addSource("ryoko-airports", { type: "geojson", data: geojson.airports });
      map.addLayer({
        id: "ryoko-routes-glow",
        type: "line",
        source: "ryoko-routes",
        paint: {
          "line-color": "#10b981",
          "line-width": ["interpolate", ["linear"], ["get", "count"], 1, 4, 6, 12],
          "line-opacity": 0.22,
          "line-blur": 4,
        },
      });
      map.addLayer({
        id: "ryoko-routes",
        type: "line",
        source: "ryoko-routes",
        paint: {
          "line-color": "#67e8f9",
          "line-width": ["interpolate", ["linear"], ["get", "count"], 1, 1.4, 6, 4],
          "line-opacity": 0.82,
        },
      });
      map.addLayer({
        id: "ryoko-airports",
        type: "circle",
        source: "ryoko-airports",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["get", "count"], 1, 5, 8, 12],
          "circle-color": ["case", ["get", "is_home"], "#10b981", "#38bdf8"],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1,
          "circle-opacity": 0.92,
        },
      });
      map.on("click", "ryoko-airports", (event) => {
        const feature = event.features?.[0];
        if (!feature) return;
        setSelected({ type: "airport", ...feature.properties });
      });
      map.on("click", "ryoko-routes", (event) => {
        const feature = event.features?.[0];
        if (!feature) return;
        setSelected({ type: "route", ...feature.properties });
      });
      ["ryoko-airports", "ryoko-routes"].forEach((layer) => {
        map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
      });
    });
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // Initialize once; sources update in the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const update = () => {
      map.getSource("ryoko-routes")?.setData(geojson.routes);
      map.getSource("ryoko-airports")?.setData(geojson.airports);
      const features = geojson.airports.features;
      if (features.length) {
        const bounds = new maplibregl.LngLatBounds();
        features.forEach((feature) => bounds.extend(feature.geometry.coordinates));
        map.fitBounds(bounds, { padding: 42, maxZoom: 4.4, duration: 700 });
      }
    };
    if (map.loaded()) update();
    else map.once("load", update);
  }, [geojson]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="absolute inset-0" data-testid="maplibre-map" />
      {selected && (
        <div className="absolute left-3 right-3 bottom-20 z-20 tl-card tl-card-intense p-4 bg-black/78 border-white/15 text-white backdrop-blur-md">
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
                  ? `${selected.count} flight touch${Number(selected.count) === 1 ? "" : "es"} · ${selected.country || "Global"}`
                  : `${selected.count} time${Number(selected.count) === 1 ? "" : "s"} flown · tap route in Timeline for exact flights`}
              </p>
            </div>
            <button onClick={() => setSelected(null)} className="text-xs text-white/60 hover:text-white">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
