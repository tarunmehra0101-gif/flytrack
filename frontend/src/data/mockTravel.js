import { AIRLINES, AIRPORTS } from "@/data/airports";

export const MOCK_DATA_YEAR = 2026;

const routes = [
  ["BLR", "DEL", "AI", "AI505", "2026-01-08T03:30:00+00:00", "2026-01-08T06:05:00+00:00"],
  ["DEL", "BLR", "AI", "AI506", "2026-01-11T14:40:00+00:00", "2026-01-11T17:15:00+00:00"],
  ["BLR", "BOM", "6E", "6E5291", "2026-02-03T02:55:00+00:00", "2026-02-03T04:35:00+00:00"],
  ["BOM", "BLR", "6E", "6E5292", "2026-02-06T15:10:00+00:00", "2026-02-06T16:55:00+00:00"],
  ["BLR", "GOI", "I5", "I51732", "2026-03-14T04:20:00+00:00", "2026-03-14T05:35:00+00:00"],
  ["GOI", "BLR", "I5", "I51733", "2026-03-17T12:25:00+00:00", "2026-03-17T13:45:00+00:00"],
  ["BLR", "DXB", "EK", "EK567", "2026-04-02T04:00:00+00:00", "2026-04-02T08:05:00+00:00"],
  ["DXB", "LHR", "EK", "EK29", "2026-04-04T06:10:00+00:00", "2026-04-04T13:15:00+00:00"],
  ["LHR", "DXB", "EK", "EK30", "2026-04-09T15:30:00+00:00", "2026-04-09T22:35:00+00:00"],
  ["DXB", "BLR", "EK", "EK568", "2026-04-10T01:05:00+00:00", "2026-04-10T05:05:00+00:00"],
  ["BLR", "SIN", "SQ", "SQ511", "2026-05-02T18:40:00+00:00", "2026-05-03T02:55:00+00:00"],
  ["SIN", "BLR", "SQ", "SQ510", "2026-05-06T04:30:00+00:00", "2026-05-06T12:50:00+00:00"],
  ["BLR", "HYD", "6E", "6E6067", "2026-06-18T01:40:00+00:00", "2026-06-18T02:55:00+00:00"],
  ["HYD", "DEL", "AI", "AI541", "2026-06-20T05:10:00+00:00", "2026-06-20T07:20:00+00:00"],
  ["DEL", "BLR", "AI", "AI807", "2026-06-23T11:15:00+00:00", "2026-06-23T13:55:00+00:00"],
];

function minutes(a, b) {
  return Math.max(0, Math.round((new Date(b) - new Date(a)) / 60000));
}

function flight(route, idx) {
  const [from, to, airline, number, dep, arr] = route;
  const depAirport = AIRPORTS[from] || {};
  const arrAirport = AIRPORTS[to] || {};
  return {
    id: `mock_flight_${idx + 1}`,
    source_parsed_segment_id: `mock_segment_${idx + 1}`,
    status: "confirmed",
    airline_iata: airline,
    airline_name: AIRLINES[airline] || airline,
    flight_number: number,
    booking_reference: `RYO${String(240 + idx)}`,
    departure_airport_iata: from,
    arrival_airport_iata: to,
    departure_city_name: depAirport.city || from,
    arrival_city_name: arrAirport.city || to,
    departure_country_code: depAirport.country,
    arrival_country_code: arrAirport.country,
    departure_lat: depAirport.lat,
    departure_lng: depAirport.lng,
    arrival_lat: arrAirport.lat,
    arrival_lng: arrAirport.lng,
    departure_time_utc: dep,
    arrival_time_utc: arr,
    flight_date: dep.slice(0, 10),
    flight_duration_minutes: minutes(dep, arr),
    aircraft_type: ["A320neo", "A321", "Boeing 777-300ER", "A350-900", "Boeing 787-9"][idx % 5],
    cabin_class: idx % 4 === 0 ? "Business" : "Economy",
    duration_source: "scheduled",
    time_confidence: "scheduled",
    seat_number: ["12A", "3F", "18C", "7A", "22F"][idx % 5],
    terminal_departure: idx % 3 === 0 ? "2" : "1",
    terminal_arrival: idx % 4 === 0 ? "3" : "1",
    gate: `${String.fromCharCode(65 + (idx % 6))}${10 + idx}`,
    route: `${from}-${to}`,
  };
}

export const MOCK_FLIGHTS = routes.map(flight);

