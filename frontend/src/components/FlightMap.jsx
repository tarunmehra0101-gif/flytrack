import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * Lightweight Leaflet map for route visualization.
 * Shows flight routes as arcs between airports.
 */
export default function FlightMap({ routes = [], markers = [], className = "", interactive = true, zoom = 2 }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Destroy previous instance
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapRef.current, {
      zoomControl: interactive,
      scrollWheelZoom: interactive,
      dragging: interactive,
      touchZoom: interactive,
      doubleClickZoom: interactive,
      attributionControl: false,
    }).setView([20, 10], zoom);

    // Dark-themed tile layer (CartoDB Dark Matter)
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 18,
    }).addTo(map);

    // Add airport markers
    markers.forEach((m) => {
      if (!m.lat || !m.lng) return;
      const color = m.is_home ? "#10b981" : "#38bdf8";
      const radius = Math.max(4, Math.min(10, 3 + (m.count || 1)));
      L.circleMarker([m.lat, m.lng], {
        radius,
        fillColor: color,
        fillOpacity: 0.8,
        color: color,
        weight: 1,
        opacity: 0.6,
      })
        .bindTooltip(`${m.city || m.iata} · ${m.count || 0} flights`, {
          className: "flight-map-tooltip",
        })
        .addTo(map);
    });

    // Add route arcs
    const ARC_COLORS = ["#10b981", "#38bdf8", "#f59e0b", "#a855f7", "#ef4444", "#f472b6"];
    routes.forEach((route, i) => {
      if (!route.from?.lat || !route.to?.lat) return;
      const from = [route.from.lat, route.from.lng];
      const to = [route.to.lat, route.to.lng];

      // Create a curved line (great circle approximation)
      const midLat = (from[0] + to[0]) / 2;
      const midLng = (from[1] + to[1]) / 2;
      const offset = Math.abs(from[0] - to[0]) * 0.3 + Math.abs(from[1] - to[1]) * 0.1;
      const control = [midLat + offset, midLng];

      // Simple bezier curve points
      const points = [];
      for (let t = 0; t <= 1; t += 0.05) {
        const lat = (1 - t) * (1 - t) * from[0] + 2 * (1 - t) * t * control[0] + t * t * to[0];
        const lng = (1 - t) * (1 - t) * from[1] + 2 * (1 - t) * t * control[1] + t * t * to[1];
        points.push([lat, lng]);
      }

      L.polyline(points, {
        color: ARC_COLORS[i % ARC_COLORS.length],
        weight: Math.max(1.5, Math.min(3, (route.count || 1) * 0.8)),
        opacity: 0.6,
        dashArray: null,
      }).addTo(map);
    });

    // Fit bounds to markers if available
    if (markers.length > 1) {
      const validMarkers = markers.filter((m) => m.lat && m.lng);
      if (validMarkers.length > 1) {
        const bounds = L.latLngBounds(validMarkers.map((m) => [m.lat, m.lng]));
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 6 });
      }
    }

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [routes, markers, interactive, zoom]);

  return <div ref={mapRef} className={`w-full ${className}`} style={{ minHeight: 200 }} />;
}
