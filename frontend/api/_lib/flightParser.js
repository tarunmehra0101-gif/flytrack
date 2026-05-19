const AIRLINES = {
  AI: "Air India",
  IX: "Air India Express",
  "6E": "IndiGo",
  UK: "Vistara",
  SG: "SpiceJet",
  QP: "Akasa Air",
  EK: "Emirates",
  EY: "Etihad Airways",
  QR: "Qatar Airways",
  SQ: "Singapore Airlines",
  BA: "British Airways",
  LH: "Lufthansa",
  AF: "Air France",
  KL: "KLM",
  UA: "United Airlines",
  AA: "American Airlines",
  DL: "Delta Air Lines",
};

const AIRPORT_ALIASES = {
  BENGALURU: "BLR",
  BANGALORE: "BLR",
  "BE N GALURU": "BLR",
  RANCHI: "IXR",
  KOZHIKODE: "CCJ",
  CALICUT: "CCJ",
  DELHI: "DEL",
  MUMBAI: "BOM",
  BOMBAY: "BOM",
  HYDERABAD: "HYD",
  CHENNAI: "MAA",
  KOLKATA: "CCU",
  GOA: "GOI",
  DUBAI: "DXB",
  SINGAPORE: "SIN",
  LONDON: "LHR",
};

const MONTHS = {
  JAN: 0, JANUARY: 0, FEB: 1, FEBRUARY: 1, MAR: 2, MARCH: 2, APR: 3, APRIL: 3,
  MAY: 4, JUN: 5, JUNE: 5, JUL: 6, JULY: 6, AUG: 7, AUGUST: 7, SEP: 8, SEPT: 8,
  SEPTEMBER: 8, OCT: 9, OCTOBER: 9, NOV: 10, NOVEMBER: 10, DEC: 11, DECEMBER: 11,
};

const AIRLINE_CODES_RE = "AI|6E|UK|SG|QP|EK|EY|QR|SQ|BA|LH|AF|KL|LX|CX|TG|TK|JL|NH|KE|UA|AA|DL|AC|QF|VS|I5|G8|MH|UL|IX|AK|FZ|WY|GF";

