import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const homeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const defaultIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapBounds({ airports }) {
  const map = useMap();
  
  useEffect(() => {
    if (airports && airports.length > 0) {
      if (airports.length === 1) {
        // If only 1 airport, just set view to it, don't try to fit bounds
        map.setView([airports[0].lat, airports[0].lng], 5, { animate: true });
      } else {
        // Create a bounding box around all airports
        const bounds = L.latLngBounds(airports.map(a => [a.lat, a.lng]));
        
        // Calculate max zoom based on bounds
        map.fitBounds(bounds, { 
          padding: [50, 50],
          maxZoom: 6, // Don't zoom in too close when there are only a few airports
          animate: true
        });
      }
    }
  }, [airports, map]);
  
  return null;
}

export default function LeafletTravelMap({ mapData, selectedYear }) {
  // Extract and filter valid coordinates
  const airports = useMemo(() => {
    return (mapData?.airport_markers || []).filter(a => a.lat != null && a.lng != null);
  }, [mapData]);

  const routes = useMemo(() => {
    return (mapData?.routes || []).filter(r => 
      r.from && r.to && 
      r.from.lat != null && r.from.lng != null && 
      r.to.lat != null && r.to.lng != null
    );
  }, [mapData]);

  return (
    <div className="w-full h-full relative overflow-hidden rounded-xl bg-slate-900" data-testid="leaflet-container">
      <MapContainer 
        center={[20, 0]} 
        zoom={2} 
        style={{ height: '100%', width: '100%', zIndex: 1 }}
        scrollWheelZoom={true}
      >
        {/* Colorful OpenStreetMap Tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Auto-fit map bounds */}
        <MapBounds airports={airports} />

        {/* Flight Routes */}
        {routes.map((r, i) => (
          <Polyline
            key={`route-${i}`}
            positions={[
              [r.from.lat, r.from.lng],
              [r.to.lat, r.to.lng]
            ]}
            pathOptions={{ 
              color: '#3b82f6', // Blue-500
              weight: Math.max(2, Math.min(6, r.count || 2)), 
              opacity: 0.6,
              dashArray: '5, 10'
            }}
          >
            <Popup className="tl-leaflet-popup">
              <div className="flex flex-col items-center text-center p-1 min-w-[120px]">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Route</p>
                <div className="flex items-center gap-2 font-bold text-base my-1 text-slate-800">
                  <span>{r.from.iata}</span>
                  <span className="text-slate-400">➔</span>
                  <span>{r.to.iata}</span>
                </div>
                <div className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  {r.count} flight{r.count !== 1 ? 's' : ''} in {selectedYear}
                </div>
              </div>
            </Popup>
          </Polyline>
        ))}

        {/* Airports */}
        {airports.map((a, i) => (
          <Marker 
            key={`airport-${i}`} 
            position={[a.lat, a.lng]}
            icon={a.is_home ? homeIcon : defaultIcon}
          >
            <Popup className="tl-leaflet-popup">
              <div className="flex flex-col gap-1 p-1 min-w-[140px]">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-bold text-lg text-slate-800">{a.iata}</span>
                  {a.is_home && (
                    <span className="text-[9px] uppercase tracking-wider bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">
                      Home
                    </span>
                  )}
                </div>
                <span className="text-sm font-medium text-slate-600 border-b border-slate-100 pb-1 mb-1">
                  {a.city}, {a.country}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {a.count} visit{a.count !== 1 ? 's' : ''} in {selectedYear}
                </span>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Global CSS for overriding Leaflet's default white popups to look slightly more modern */}
      <style dangerouslySetInnerHTML={{__html: `
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        }
        .leaflet-popup-content {
          margin: 12px;
        }
        .leaflet-container a.leaflet-popup-close-button {
          padding: 6px;
          color: #94a3b8;
        }
        .leaflet-container a.leaflet-popup-close-button:hover {
          color: #475569;
        }
      `}} />
    </div>
  );
}
