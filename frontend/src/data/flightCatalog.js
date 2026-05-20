import { AIRLINES, AIRPORTS } from "@/data/airports";

/**
 * Expanded flight catalog — covers major routes across India, Middle East,
 * SE Asia, Europe, and Americas. ~200 routes. All data is static and free.
 */
const rows = [
  // --- Air India (AI) ---
  ["AI", "505", "BLR", "DEL", 170, "Airbus A320neo", "09:50"],
  ["AI", "507", "BLR", "DEL", 165, "Airbus A321", "17:30"],
  ["AI", "642", "BLR", "BOM", 105, "Airbus A320", "06:45"],
  ["AI", "604", "BLR", "BOM", 110, "Airbus A320neo", "15:10"],
  ["AI", "392", "BLR", "SIN", 270, "Boeing 787-8", "23:20"],
  ["AI", "176", "BLR", "SFO", 960, "Boeing 777", "14:20"],
  ["AI", "101", "DEL", "BOM", 135, "Airbus A320neo", "06:00"],
  ["AI", "105", "DEL", "BOM", 130, "Airbus A321neo", "14:30"],
  ["AI", "111", "DEL", "MAA", 170, "Airbus A320neo", "08:00"],
  ["AI", "175", "DEL", "SFO", 900, "Boeing 777-200LR", "02:00"],
  ["AI", "127", "DEL", "LHR", 540, "Boeing 787-8", "20:15"],
  ["AI", "119", "DEL", "JFK", 870, "Boeing 777-300ER", "01:30"],
  ["AI", "302", "BOM", "LHR", 570, "Boeing 787-8", "02:05"],
  ["AI", "130", "DEL", "FRA", 510, "Boeing 787-8", "14:10"],
  ["AI", "173", "DEL", "SIN", 325, "Boeing 787-8", "12:55"],
  ["AI", "380", "DEL", "DXB", 230, "Boeing 787-8", "20:10"],
  ["AI", "971", "DEL", "HYD", 120, "Airbus A320neo", "07:15"],
  ["AI", "803", "DEL", "BLR", 165, "Airbus A321neo", "06:10"],
  ["AI", "440", "BOM", "SIN", 315, "Boeing 787-8", "00:40"],

  // --- IndiGo (6E) ---
  ["6E", "6021", "BLR", "DEL", 165, "Airbus A321neo", "07:10"],
  ["6E", "6813", "BLR", "BOM", 105, "Airbus A320neo", "08:05"],
  ["6E", "6168", "BLR", "HYD", 75, "Airbus A320neo", "12:55"],
  ["6E", "356", "BLR", "MAA", 65, "Airbus A320neo", "18:40"],
  ["6E", "6205", "BLR", "CCU", 150, "Airbus A321neo", "20:20"],
  ["6E", "1485", "BLR", "DXB", 245, "Airbus A320neo", "21:45"],
  ["6E", "2003", "DEL", "BOM", 130, "Airbus A321neo", "06:15"],
  ["6E", "2315", "DEL", "BLR", 165, "Airbus A321neo", "09:30"],
  ["6E", "2019", "DEL", "CCU", 145, "Airbus A321neo", "10:45"],
  ["6E", "2171", "DEL", "HYD", 125, "Airbus A320neo", "11:00"],
  ["6E", "2071", "DEL", "MAA", 170, "Airbus A321neo", "07:30"],
  ["6E", "2057", "DEL", "GOI", 165, "Airbus A320neo", "16:00"],
  ["6E", "6901", "BOM", "DEL", 130, "Airbus A321neo", "06:30"],
  ["6E", "6203", "BOM", "BLR", 100, "Airbus A320neo", "07:45"],
  ["6E", "5317", "BOM", "GOI", 65, "Airbus A320", "09:15"],
  ["6E", "2563", "BOM", "HYD", 85, "Airbus A320neo", "10:00"],
  ["6E", "1411", "DEL", "DXB", 230, "Airbus A321neo", "04:10"],
  ["6E", "1937", "BOM", "DXB", 205, "Airbus A321neo", "22:00"],
  ["6E", "1829", "DEL", "SIN", 330, "Airbus A321neo XLR", "23:55"],
  ["6E", "1771", "BOM", "BKK", 260, "Airbus A321neo", "00:15"],
  ["6E", "6191", "HYD", "BLR", 75, "Airbus A320neo", "17:30"],
  ["6E", "6355", "MAA", "DEL", 170, "Airbus A321neo", "06:00"],

  // --- Akasa Air (QP) ---
  ["QP", "1351", "BLR", "DEL", 165, "Boeing 737 MAX 8", "10:30"],
  ["QP", "1104", "BLR", "BOM", 105, "Boeing 737 MAX 8", "19:15"],
  ["QP", "1201", "DEL", "BOM", 130, "Boeing 737 MAX 8", "07:00"],
  ["QP", "1405", "DEL", "BLR", 165, "Boeing 737 MAX 8", "14:00"],
  ["QP", "1301", "BOM", "BLR", 105, "Boeing 737 MAX 8", "08:00"],

  // --- SpiceJet (SG) ---
  ["SG", "8537", "BLR", "DEL", 170, "Boeing 737", "06:20"],
  ["SG", "535", "BLR", "GOI", 75, "Boeing 737", "16:05"],
  ["SG", "8169", "DEL", "BOM", 135, "Boeing 737 MAX 8", "07:10"],
  ["SG", "8721", "DEL", "GOI", 160, "Boeing 737", "11:00"],

  // --- Vistara / Air India merged (UK) ---
  ["UK", "820", "BLR", "DEL", 165, "Airbus A320neo", "08:45"],
  ["UK", "858", "BLR", "BOM", 110, "Airbus A320neo", "19:55"],
  ["UK", "943", "DEL", "BOM", 130, "Airbus A321neo", "06:00"],
  ["UK", "981", "DEL", "BLR", 165, "Airbus A320neo", "15:30"],
  ["UK", "995", "DEL", "BOM", 135, "Boeing 787-9", "20:00"],
  ["UK", "15", "DEL", "LHR", 540, "Boeing 787-9", "03:00"],

  // --- Emirates (EK) ---
  ["EK", "565", "BLR", "DXB", 240, "Boeing 777-300ER", "10:35"],
  ["EK", "567", "BLR", "DXB", 245, "Boeing 777-300ER", "20:50"],
  ["EK", "510", "DEL", "DXB", 230, "Airbus A380", "10:00"],
  ["EK", "512", "DEL", "DXB", 225, "Boeing 777-300ER", "04:25"],
  ["EK", "500", "BOM", "DXB", 210, "Boeing 777-300ER", "04:05"],
  ["EK", "502", "BOM", "DXB", 205, "Airbus A380", "10:15"],
  ["EK", "504", "BOM", "DXB", 210, "Boeing 777-300ER", "22:55"],
  ["EK", "524", "HYD", "DXB", 235, "Boeing 777-300ER", "04:10"],
  ["EK", "528", "MAA", "DXB", 255, "Boeing 777-300ER", "10:20"],
  ["EK", "1", "DXB", "LHR", 445, "Airbus A380", "07:30"],
  ["EK", "201", "DXB", "JFK", 830, "Airbus A380", "09:00"],
  ["EK", "215", "DXB", "LAX", 960, "Airbus A380", "08:15"],
  ["EK", "404", "DXB", "SIN", 425, "Airbus A380", "09:30"],
  ["EK", "384", "DXB", "BKK", 385, "Boeing 777-300ER", "09:15"],

  // --- Etihad (EY) ---
  ["EY", "237", "BLR", "AUH", 245, "Boeing 787-9", "21:55"],
  ["EY", "202", "AUH", "DEL", 225, "Boeing 787-9", "21:30"],
  ["EY", "210", "AUH", "BOM", 200, "Airbus A350", "22:00"],
  ["EY", "19", "AUH", "LHR", 445, "Boeing 787-9", "02:05"],
  ["EY", "103", "AUH", "JFK", 840, "Boeing 787-10", "09:45"],

  // --- Qatar Airways (QR) ---
  ["QR", "573", "BLR", "DOH", 260, "Boeing 787-8", "03:50"],
  ["QR", "579", "DEL", "DOH", 255, "Boeing 787-9", "03:20"],
  ["QR", "557", "BOM", "DOH", 225, "Airbus A350-900", "03:05"],
  ["QR", "1", "DOH", "LHR", 420, "Airbus A350-1000", "07:00"],
  ["QR", "701", "DOH", "JFK", 780, "Boeing 777-300ER", "08:10"],

  // --- Singapore Airlines (SQ) ---
  ["SQ", "509", "BLR", "SIN", 275, "Airbus A350-900", "11:35"],
  ["SQ", "511", "BLR", "SIN", 270, "Boeing 787-10", "23:05"],
  ["SQ", "401", "DEL", "SIN", 325, "Airbus A350-900", "12:35"],
  ["SQ", "424", "BOM", "SIN", 315, "Boeing 787-10", "00:45"],
  ["SQ", "22", "SIN", "SFO", 930, "Airbus A350-900ULR", "23:35"],
  ["SQ", "318", "SIN", "LHR", 780, "Airbus A380", "09:20"],
  ["SQ", "26", "SIN", "JFK", 1080, "Airbus A350-900ULR", "23:45"],
  ["SQ", "608", "SIN", "NRT", 420, "Airbus A350-900", "08:00"],

  // --- British Airways (BA) ---
  ["BA", "118", "BLR", "LHR", 650, "Boeing 777-200", "07:15"],
  ["BA", "256", "DEL", "LHR", 550, "Boeing 787-9", "03:15"],
  ["BA", "138", "BOM", "LHR", 585, "Boeing 777-200ER", "02:15"],
  ["BA", "1", "LHR", "JFK", 465, "Boeing 777-300ER", "09:00"],
  ["BA", "283", "LHR", "SFO", 640, "Boeing 787-9", "12:35"],

  // --- Lufthansa (LH) ---
  ["LH", "755", "BLR", "FRA", 610, "Airbus A350-900", "03:00"],
  ["LH", "761", "DEL", "FRA", 490, "Airbus A350-900", "03:30"],
  ["LH", "763", "DEL", "MUC", 490, "Airbus A350-900", "04:00"],
  ["LH", "401", "FRA", "JFK", 520, "Boeing 747-8", "10:20"],

  // --- Air France (AF) ---
  ["AF", "203", "BLR", "CDG", 635, "Airbus A350-900", "01:45"],
  ["AF", "226", "DEL", "CDG", 510, "Boeing 777-300ER", "02:30"],
  ["AF", "1", "CDG", "JFK", 500, "Boeing 777-300ER", "10:00"],

  // --- KLM (KL) ---
  ["KL", "880", "BLR", "AMS", 620, "Boeing 787-9", "02:30"],
  ["KL", "872", "DEL", "AMS", 510, "Boeing 787-9", "04:00"],

  // --- Cathay Pacific (CX) ---
  ["CX", "624", "BLR", "HKG", 335, "Airbus A330", "01:25"],
  ["CX", "694", "DEL", "HKG", 340, "Airbus A330-300", "01:00"],
  ["CX", "880", "HKG", "SFO", 700, "Boeing 777-300ER", "00:15"],

  // --- Thai Airways (TG) ---
  ["TG", "326", "BLR", "BKK", 220, "Airbus A350", "00:30"],
  ["TG", "316", "DEL", "BKK", 240, "Boeing 787-8", "09:35"],

  // --- Turkish Airlines (TK) ---
  ["TK", "719", "DEL", "IST", 400, "Boeing 787-9", "17:30"],
  ["TK", "717", "BOM", "IST", 410, "Airbus A330-300", "02:00"],
  ["TK", "1", "IST", "LHR", 235, "Airbus A350-900", "08:40"],
  ["TK", "77", "IST", "JFK", 630, "Boeing 777-300ER", "10:30"],

  // --- Japan Airlines (JL) ---
  ["JL", "740", "DEL", "NRT", 460, "Boeing 787-8", "20:40"],
  ["JL", "3", "NRT", "SFO", 570, "Boeing 787-9", "17:15"],

  // --- ANA (NH) ---
  ["NH", "838", "DEL", "NRT", 455, "Boeing 787-9", "20:00"],

  // --- Korean Air (KE) ---
  ["KE", "474", "DEL", "ICN", 390, "Boeing 787-9", "19:05"],

  // --- Qantas (QF) ---
  ["QF", "68", "DEL", "SYD", 690, "Boeing 787-9", "20:45"],
  ["QF", "2", "SYD", "LHR", 1290, "Airbus A380", "15:15"],

  // --- SriLankan (UL) ---
  ["UL", "174", "BLR", "CMB", 100, "Airbus A320neo", "09:10"],
  ["UL", "196", "DEL", "CMB", 195, "Airbus A330-300", "13:50"],
  ["UL", "141", "BOM", "CMB", 115, "Airbus A320neo", "08:30"],

  // --- Malaysia Airlines (MH) ---
  ["MH", "171", "DEL", "KUL", 330, "Airbus A350-900", "23:45"],
  ["MH", "194", "BLR", "KUL", 260, "Airbus A330-300", "23:30"],

  // --- United (UA) ---
  ["UA", "48", "DEL", "EWR", 930, "Boeing 777-300ER", "21:30"],
  ["UA", "838", "BOM", "EWR", 950, "Boeing 787-9", "01:00"],

  // --- American (AA) ---
  ["AA", "292", "DEL", "JFK", 880, "Boeing 777-300ER", "02:30"],

  // --- Delta (DL) ---
  ["DL", "92", "BOM", "JFK", 950, "Airbus A350-900", "01:00"],

  // --- Air Asia India (I5 / IX / AK) ---
  ["I5", "712", "BLR", "DEL", 170, "Airbus A320", "06:00"],
  ["I5", "1441", "BLR", "GOI", 70, "Airbus A320", "11:00"],
  ["I5", "787", "DEL", "BOM", 135, "Airbus A320", "08:00"],

  // --- Go First (G8, discontinued but legacy data) ---
  ["G8", "361", "BLR", "DEL", 170, "Airbus A320neo", "06:30"],
  ["G8", "101", "DEL", "BOM", 135, "Airbus A320neo", "07:00"],

  // --- Domestic fillers (popular routes - Expanded India Coverage) ---
  ["AI", "9601", "HYD", "DEL", 120, "Airbus A320neo", "06:45"],
  ["6E", "6051", "HYD", "BOM", 85, "Airbus A320neo", "07:00"],
  ["6E", "2701", "CCU", "DEL", 145, "Airbus A321neo", "06:00"],
  ["6E", "2211", "CCU", "BOM", 165, "Airbus A321neo", "08:15"],
  ["AI", "9617", "GOI", "DEL", 155, "Airbus A320neo", "10:00"],
  ["6E", "685", "JAI", "BOM", 120, "Airbus A320", "06:30"],
  ["6E", "2141", "DEL", "AMD", 95, "Airbus A320neo", "07:00"],
  ["6E", "2423", "DEL", "SXR", 90, "Airbus A320neo", "06:15"],
  ["6E", "2231", "DEL", "IXL", 95, "Airbus A320neo", "06:00"],
  ["AI", "445", "BOM", "GOI", 65, "Airbus A320", "08:00"],
  ["6E", "6115", "MAA", "BLR", 55, "Airbus A320neo", "08:00"],
  ["AI", "806", "DEL", "CCU", 145, "Airbus A321neo", "12:00"],
  ["UK", "781", "DEL", "HYD", 120, "Airbus A320neo", "06:30"],
  ["UK", "835", "BOM", "DEL", 135, "Boeing 787-9", "07:00"],
  ["SG", "8143", "DEL", "JAI", 60, "Boeing 737", "07:30"],
  ["6E", "2811", "DEL", "PNQ", 130, "Airbus A320neo", "09:00"],
  ["AI", "616", "CCU", "BLR", 155, "Airbus A320neo", "14:00"],
  ["6E", "471", "BOM", "JAI", 115, "Airbus A320", "09:00"],
  
  // Extra India Routes
  ["6E", "5123", "BOM", "PNQ", 45, "Airbus A320", "10:15"],
  ["6E", "6321", "DEL", "PAT", 100, "Airbus A320neo", "05:40"],
  ["6E", "611", "DEL", "LKO", 75, "Airbus A320neo", "06:20"],
  ["6E", "7342", "BOM", "AMD", 70, "Airbus A320neo", "18:30"],
  ["AI", "863", "DEL", "BOM", 135, "Airbus A321neo", "14:00"],
  ["AI", "665", "DEL", "BLR", 165, "Airbus A320neo", "20:00"],
  ["QP", "1103", "BOM", "BLR", 105, "Boeing 737 MAX 8", "07:30"],
  ["QP", "1131", "BLR", "AMD", 120, "Boeing 737 MAX 8", "11:20"],
  ["UK", "819", "DEL", "BLR", 165, "Airbus A320neo", "20:40"],
  ["UK", "855", "BOM", "BLR", 105, "Airbus A320neo", "17:00"],
  ["6E", "6511", "HYD", "MAA", 75, "Airbus A320neo", "09:10"],
  ["6E", "7124", "MAA", "CCU", 135, "Airbus A320neo", "14:30"],
  ["AI", "673", "BOM", "MAA", 115, "Airbus A321neo", "08:15"],
  ["6E", "5234", "BLR", "PNQ", 85, "Airbus A320", "16:45"],
  ["6E", "5312", "DEL", "IXB", 130, "Airbus A320neo", "11:00"],
  ["SG", "8709", "BOM", "DEL", 135, "Boeing 737 MAX 8", "19:00"],
  ["QP", "1314", "DEL", "AMD", 95, "Boeing 737 MAX 8", "16:50"],
  ["AI", "804", "BLR", "DEL", 170, "Airbus A321neo", "06:10"],
  ["6E", "6111", "CCU", "BLR", 155, "Airbus A321neo", "21:00"],
  ["UK", "945", "DEL", "BOM", 130, "Airbus A321neo", "10:40"],
  ["UK", "996", "BOM", "DEL", 135, "Boeing 787-9", "22:30"],
  ["6E", "2112", "AMD", "DEL", 95, "Airbus A320neo", "08:30"],
  ["6E", "2013", "CCU", "DEL", 145, "Airbus A321neo", "20:15"],
  ["AI", "112", "MAA", "DEL", 170, "Airbus A320neo", "16:45"],
  ["6E", "6356", "DEL", "MAA", 170, "Airbus A321neo", "10:00"],
  ["6E", "711", "DEL", "TRV", 200, "Airbus A320neo", "07:15"],
  ["6E", "6814", "BOM", "BLR", 100, "Airbus A320neo", "21:30"],
  ["6E", "6206", "CCU", "BLR", 150, "Airbus A321neo", "06:15"],

  // --- Gulf carriers return legs ---
  ["EK", "509", "DXB", "DEL", 220, "Airbus A380", "09:30"],
  ["EK", "564", "DXB", "BLR", 250, "Boeing 777-300ER", "03:30"],
  ["EK", "501", "DXB", "BOM", 200, "Airbus A380", "03:15"],
  ["QR", "578", "DOH", "DEL", 245, "Boeing 787-9", "19:00"],
  ["EY", "203", "DEL", "AUH", 230, "Boeing 787-9", "04:20"],

  // --- International popular return legs ---
  ["AI", "128", "LHR", "DEL", 480, "Boeing 787-8", "10:10"],
  ["AI", "120", "JFK", "DEL", 810, "Boeing 777-300ER", "14:00"],
  ["BA", "257", "LHR", "DEL", 490, "Boeing 787-9", "21:30"],
  ["SQ", "402", "SIN", "DEL", 310, "Airbus A350-900", "07:50"],
  ["SQ", "508", "SIN", "BLR", 255, "Airbus A350-900", "08:00"],
];