function buildWindows(flights = MOCK_FLIGHTS, home = "BLR") {
  const sorted = [...flights].sort((a, b) => new Date(a.departure_time_utc) - new Date(b.departure_time_utc));
  const windows = [];
  sorted.forEach((f, idx) => {
    windows.push({
      id: `mock_air_${idx}`,
      type: "flight",
      route: f.route,
      segment_id: f.id,
      start_time_utc: f.departure_time_utc,
      end_time_utc: f.arrival_time_utc,
      duration_minutes: f.flight_duration_minutes,
      estimated: false,
    });
    const next = sorted[idx + 1];
    if (!next) return;
    const gap = minutes(f.arrival_time_utc, next.departure_time_utc);
    if (gap <= 0) return;
    const city = f.arrival_city_name;
    const isHome = f.arrival_airport_iata === home;
    windows.push({
      id: `mock_stay_${idx}`,
      type: gap <= 720 ? "airport" : (isHome ? "home" : "city"),
      airport_iata: f.arrival_airport_iata,
      city_name: city,
      country_code: f.arrival_country_code,
      is_home: isHome,
      start_time_utc: f.arrival_time_utc,
      end_time_utc: next.departure_time_utc,
      duration_minutes: gap,
      estimated: gap <= 720,
      layover: gap <= 720,
    });
  });
  return windows;
}

export function mockPresenceWindows(profile = {}) {
  return buildWindows(MOCK_FLIGHTS, profile.home_airport_iata || "BLR");
}

export function mockDashboard(profile = {}) {
  const windows = mockPresenceWindows(profile);
  const air = MOCK_FLIGHTS.reduce((s, f) => s + f.flight_duration_minutes, 0);
  const home = windows.filter((w) => w.is_home && w.type === "home").reduce((s, w) => s + w.duration_minutes, 0);
  const away = windows.filter((w) => !w.is_home && w.type === "city").reduce((s, w) => s + w.duration_minutes, 0);
  const cityMinutes = {};
  windows.filter((w) => w.type === "city").forEach((w) => { cityMinutes[w.city_name] = (cityMinutes[w.city_name] || 0) + w.duration_minutes; });
  const monthly = {};
  MOCK_FLIGHTS.forEach((f) => {
    const key = f.departure_time_utc.slice(0, 7);
    monthly[key] = monthly[key] || { month: key, flights: 0, air_minutes: 0 };
    monthly[key].flights += 1;
    monthly[key].air_minutes += f.flight_duration_minutes;
  });
  return {
    total_flights: MOCK_FLIGHTS.length,
    total_air_minutes: air,
    total_air_hours: Math.round((air / 60) * 10) / 10,
    home_minutes: home,
    home_days: Math.round((home / 60 / 24) * 10) / 10,
    away_minutes: away,
    away_days: Math.round((away / 60 / 24) * 10) / 10,
    cities_visited: Object.keys(cityMinutes).length,
    top_route: "BLR-DEL",
    top_route_count: 2,
    top_airline: "AI",
    top_airline_name: "Air India",
    monthly_series: Object.values(monthly),
    top_cities: Object.entries(cityMinutes).sort((a, b) => b[1] - a[1]).map(([city, mins]) => ({ city, minutes: mins, days: Math.round((mins / 60 / 24) * 10) / 10 })).slice(0, 5),
    route_frequency: [{ route: "BLR-DEL", count: 2 }, { route: "BLR-DXB", count: 1 }, { route: "DXB-LHR", count: 1 }],
    airline_split: [{ airline: "AI", name: "Air India", count: 5 }, { airline: "EK", name: "Emirates", count: 4 }, { airline: "6E", name: "IndiGo", count: 3 }],
    airport_minutes: 4560,
    airport_hours: 76,
    next_trip: {
      route: "BLR-LHR",
      departure_time_utc: "2026-07-05T04:00:00+00:00",
      days_until: 28,
    },
    insights: [
      "You spent the most time in London this year.",
      "Your busiest month was April with 4 international legs.",
      "Delhi is your most repeated destination from Bengaluru.",
      "You spent roughly 76h in airports this year.",
      "Your longest away streak was the 8-day Dubai and London run.",
    ],
    home_airport_iata: profile.home_airport_iata || "BLR",
  };
}

export function mockTrips() {
  return [
    { id: "mock_trip_del", trip_name: "Bengaluru -> Delhi -> Bengaluru", start_time_utc: routes[0][4], end_time_utc: routes[1][5], returned_home: true, total_segments: 2, total_air_minutes: MOCK_FLIGHTS[0].flight_duration_minutes + MOCK_FLIGHTS[1].flight_duration_minutes, segments: MOCK_FLIGHTS.slice(0, 2) },
    { id: "mock_trip_bom", trip_name: "Bengaluru -> Mumbai -> Bengaluru", start_time_utc: routes[2][4], end_time_utc: routes[3][5], returned_home: true, total_segments: 2, total_air_minutes: MOCK_FLIGHTS[2].flight_duration_minutes + MOCK_FLIGHTS[3].flight_duration_minutes, segments: MOCK_FLIGHTS.slice(2, 4) },
    { id: "mock_trip_europe", trip_name: "Bengaluru -> Dubai -> London -> Bengaluru", start_time_utc: routes[6][4], end_time_utc: routes[9][5], returned_home: true, total_segments: 4, total_air_minutes: MOCK_FLIGHTS.slice(6, 10).reduce((s, f) => s + f.flight_duration_minutes, 0), segments: MOCK_FLIGHTS.slice(6, 10) },
  ];
}

