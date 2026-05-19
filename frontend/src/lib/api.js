import axios from "axios";
import { AIRLINES, AIRPORTS } from "@/data/airports";
import {
  cities,
  cityStays,
  confirmSegment,
  createManualFlight,
  dashboard,
  deleteAllLocalData,
  deleteArtifact,
  deleteFlight,
  deleteSegment,
  endLocalSession,
  exportLedger,
  getLocalProfile,
  importLedger,
  ingestBarcode,
  ingestPdf,
  listArtifacts,
  listFlights,
  listPendingSegments,
  listSegments,
  localUser,
  lookupLocalFlight,
  mapData,
  recomputeAnalytics,
  searchLocalFlights,
  trips,
  updateLocalProfile,
  updateSegment,
  wrapped,
} from "@/lib/localLedger";

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || "http://localhost:8001").replace(/\/$/, "");
export const API_BASE = `${BACKEND_URL}/api`;
const LOCAL_FIRST = process.env.REACT_APP_LOCAL_FIRST !== "false";

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("tl_session_token") : null;
  if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function asResponse(config, data, status = 200) {
  return { data, status, statusText: "OK", headers: {}, config };
}

function payload(config) {
  if (!config.data) return {};
  if (typeof config.data === "string") {
    try { return JSON.parse(config.data); } catch { return {}; }
  }
  return config.data;
}

async function localEndpoint(config) {
  if (!LOCAL_FIRST || typeof window === "undefined") return null;
  const path = (config.url || "").replace(config.baseURL || "", "").split("?")[0];
  const method = (config.method || "get").toLowerCase();
  const params = config.params || {};
  const year = Number(params.year || new Date().getFullYear());

  if (path === "/auth/me" && method === "get") {
    return asResponse(config, { user: localUser(), profile: await getLocalProfile() });
  }
  if (path === "/auth/logout" && method === "post") {
    endLocalSession();
    return asResponse(config, { ok: true });
  }
  if (path === "/profile" && method === "patch") {
    return asResponse(config, await updateLocalProfile(payload(config)));
  }

  if (path === "/airports" && method === "get") {
    const q = String(params.q || "").toUpperCase();
    const priority = ["BLR", "DEL", "BOM", "HYD", "MAA", "CCU", "GOI", "GOX", "DXB", "SIN", "LHR"];
    const score = (a) => {
      let s = 0;
      const city = String(a.city || "").toUpperCase();
      const name = String(a.name || "").toUpperCase();
      const icao = String(a.icao || "").toUpperCase();
      const keywords = String(a.keywords || "").toUpperCase();
      if (a.country === "IN") s += 40;
      if (a.scheduled_service) s += 20;
      if (a.iata === q) s += 100;
      else if (String(a.iata || "").startsWith(q)) s += 70;
      if (icao === q) s += 80;
      if (city.startsWith(q)) s += 45;
      if (name.startsWith(q)) s += 30;
      if (keywords.includes(q)) s += 10;
      const p = priority.indexOf(a.iata);
      if (p >= 0) s += 20 - p;
      return s;
    };
    const rows = Object.values(AIRPORTS)
      .filter((a) => !q || String(a.iata || "").includes(q) || String(a.icao || "").includes(q) || String(a.city || "").toUpperCase().includes(q) || String(a.name || "").toUpperCase().includes(q) || String(a.keywords || "").toUpperCase().includes(q))
      .sort((a, b) => score(b) - score(a) || String(a.iata).localeCompare(String(b.iata)))
      .slice(0, params.limit || 8);
    return asResponse(config, rows);
  }
  if (path === "/airlines" && method === "get") {
    const q = String(params.q || "").toUpperCase();
    const rows = Object.entries(AIRLINES)
      .map(([iata, name]) => ({ iata, name }))
      .filter((a) => !q || a.iata.includes(q) || a.name.toUpperCase().includes(q))
      .slice(0, params.limit || 8);
    return asResponse(config, rows);
  }

  if (path === "/flights" && method === "get") return asResponse(config, await listFlights());
  if (path.match(/^\/flights\/[^/]+$/) && method === "delete") {
    await deleteFlight(path.split("/").pop());
    return asResponse(config, { ok: true });
  }
  if (path === "/trips" && method === "get") return asResponse(config, await trips(year));
  if (path === "/city-stays" && method === "get") return asResponse(config, await cityStays(year));
  if (path === "/artifacts" && method === "get") return asResponse(config, await listArtifacts());
  if (path.match(/^\/artifacts\/[^/]+$/) && method === "delete") {
    await deleteArtifact(path.split("/").pop());
    return asResponse(config, { ok: true });
  }
  if (path === "/segments/pending" && method === "get") return asResponse(config, await listPendingSegments());
  if (path.match(/^\/segments\/[^/]+$/) && method === "get") {
    const id = path.split("/").pop();
    const found = (await listSegments()).find((s) => s.id === id);
    if (!found) return Promise.reject({ response: { status: 404, data: { detail: "Segment not found" } }, config });
    return asResponse(config, found);
  }
  if (path.match(/^\/segments\/[^/]+$/) && method === "patch") {
    return asResponse(config, await updateSegment(path.split("/").pop(), payload(config)));
  }
  if (path.match(/^\/segments\/[^/]+$/) && method === "delete") {
    await deleteSegment(path.split("/").pop());
    return asResponse(config, { ok: true });
  }
  if (path.match(/^\/segments\/[^/]+\/confirm$/) && method === "post") {
    return asResponse(config, await confirmSegment(path.split("/")[2]));
  }

  if (path === "/monthly-stats" && method === "get") return asResponse(config, (await dashboard(year)).monthly_series || []);
  if (path === "/dashboard" && method === "get") return asResponse(config, await dashboard(year));
  if (path === "/cities" && method === "get") return asResponse(config, await cities(year));
  if (path === "/wrapped" && method === "get") return asResponse(config, await wrapped(year));
  if (path === "/map-data" && method === "get") return asResponse(config, await mapData(year));
  if (path === "/recompute" && method === "post") return asResponse(config, await recomputeAnalytics(year));

  if (path === "/boarding-pass/ingest" && method === "post") return asResponse(config, await ingestBarcode(payload(config)));
  if (path === "/pdf/upload" && method === "post") return asResponse(config, await ingestPdf(config.data));
  if (path === "/flights/manual" && method === "post") return asResponse(config, await createManualFlight(payload(config)));
  if (path === "/flights/search" && method === "get") return asResponse(config, searchLocalFlights(params));
  if (path === "/flights/lookup" && method === "get") {
    return asResponse(config, lookupLocalFlight(params));
  }
  if (path === "/local/export" && method === "get") return asResponse(config, await exportLedger());
  if (path === "/local/import" && method === "post") {
    await importLedger(payload(config));
    return asResponse(config, { ok: true });
  }
  if (path === "/local/delete-all" && method === "post") {
    await deleteAllLocalData();
    return asResponse(config, { ok: true });
  }

  return null;
}

const realAdapter = axios.getAdapter(axios.defaults.adapter);
api.defaults.adapter = async (config) => {
  const local = await localEndpoint(config);
  return local || realAdapter(config);
};