export const FLIGHT_CATALOG = rows.map(([airline_iata, number, from, to, duration, aircraft_type, local_departure_time]) => ({
  airline_iata,
  airline_name: AIRLINES[airline_iata] || airline_iata,
  number,
  flight_number: `${airline_iata}${number}`,
  departure_airport_iata: from,
  arrival_airport_iata: to,
  departure_city_name: AIRPORTS[from]?.city || from,
  arrival_city_name: AIRPORTS[to]?.city || to,
  flight_duration_minutes: duration,
  aircraft_type,
  local_departure_time,
  source: "bundled_catalog",
}));

export function searchFlightCatalog({ airline_iata, q, limit = 12 } = {}) {
  const airline = String(airline_iata || "").toUpperCase();
  const query = String(q || "").toUpperCase().replace(/\s+/g, "");
  return FLIGHT_CATALOG
    .filter((flight) => !airline || flight.airline_iata === airline)
    .filter((flight) => (
      !query ||
      flight.flight_number.includes(query) ||
      flight.number.includes(query) ||
      flight.departure_airport_iata.includes(query) ||
      flight.arrival_airport_iata.includes(query) ||
      flight.departure_city_name.toUpperCase().includes(query) ||
      flight.arrival_city_name.toUpperCase().includes(query)
    ))
    .slice(0, limit);
}

export function lookupCatalogFlight({ airline_iata, flight_number }) {
  const airline = String(airline_iata || "").toUpperCase();
  const normalized = String(flight_number || "").toUpperCase().replace(/\s+/g, "");
  const bare = normalized.replace(new RegExp(`^${airline}`), "");
  return FLIGHT_CATALOG.find((flight) => (
    (!airline || flight.airline_iata === airline) &&
    (flight.flight_number === normalized || flight.number === bare || flight.number === normalized)
  )) || null;
}