export function mockCities(profile = {}) {
  const dashboard = mockDashboard(profile);
  const counts = {};
  MOCK_FLIGHTS.forEach((f) => {
    [f.departure_airport_iata, f.arrival_airport_iata].forEach((iata) => {
      const a = AIRPORTS[iata] || {};
      counts[iata] = counts[iata] || { iata, city: a.city, country: a.country, lat: a.lat, lng: a.lng, flights_in: 0, flights_out: 0, minutes_spent: 0, visits: 0, connected_to: new Set(), is_home: iata === (profile.home_airport_iata || "BLR") };
    });
    counts[f.departure_airport_iata].flights_out += 1;
    counts[f.departure_airport_iata].connected_to.add(f.arrival_airport_iata);
    counts[f.arrival_airport_iata].flights_in += 1;
    counts[f.arrival_airport_iata].connected_to.add(f.departure_airport_iata);
  });
  dashboard.top_cities.forEach((c) => {
    const found = Object.values(counts).find((x) => x.city === c.city);
    if (found) {
      found.minutes_spent = c.minutes;
      found.days_spent = c.days;
      found.visits = Math.max(1, found.flights_in);
    }
  });
  const rows = Object.values(counts).map((c) => ({ ...c, connected_to: [...c.connected_to], days_spent: c.days_spent || 0, both_legs: c.flights_in > 0 && c.flights_out > 0, incomplete: false }));
  return { window: "all", home_airport_iata: profile.home_airport_iata || "BLR", cities: rows.sort((a, b) => (b.minutes_spent || 0) - (a.minutes_spent || 0)) };
}

export function mockMapData(profile = {}) {
  const cityData = mockCities(profile).cities;
  const routes = {};
  MOCK_FLIGHTS.forEach((f) => {
    routes[f.route] = routes[f.route] || { route: f.route, count: 0, from: AIRPORTS[f.departure_airport_iata], to: AIRPORTS[f.arrival_airport_iata] };
    routes[f.route].count += 1;
  });
  return {
    total_flights: MOCK_FLIGHTS.length,
    airport_markers: cityData.map((c) => ({ iata: c.iata, city: c.city, country: c.country, lat: c.lat, lng: c.lng, count: c.flights_in + c.flights_out, is_home: c.is_home })),
    routes: Object.values(routes),
  };
}

export function mockWrapped(profile = {}, year = new Date().getFullYear()) {
  if (Number(year) !== MOCK_DATA_YEAR) {
    return {
      year,
      total_flights: 0,
      total_air_hours: 0,
      airport_hours: 0,
      home_days: 0,
      away_days: 0,
      travel_personality: "Grounded",
      wrapped_cards: [],
      milestones: [],
      presence_windows: [],
      map: { total_flights: 0, airport_markers: [], routes: [] },
    };
  }
  const dashboard = mockDashboard(profile);
  const windows = mockPresenceWindows(profile);
  const airportMinutes = windows.filter((w) => w.type === "airport").reduce((s, w) => s + w.duration_minutes, 0);
  return {
    year,
    ...dashboard,
    airport_minutes: airportMinutes,
    airport_hours: dashboard.airport_hours,
    countries: [{ country: "IN", count: 10 }, { country: "AE", count: 4 }, { country: "GB", count: 2 }, { country: "SG", count: 2 }],
    airports: mockMapData(profile).airport_markers.map((a) => ({ iata: a.iata, count: a.count })),
    longest_flight: MOCK_FLIGHTS.find((f) => f.route === "DXB-LHR"),
    monthly_rhythm: dashboard.monthly_series,
    travel_personality: "Hub Hopper",
    top_airport: "BLR",
    carbon_kg: 2860,
    milestones: ["15 flights logged", "9 airports touched", "4 countries visited", "London was your longest stay", "BLR was your most-used airport"],
    presence_windows: windows,
    wrapped_cards: [
      { kind: "hero", title: `Your ${year} in motion`, value: "15 flights" },
      { kind: "air", title: "Time above the clouds", value: `${dashboard.total_air_hours} hours` },
      { kind: "route", title: "Most repeated route", value: "BLR-DEL", detail: "2 flights" },
      { kind: "city", title: "Longest stay", value: "London", detail: "5.1 days" },
    ],
    map: mockMapData(profile),
  };
}
