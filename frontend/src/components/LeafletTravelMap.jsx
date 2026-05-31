import React, { useEffect, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

/** Fixes Leaflet tile rendering issues inside flex/grid wrappers */
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setTimeout(() => {
        map.invalidateSize();
      }, 300);
    });
    return () => cancelAnimationFrame(raf);
  }, [map]);
  return null;
}

function MapBounds({ airports }) {
  const map = useMap();
  
  useEffect(() => {
    if (airports && airports.length > 0) {
      if (airports.length === 1) {
        map.setView([airports[0].lat, airports[0].lng], 5, { animate: true });
      } else {
        const bounds = L.latLngBounds(airports.map(a => [a.lat, a.lng]));
        map.fitBounds(bounds, { 
          padding: [50, 50],
          maxZoom: 6,
          animate: true
        });
      }
    }
  }, [airports, map]);
  
  return null;
}

function LeafletControls({ mapStyle, setMapStyle }) {
  const map = useMap();
  return (
    <>
      <div className="absolute right-4 top-[130px] z-[1000] flex flex-col gap-2 bg-black/55 backdrop-blur-md rounded-xl p-1.5 border border-white/15 pointer-events-auto shadow-lg">
        <button 
          className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center font-bold text-lg transition-all" 
          onClick={() => map.zoomIn()}
        >
          +
        </button>
        <button 
          className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center font-bold text-lg transition-all" 
          onClick={() => map.zoomOut()}
        >
          -
        </button>
      </div>

      <div className="absolute right-4 top-[220px] z-[1000] pointer-events-auto">
        <button 
          onClick={() => setMapStyle(prev => prev === 'dark' ? 'light' : 'dark')}
          className="px-3 py-2 rounded-xl bg-black/55 hover:bg-black/75 border border-white/15 text-white backdrop-blur-md flex items-center gap-1.5 shadow-lg text-[10px] font-bold uppercase tracking-wider transition-all"
        >
          {mapStyle === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>
      </div>
    </>
  );
}

export default function LeafletTravelMap({ mapData, selectedYear, onSelectRoute, onSelectAirport }) {
  const [mapStyle, setMapStyle] = React.useState('dark');

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

  const handleRouteClick = useCallback((route) => {
    if (onSelectRoute) onSelectRoute(route);
  }, [onSelectRoute]);

  const handleAirportClick = useCallback((airport) => {
    if (onSelectAirport) onSelectAirport(airport);
  }, [onSelectAirport]);

  return (
    <div className="w-full h-full relative overflow-hidden rounded-xl bg-black" data-testid="leaflet-container">
      <MapContainer 
        center={[20, 0]} 
        zoom={2} 
        style={{ height: '100%', width: '100%', zIndex: 1 }}
        scrollWheelZoom={true}
        zoomControl={false}
        attributionControl={false}
      >
        {/* Fix tile rendering in flex/grid wrappers */}
        <MapResizer />

        {mapStyle === 'dark' ? (
          <TileLayer
            attribution='&copy; OSM, CARTO'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
        ) : (
          <TileLayer
            attribution='&copy; OSM, CARTO'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
        )}
        
        <MapBounds airports={airports} />
        <LeafletControls mapStyle={mapStyle} setMapStyle={setMapStyle} />

        {/* Flight Routes */}
        {routes.map((r, i) => (
          <Polyline
            key={`route-${i}`}
            positions={[
              [r.from.lat, r.from.lng],
              [r.to.lat, r.to.lng]
            ]}
            pathOptions={{ 
              color: '#3b9eff', 
              weight: Math.max(2, Math.min(6, (r.count || 1) * 1.2)), 
              opacity: 0.75,
              dashArray: '8, 8',
              className: 'leaflet-flight-path'
            }}
            eventHandlers={{
              click: () => handleRouteClick(r),
            }}
          >
            <Popup className="tl-leaflet-popup">
              <div className="flex flex-col items-center text-center p-1 min-w-[120px]">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Route</p>
                <div className="flex items-center gap-2 font-bold text-base my-1 text-gray-800">
                  <span>{r.from.iata}</span>
                  <span className="text-gray-400">➔</span>
                  <span>{r.to.iata}</span>
                </div>
                <div className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium border border-blue-100">
                  {r.count} flight{r.count !== 1 ? 's' : ''} in {selectedYear}
                </div>
              </div>
            </Popup>
          </Polyline>
        ))}

        {/* Airports — Circle Markers */}
        {airports.map((a, i) => (
          <CircleMarker 
            key={`airport-${i}`} 
            center={[a.lat, a.lng]}
            radius={Math.min(10, Math.max(5, (a.count || 1) * 1.5))}
            pathOptions={{
              color: '#ffffff',
              weight: 2,
              fillColor: a.is_home ? '#3ad389' : '#3b9eff',
              fillOpacity: 0.9,
            }}
            eventHandlers={{
              click: () => handleAirportClick(a),
            }}
          >
            <Popup className="tl-leaflet-popup">
              <div className="flex flex-col gap-1 p-1 min-w-[140px]">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-bold text-lg text-gray-800">{a.iata}</span>
                  {a.is_home && (
                    <span className="text-[9px] uppercase tracking-wider bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold border border-emerald-100">
                      Home
                    </span>
                  )}
                </div>
                <span className="text-sm font-medium text-gray-600 border-b border-gray-100 pb-1 mb-1">
                  {a.city}, {a.country}
                </span>
                <span className="text-xs font-semibold text-gray-500">
                  {a.count} visit{a.count !== 1 ? 's' : ''} in {selectedYear}
                </span>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

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
        @keyframes leaflet-dash {
          to {
            stroke-dashoffset: -40;
          }
        }
        .leaflet-flight-path {
          stroke-dasharray: 8, 8;
          animation: leaflet-dash 1.5s linear infinite;
        }
      `}} />
    </div>
  );
}