function squash(value) {
  return String(value || "")
    .replace(/[→➜⟶⮕►▸]/g, " TO ")
    .replace(/\u00a0/g, " ")
    .replace(/[|•·]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDate(value) {
  const source = String(value || "").replace(/[,]/g, " ");
  const iso = source.match(/\b(20\d{2})[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])\b/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const dmy = source.toUpperCase().match(/\b(\d{1,2})\s*[-/ ]\s*([A-Z]{3,9})\s*[-/ ]\s*(20\d{2}|\d{2})\b/);
  if (dmy && MONTHS[dmy[2]] != null) {
    const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
    return `${year}-${String(MONTHS[dmy[2]] + 1).padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }
  const mdy = source.toUpperCase().match(/\b([A-Z]{3,9})\s*[-/ ]\s*(\d{1,2})\s*[-/, ]\s*(20\d{2}|\d{2})\b/);
  if (mdy && MONTHS[mdy[1]] != null) {
    const year = mdy[3].length === 2 ? `20${mdy[3]}` : mdy[3];
    return `${year}-${String(MONTHS[mdy[1]] + 1).padStart(2, "0")}-${mdy[2].padStart(2, "0")}`;
  }
  return null;
}

function parseTime(value) {
  const match = String(value || "").match(/\b(\d{1,2})[:.h](\d{2})\s*(AM|PM)?\b/i);
  if (!match) return null;
  let hour = Number(match[1]);
  if (match[3]?.toUpperCase() === "PM" && hour < 12) hour += 12;
  if (match[3]?.toUpperCase() === "AM" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}

function airportFrom(value) {
  const clean = String(value || "").toUpperCase().replace(/[^A-Z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  const code = clean.match(/\b[A-Z]{3}\b/)?.[0];
  if (code && !["THE", "AND", "FOR", "NOT", "YOU", "ARE"].includes(code)) return code;
  for (const [name, iata] of Object.entries(AIRPORT_ALIASES)) {
    if (clean.includes(name)) return iata;
  }
  return null;
}

function flightMatches(text) {
  const matches = [];
  const re = new RegExp(`\\b(?:FLIGHT(?:\\s*(?:NO|NUMBER|#))?\\s*[:#\\-]?\\s*)?((${AIRLINE_CODES_RE})\\s?\\d{2,4}[A-Z]?)\\b`, "g");
  let match;
  while ((match = re.exec(text.toUpperCase()))) {
    const code = match[1].replace(/\s+/g, "");
    matches.push({ code, airline: code.slice(0, 2), index: match.index });
  }
  return matches;
}

function routeCandidates(text) {
  const upper = text.toUpperCase();
  const out = [];
  const push = (from, to, index) => {
    const dep = airportFrom(from);
    const arr = airportFrom(to);
    if (dep && arr && dep !== arr) out.push({ dep, arr, index });
  };
  const patterns = [
    /\b([A-Z]{3})\s*(?:[-–—]|TO|>|→)\s*([A-Z]{3})\b/g,
    /\bFROM\s+([A-Z]{3})\b.{0,120}?\bTO\s+([A-Z]{3})\b/g,
    /\bDEPART\s+([A-Z0-9\s.'-]{2,60})\(([A-Z]{3})\).{0,180}?\bARRIVE\s+([A-Z0-9\s.'-]{2,60})\(([A-Z]{3})\)/g,
    /\b([A-Z][A-Z\s.'-]{2,50})\s*\((?:-|[A-Z]{3})\)\s+TO\s+([A-Z]{3}|[A-Z][A-Z\s.'-]{2,50})\s*\((?:T\d|TERMINAL\s*\d|[A-Z]{3}|-)\)/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(upper))) {
      if (match.length >= 5) push(match[2] || match[1], match[4] || match[3], match.index);
      else push(match[1], match[2], match.index);
    }
  }
  return out;
}

function extractJsonLdFlights(text) {
  const flights = [];
  const scripts = String(text || "").match(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const script of scripts) {
    const jsonText = script.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "");
    try {
      const parsed = JSON.parse(jsonText);
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      rows.flatMap((row) => row["@graph"] || row).forEach((row) => {
        if (row?.["@type"] !== "FlightReservation") return;
        const f = row.reservationFor || {};
        const dep = f.departureAirport?.iataCode || f.departureAirport?.identifier;
        const arr = f.arrivalAirport?.iataCode || f.arrivalAirport?.identifier;
        const flightNumber = `${f.airline?.iataCode || f.operatedBy?.iataCode || ""}${f.flightNumber || ""}`.replace(/\s+/g, "");
        const date = parseDate(f.departureTime || row.modifiedTime || "");
        if (flightNumber && dep && arr && date) {
          flights.push(normalizeFlight({
            flight_number: flightNumber,
            airline_iata: flightNumber.slice(0, 2),
            departure_airport_iata: dep,
            arrival_airport_iata: arr,
            flight_date: date,
            departure_time_local: parseTime(f.departureTime),
            arrival_time_local: parseTime(f.arrivalTime),
            pnr: row.reservationNumber || null,
            passenger_name: row.underName?.name || null,
            parser_rule: "gmail_schema_flight_reservation",
            confidence_score: 0.96,
          }));
        }
      });
    } catch {
      // Ignore broken/escaped markup.
    }
  }
  return flights;
}

function normalizeFlight(raw) {
  const full = String(raw.flight_number || "").toUpperCase().replace(/\s+/g, "");
  const airline = String(raw.airline_iata || full.slice(0, 2)).toUpperCase();
  const flightDate = raw.flight_date || null;
  const missing = [
    !airline && "airline_iata",
    !full && "flight_number",
    !raw.departure_airport_iata && "departure_airport_iata",
    !raw.arrival_airport_iata && "arrival_airport_iata",
    !flightDate && "flight_date",
  ].filter(Boolean);
  if (missing.length) return null;
  return {
    source_type: "gmail",
    airline_iata: airline,
    airline_name: AIRLINES[airline] || airline,
    flight_number: full,
    departure_airport_iata: String(raw.departure_airport_iata).toUpperCase(),
    arrival_airport_iata: String(raw.arrival_airport_iata).toUpperCase(),
    flight_date: flightDate,
    departure_time_local: raw.departure_time_local || null,
    arrival_time_local: raw.arrival_time_local || null,
    pnr: raw.pnr || null,
    booking_reference: raw.pnr || null,
    passenger_name: raw.passenger_name || null,
    parser_rule: raw.parser_rule || "gmail_text_heuristic",
    confidence_score: raw.confidence_score || 0.82,
    confidence: raw.confidence_score >= 0.9 ? "high" : "review",
    status: "confirmed",
    time_confidence: raw.departure_time_local ? "visible_on_ticket" : "missing",
    canonical_hash: [airline, full, raw.departure_airport_iata, raw.arrival_airport_iata, flightDate, raw.pnr].map((x) => String(x || "").toUpperCase()).join("|"),
  };
}

function parseTextFlights(input) {
  const text = squash(input);
  const fromSchema = extractJsonLdFlights(input);
  const flights = flightMatches(text);
  const routes = routeCandidates(text);
  const found = [...fromSchema];
  for (const flight of flights.slice(0, 8)) {
    const route = routes.slice().sort((a, b) => Math.abs(a.index - flight.index) - Math.abs(b.index - flight.index))[0];
    if (!route) continue;
    const window = text.slice(Math.max(0, flight.index - 180), flight.index + 450);
    const date = parseDate(window) || parseDate(text);
    const depTime = parseTime(window.match(/\b(?:DEPARTURE|DEPART|STD)\s*(?:TIME)?\s*[:#\-]?\s*([0-9:.h\sAPM]{4,12})/i)?.[1] || "");
    const pnr = text.match(/\b(?:PNR|BOOKING REF(?:ERENCE)?|RESERVATION CODE|RECORD LOCATOR)\s*[:#\-]?\s*([A-Z0-9]{5,8})\b/i)?.[1] || null;
    const normalized = normalizeFlight({
      flight_number: flight.code,
      airline_iata: flight.airline,
      departure_airport_iata: route.dep,
      arrival_airport_iata: route.arr,
      flight_date: date,
      departure_time_local: depTime,
      pnr,
      parser_rule: "gmail_text_heuristic",
    });
    if (normalized) found.push(normalized);
  }
  const unique = [];
  const seen = new Set();
  for (const flight of found.filter(Boolean)) {
    const key = flight.canonical_hash || `${flight.flight_number}|${flight.flight_date}|${flight.departure_airport_iata}|${flight.arrival_airport_iata}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(flight);
    }
  }
  return unique;
}

async function extractPdfText(buffer) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  const pages = [];
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str).join(" "));
  }
  return pages.join("\n");
}

module.exports = { extractPdfText, parseTextFlights };
