import { AIRLINES, AIRPORTS } from "@/data/airports";
import { supabase } from "@/lib/supabaseClient";

const MONTHS = {
  JAN: 0, JANUARY: 0, FEB: 1, FEBRUARY: 1, MAR: 2, MARCH: 2, APR: 3, APRIL: 3,
  MAY: 4, JUN: 5, JUNE: 5, JUL: 6, JULY: 6, AUG: 7, AUGUST: 7, SEP: 8, SEPT: 8,
  SEPTEMBER: 8, OCT: 9, OCTOBER: 9, NOV: 10, NOVEMBER: 10, DEC: 11, DECEMBER: 11,
};

const CITY_ALIASES = {
  BENGALURU: "BLR", BANGALORE: "BLR", "BE N GALURU": "BLR", BENGAL: "BLR",
  RANCHI: "IXR",
  KOZHIKODE: "CCJ", CALICUT: "CCJ",
  TRIVANDRUM: "TRV", THIRUVANANTHAPURAM: "TRV",
  VIZAG: "VTZ", VISAKHAPATNAM: "VTZ",
  VARANASI: "VNS", BANARAS: "VNS",
  LUCKNOW: "LKO",
  BHUBANESWAR: "BBI", BHUBANESHWAR: "BBI",
  JAIPUR: "JAI",
  CHANDIGARH: "IXC",
  SRINAGAR: "SXR",
  PATNA: "PAT",
  MANGALORE: "IXE", MANGALURU: "IXE",
  COIMBATORE: "CJB",
  MADURAI: "IXM",
  UDAIPUR: "UDR",
  AMRITSAR: "ATQ",
  NAGPUR: "NAG",
  INDORE: "IDR",
  RAIPUR: "RPR",
  IMPHAL: "IMF",
  GUWAHATI: "GAU",
  AGARTALA: "IXA",
  DEHRADUN: "DED",
  BAGDOGRA: "IXB",
  "PORT BLAIR": "IXZ",
  TIRUPATI: "TIR",
  VIJAYAWADA: "VGA",
  MOPA: "GOX",
  ISTANBUL: "IST",
  "KUALA LUMPUR": "KUL",
  "NEW YORK": "JFK",
  "LOS ANGELES": "LAX",
  "SAN FRANCISCO": "SFO",
  CHICAGO: "ORD",
};

const AIRLINE_ALIASES = [
  ["AIR INDIA EXPRESS", "IX"], ["AIRINDIA EXPRESS", "IX"], ["AIR-INDIA EXPRESS", "IX"],
  ["AIR INDIA", "AI"], ["AIRINDIA", "AI"], ["AIR-INDIA", "AI"],
  ["INDIGO", "6E"], ["INTERGLOBE", "6E"],
  ["AKASA AIR", "QP"], ["AKASA", "QP"],
  ["SPICEJET", "SG"], ["VISTARA", "UK"],
  ["EMIRATES", "EK"], ["ETIHAD", "EY"], ["QATAR", "QR"],
  ["SINGAPORE AIRLINES", "SQ"], ["BRITISH AIRWAYS", "BA"],
  ["LUFTHANSA", "LH"], ["AIR FRANCE", "AF"], ["KLM", "KL"], ["SWISS", "LX"],
  ["CATHAY", "CX"], ["THAI AIR", "TG"], ["TURKISH", "TK"],
  ["JAPAN AIR", "JL"], ["UNITED", "UA"], ["AMERICAN AIR", "AA"],
  ["DELTA", "DL"], ["QANTAS", "QF"], ["SRILANKAN", "UL"],
  ["MALAYSIA AIR", "MH"], ["AIR ASIA", "I5"], ["AIRASIA", "I5"],
  ["GO FIRST", "G8"], ["GO AIR", "G8"],
  ["JETBLUE", "B6"], ["SOUTHWEST", "WN"],
  ["VIRGIN ATLANTIC", "VS"], ["AIR CANADA", "AC"],
  ["KOREAN AIR", "KE"], ["ANA", "NH"],
  ["FLYDUBAI", "FZ"], ["OMAN AIR", "WY"], ["GULF AIR", "GF"],
];

// All known 2-letter IATA airline codes for matching in text
// Auto-generated from AIRLINES + known regional carriers. Sorted longest-first so
// two-char codes like "I5" don't shadow longer prefixes.
const AIRLINE_CODES_RE = (() => {
  const base = new Set([
    "AI","6E","UK","SG","QP","EK","EY","QR","SQ","BA","LH","AF","KL","LX",
    "CX","TG","TK","JL","NH","KE","UA","AA","DL","AC","QF","VS","I5","G8",
    "MH","UL","IX","AK","FZ","WY","GF","9W","S7","AZ","IB","TP","SK","AY",
    "LO","OS","RJ","PK","BG","FY","H9","WJ","B6","WN","FR","W6","U2","EI",
    "SU","HU","CA","MU","CZ","3U","SC","ZH","FM","CI","BR","GA","SV","WE",
    ...Object.keys(AIRLINES),
  ]);
  return [...base].sort((a, b) => b.length - a.length).join("|");
})();

const BLACKLISTED_3LETTER_WORDS = new Set([
  // Travel & document terms
  "TAX", "GST", "VAT", "NET", "PAY", "BAG", "CAR", "VAL", "NON", "VIA", "PNR", "PAX", "REF", "TKT", 
  "FLT", "SEQ", "NUM", "NBR", "CAB", "CLS", "MIN", "HRS", "SEC", "GMT", "UTC", "EST", "PST", "MST", 
  "CST", "EDT", "PDT", "CDT", "MDT", "BST", "DEP", "ARR", "STD", "STA", "WEB", "OFF", "OWN", "ANY", 
  "GET", "HAD", "ITS",
  // Months
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
  // Days
  "MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN",
  // Currencies
  "INR", "USD", "EUR", "CAD", "GBP", "AED", "SAR", "SGD", "AUD", "JPY",
  // Common English words / prepositions
  "THE", "AND", "FOR", "NOT", "ARE", "BUT", "YOU", "ALL", "CAN", "HER", "WAS", "ONE", "OUR", "OUT", 
  "HAS", "HIS", "HOW", "MAN", "NEW", "NOW", "OLD", "SEE", "WAY", "WHO", "BOY", "DID", "LET", "PUT", 
  "SAY", "SHE", "TOO", "USE", "YES", "SET", "ADD", "BOX", "END", "KEY", "LOC", "ROW", "RUN", "SUB", 
  "TRY", "ZIP"
]);

function squash(text) {
  return String(text || "")
    .replace(/[→➜⟶⮕►▸]/g, " TO ")
    .replace(/\u00a0/g, " ")
    .replace(/[|•·]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeName(value) {
  const clean = String(value || "")
    .replace(/^(MR|MS|MRS|MISS|MSTR|DR|PROF)\s+/i, "")
    .replace(/\s+(MR|MS|MRS|MISS|MSTR|DR)$/i, "")
    .replace(/[0-9_*]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return null;
  if (clean.includes("/")) {
    const [last, first] = clean.split("/");
    return [first, last].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  }
  return clean
    .toLowerCase()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

function normalizeLabel(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/\bT\s*[- ]?\s*\d+\b/g, " ")
    .replace(/\bTERMINAL\s*\d+\b/g, " ")
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDate(value) {
  if (!value) return null;
  const source = String(value).trim().replace(/[,]/g, " ");
  // ISO format: 2024-03-15
  const iso = source.match(/\b(20\d{2})[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])\b/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  // DMY: 15 Mar 2024 or 15-MAR-24
  const dmy = source.toUpperCase().match(/\b(\d{1,2})\s*[-/ ]\s*([A-Z]{3,9})\s*[-/ ]\s*(20\d{2}|\d{2})\b/);
  if (dmy && MONTHS[dmy[2]] != null) {
    const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
    return `${year}-${String(MONTHS[dmy[2]] + 1).padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }
  // MDY: Mar 15, 2024
  const mdy = source.toUpperCase().match(/\b([A-Z]{3,9})\s*[-/ ]\s*(\d{1,2})\s*[-/, ]\s*(20\d{2}|\d{2})\b/);
  if (mdy && MONTHS[mdy[1]] != null) {
    const year = mdy[3].length === 2 ? `20${mdy[3]}` : mdy[3];
    return `${year}-${String(MONTHS[mdy[1]] + 1).padStart(2, "0")}-${mdy[2].padStart(2, "0")}`;
  }
  // Numeric: 15/03/2024 or 03/15/2024
  const numeric = source.match(/\b(\d{1,2})[/-](\d{1,2})[/-](20\d{2})\b/);
  if (numeric) {
    const a = parseInt(numeric[1]), b = parseInt(numeric[2]);
    // If first > 12, it must be day; otherwise assume MM/DD/YYYY for ambiguous
    if (a > 12) return `${numeric[3]}-${String(b).padStart(2, "0")}-${String(a).padStart(2, "0")}`;
    return `${numeric[3]}-${String(a).padStart(2, "0")}-${String(b).padStart(2, "0")}`;
  }
  return null;
}

function extractAfter(text, labels, max = 42) {
  for (const label of labels) {
    const re = new RegExp(`\\b${label}\\b\\s*[:#\\-]?\\s*([A-Z][A-Z\\s/.'-]{2,${max}})`, "i");
    const match = text.match(re);
    if (match?.[1]) {
      return match[1]
        .split(/\b(?:FROM|TO|FLIGHT|PNR|BOOKING|TICKET|DATE|SEAT|CLASS|DEPARTURE|ARRIVAL)\b/i)[0]
        .trim();
    }
  }
  return null;
}

function findPassenger(text) {
  const labeled = normalizeName(extractAfter(text, [
    "PASSENGER NAME", "BOARDING PASS", "PASSENGER", "TRAVELLER", "TRAVELER", "GUEST",
    "NAME OF PASSENGER", "PAX NAME", "PSGR", "NAME",
  ]));
  if (labeled) return labeled;
  const slashName = String(text || "").match(/\b([A-Z]{2,}\/[A-Z]{2,}(?:\/(?:MR|MS|MRS|MISS|MSTR|DR))?)\b/i);
  return slashName ? normalizeName(slashName[1]) : null;
}

function findPnr(text) {
  const match = text.match(/\b(?:PNR|BOOKING REF(?:ERENCE)?|RESERVATION CODE|RECORD LOCATOR|CONFIRM(?:ATION)?\s*(?:NO|NUMBER|CODE|#)?)\s*[:#\-]?\s*([A-Z0-9]{5,8})\b/i);
  return match?.[1]?.toUpperCase() || null;
}

function findTicketNumber(text) {
  const match = text.match(/\b(?:TICKET(?: NO| NUMBER)?|E-?TICKET(?: NO| NUMBER)?)\s*[:#\-]?\s*([0-9]{10,14})\b/i);
  return match?.[1] || null;
}

function findAirline(text, flightCode) {
  if (flightCode) {
    const code = flightCode.slice(0, 2).toUpperCase();
    if (AIRLINES[code]) return code;
  }
  const upper = text.toUpperCase();
  const alias = AIRLINE_ALIASES.find(([name]) => upper.includes(name));
  return alias?.[1] || null;
}

function findDateNear(text, index = 0) {
  const window = text.slice(Math.max(0, index - 150), index + 300);
  return parseDate(window) || parseDate(text);
}

function normalizeAirport(value) {
  const code = String(value || "").toUpperCase().trim();
  return (code.length === 3 && AIRPORTS[code]) ? code : null;
}

function airportFromLabel(value) {
  const label = normalizeLabel(value);
  if (!label) return null;
  const direct = normalizeAirport(label);
  if (direct) return direct;

  for (const [name, code] of Object.entries(CITY_ALIASES)) {
    if (label.includes(name)) return code;
  }

  const values = Object.values(AIRPORTS);
  const exact = values.find((airport) => (
    normalizeLabel(airport.city) === label ||
    normalizeLabel(airport.name) === label
  ));
  if (exact?.iata) return exact.iata;

  const contained = values
    .filter((airport) => airport.scheduled_service !== false)
    .find((airport) => {
      const city = normalizeLabel(airport.city);
      const name = normalizeLabel(airport.name);
      return (city && label.includes(city)) || (name && label.includes(name));
    });
  return contained?.iata || null;
}

/** Parse time from text like "14:30", "2:30 PM", "1430", "16.45 hrs" */
function parseTime(text) {
  if (!text) return null;
  // Match "16.45 hrs", "17:25", "2:30 PM", "14.30", "16:45hrs" etc.
  const hm = text.match(/\b(\d{1,2})[:.](\d{2})\s*(?:HRS?)?\s*,?\s*(AM|PM)?\b/i);
  if (hm) {
    let h = parseInt(hm[1]), m = parseInt(hm[2]);
    if (hm[3]?.toUpperCase() === "PM" && h < 12) h += 12;
    if (hm[3]?.toUpperCase() === "AM" && h === 12) h = 0;
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
  }
  const military = text.match(/\b([01]\d|2[0-3])(\d{2})\s*(?:HRS?|H)?\b/);
  if (military) return `${military[1]}:${military[2]}`;
  return null;
}

function findTimes(text, index) {
  const window = text.slice(Math.max(0, index - 150), index + 500);
  let depTime = null, arrTime = null;
  // Try labeled times — handles Indian formats like "Departure Time 17.25 hrs, 11 Jun 25"
  const depPatterns = [
    /\b(?:DEPARTURE|DEP)\s*(?:TIME)?\s*[:#\-]?\s*(\d{1,2}[:.]\d{2}\s*(?:HRS?)?\s*,?\s*(?:AM|PM)?)/i,
    /\b(?:STD|SCHED(?:ULED)?\s*DEP(?:ARTURE)?)\s*(?:TIME)?\s*[:#\-]?\s*(\d{1,2}[:.h]\d{2}\s*(?:AM|PM)?|\d{4}\s*(?:HRS?)?)/i,
    /\bDEPARTS?\s*[:#\-]?\s*(\d{1,2}[:.h]\d{2}\s*(?:HRS?)?\s*,?\s*(?:AM|PM)?)/i,
  ];
  for (const pat of depPatterns) {
    const match = window.match(pat);
    if (match) { depTime = parseTime(match[1]); if (depTime) break; }
  }
  const arrPatterns = [
    /\b(?:ARRIVAL|ARR)\s*(?:TIME)?\s*[:#\-]?\s*(\d{1,2}[:.]\d{2}\s*(?:HRS?)?\s*,?\s*(?:AM|PM)?)/i,
    /\b(?:STA|SCHED(?:ULED)?\s*ARR(?:IVAL)?)\s*(?:TIME)?\s*[:#\-]?\s*(\d{1,2}[:.h]\d{2}\s*(?:AM|PM)?|\d{4}\s*(?:HRS?)?)/i,
  ];
  for (const pat of arrPatterns) {
    const match = window.match(pat);
    if (match) { arrTime = parseTime(match[1]); if (arrTime) break; }
  }
  return { departure_time: depTime, arrival_time: arrTime };
}

function routeCandidates(text) {
  const upper = text.toUpperCase();
  const candidates = [];
  const pushCandidate = (fromValue, toValue, index) => {
    const from = normalizeAirport(fromValue) || airportFromLabel(fromValue);
    const to = normalizeAirport(toValue) || airportFromLabel(toValue);
    if (from && to && from !== to) {
      if (BLACKLISTED_3LETTER_WORDS.has(from) || BLACKLISTED_3LETTER_WORDS.has(to)) return;
      candidates.push({ from, to, index });
    }
  };
  const patterns = [
    // Standard: DEL-BOM, DEL TO BOM, DEL > BOM
    /\b([A-Z]{3})\s*(?:[-–—]|TO|>|→)\s*([A-Z]{3})\b/g,
    // Labeled: FROM DEL ... TO BOM
    /\bFROM\s+([A-Z]{3})\b.{0,100}?\bTO\s+([A-Z]{3})\b/g,
    // Origin/Destination labels
    /\b(?:ORIGIN|DEPARTURE|DEP)\s*[:#\-]?\s*([A-Z]{3})\b.{0,100}?\b(?:DESTINATION|ARRIVAL|ARR)\s*[:#\-]?\s*([A-Z]{3})\b/g,
    // Airport field labels on e-tickets
    /\b(?:BOARDING|DEPARTS?)\s*(?:FROM|AT)?\s*[:#\-]?\s*\w*\s*\(([A-Z]{3})\).{0,250}?\b(?:ARRIVES?|TO)\s*(?:AT|IN)?\s*[:#\-]?\s*\w*\s*\(([A-Z]{3})\)/g,
  ];
  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(upper))) {
      pushCandidate(match[1], match[2], match.index);
    }
  });

  const parenRoutes = [
    /\bDEPART\s+([A-Z0-9\s.'-]{2,60})\(([A-Z]{3})\).{0,250}?\bARRIVE\s+([A-Z0-9\s.'-]{2,60})\(([A-Z]{3})\)/g,
    /\b([A-Z][A-Z\s.'-]{2,50})\s*\((?:-|[A-Z]{3})\)\s+TO\s+([A-Z]{3}|[A-Z][A-Z\s.'-]{2,50})\s*\((?:T\d|TERMINAL\s*\d|[A-Z]{3}|-)\)/g,
  ];
  parenRoutes.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(upper))) {
      if (match.length >= 5) pushCandidate(match[2] || match[1], match[4] || match[3], match.index);
      else pushCandidate(match[1], match[2], match.index);
    }
  });
  // Also try finding standalone 3-letter airport codes that appear near each other
  if (candidates.length === 0) {
    const codes = [];
    const codeRe = /\b([A-Z]{3})\b/g;
    let m;
    while ((m = codeRe.exec(upper))) {
      if (AIRPORTS[m[1]] && !BLACKLISTED_3LETTER_WORDS.has(m[1])) {
        codes.push({ code: m[1], index: m.index });
      }
    }
    // Take first two distinct codes as likely route
    for (let i = 0; i < codes.length - 1; i++) {
      for (let j = i + 1; j < Math.min(codes.length, i + 4); j++) {
        if (codes[i].code !== codes[j].code) {
          candidates.push({ from: codes[i].code, to: codes[j].code, index: codes[i].index });
          return candidates;
        }
      }
    }
  }

  // Last resort fallback: Look for city names in text
  if (candidates.length === 0) {
    const foundCities = [];
    const sortedAliases = Object.entries(CITY_ALIASES).sort((a, b) => b[0].length - a[0].length);
    for (const [cityName, code] of sortedAliases) {
      const idx = upper.indexOf(cityName);
      if (idx !== -1) {
        foundCities.push({ code, index: idx, name: cityName });
      }
    }
    foundCities.sort((a, b) => a.index - b.index);
    for (let i = 0; i < foundCities.length - 1; i++) {
      for (let j = i + 1; j < foundCities.length; j++) {
        if (foundCities[i].code !== foundCities[j].code) {
          candidates.push({ from: foundCities[i].code, to: foundCities[j].code, index: foundCities[i].index });
          return candidates;
        }
      }
    }
  }

  return candidates;
}

function flightMatches(text) {
  const upper = text.toUpperCase();
  const matches = [];
  const seen = new Set();

  // Pattern 1: Standard "AI505" or "6E 7576" or "FLIGHT NO IX 2690"
  const flightRe = new RegExp(`\\b(?:FLIGHT(?:\\s*(?:NO|NUMBER|#))?\\s*[:#\\-]?\\s*)?((${AIRLINE_CODES_RE})\\s*[-~]?\\s*\\d{1,5}[A-Z]?)\\b`, "g");
  let match;
  while ((match = flightRe.exec(upper))) {
    const code = match[1].replace(/[\s\-~]+/g, "");
    if (!seen.has(code)) {
      seen.add(code);
      const airline = match[2];
      matches.push({ code, airline, number: code.slice(airline.length), index: match.index });
    }
  }

  // Pattern 2: "Flight No  IX 2690" — more generous spacing (handles PDF extraction artifacts)
  if (!matches.length) {
    const labeledRe = /\bFLIGHT\s*(?:NO|NUMBER|#)?\s*[:#\-]?\s*([A-Z0-9]{2})\s+(\d{1,5}[A-Z]?)\b/g;
    while ((match = labeledRe.exec(upper))) {
      const airline = match[1];
      const num = match[2];
      if (AIRLINES[airline] || airline.match(new RegExp(`^(?:${AIRLINE_CODES_RE})$`))) {
        const code = `${airline}${num}`;
        if (!seen.has(code)) {
          seen.add(code);
          matches.push({ code, airline, number: num, index: match.index });
        }
      }
    }
  }

  return matches;
}

function buildLocalSegments(text, sourceType) {
  const flights = flightMatches(text);
  const routes = routeCandidates(text);

  const passengerName = findPassenger(text);
  const pnr = findPnr(text);
  const ticketNumber = findTicketNumber(text);
  const segments = [];
  const seen = new Set();

  // Case 1: We have both flights and routes — the best case
  if (flights.length && routes.length) {
    for (const flight of flights.slice(0, 6)) {
      const route = routes
        .slice()
        .sort((a, b) => Math.abs(a.index - flight.index) - Math.abs(b.index - flight.index))[0];
      if (!route) continue;

      const labeledDate = text.match(/\b(?:DEPARTURE|BOARDING|DATE)\s*(?:TIME)?\s*[:#\-]?\s*(?:\d{1,2}[:.h]\d{2}\s*(?:HRS?)?)?\s*[, ]+\s*(\d{1,2}\s+[A-Z]{3,9}\s+\d{2,4})\b/i)?.[1];
      const flightDate = findDateNear(text, flight.index) || parseDate(labeledDate);
      const airline = findAirline(text, flight.code) || flight.airline;
      const smallFields = extractSmallFields(text, flight.index);
      const key = `${flight.code}|${route.from}|${route.to}|${flightDate || ""}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const missing = [];
      if (!flightDate) missing.push("flight_date");

      segments.push({
        source_type: sourceType,
        sequence_index: segments.length,
        airline_iata: airline,
        airline_name: AIRLINES[airline] || airline,
        flight_number: flight.code,
        departure_airport_iata: route.from,
        arrival_airport_iata: route.to,
        departure_city_name: AIRPORTS[route.from]?.city || route.from,
        arrival_city_name: AIRPORTS[route.to]?.city || route.to,
        departure_time_local: smallFields.departure_time || null,
        arrival_time_local: smallFields.arrival_time || null,
        departure_date_local: flightDate,
        flight_date: flightDate,
        seat_number: smallFields.seat || null,
        cabin_class: smallFields.cabin || null,
        terminal_departure: smallFields.terminal || null,
        gate: smallFields.gate || null,
        ticket_number: ticketNumber,
        pnr,
        booking_reference: pnr,
        passenger_name: passengerName,
        parser_rule: "local_text_fallback",
        confidence_score: missing.length ? 0.68 : 0.82,
        confidence: missing.length ? "review" : "medium",
        missing_fields: missing,
        needs_review: true,
        status: "pending_review",
        parse_message: missing.length
          ? "We found a likely flight route, but the date needs review."
          : "We found likely flight details from the PDF text. Please review before saving.",
      });
    }
  }

  // Case 2: We have routes but no flight numbers — still useful, create reviewable segments
  if (!segments.length && routes.length) {
    const globalDate = parseDate(text);
    for (const route of routes.slice(0, 3)) {
      const flightDate = findDateNear(text, route.index) || globalDate;
      const airline = findAirline(text, null);
      const smallFields = extractSmallFields(text, route.index);
      const key = `${route.from}|${route.to}|${flightDate || ""}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const missing = ["flight_number"];
      if (!flightDate) missing.push("flight_date");
      if (!airline) missing.push("airline_iata");

      segments.push({
        source_type: sourceType,
        sequence_index: segments.length,
        airline_iata: airline || null,
        airline_name: airline ? (AIRLINES[airline] || airline) : null,
        flight_number: null,
        departure_airport_iata: route.from,
        arrival_airport_iata: route.to,
        departure_city_name: AIRPORTS[route.from]?.city || route.from,
        arrival_city_name: AIRPORTS[route.to]?.city || route.to,
        departure_time_local: smallFields.departure_time || null,
        arrival_time_local: smallFields.arrival_time || null,
        departure_date_local: flightDate,
        flight_date: flightDate,
        seat_number: smallFields.seat || null,
        cabin_class: smallFields.cabin || null,
        terminal_departure: smallFields.terminal || null,
        gate: smallFields.gate || null,
        ticket_number: ticketNumber,
        pnr,
        booking_reference: pnr,
        passenger_name: passengerName,
        parser_rule: "local_route_only",
        confidence_score: 0.55,
        confidence: "review",
        missing_fields: missing,
        needs_review: true,
        status: "pending_review",
        parse_message: "We found the route but not the flight number. Please fill in the details.",
      });
    }
  }

  // Case 3: We have flights but no routes — less common, try to find airports from airline lookup
  if (!segments.length && flights.length) {
    const globalDate = parseDate(text);
    for (const flight of flights.slice(0, 3)) {
      const flightDate = findDateNear(text, flight.index) || globalDate;
      const airline = findAirline(text, flight.code) || flight.airline;
      const smallFields = extractSmallFields(text, flight.index);
      const key = `${flight.code}|${flightDate || ""}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const missing = ["departure_airport_iata", "arrival_airport_iata"];
      if (!flightDate) missing.push("flight_date");

      segments.push({
        source_type: sourceType,
        sequence_index: segments.length,
        airline_iata: airline,
        airline_name: AIRLINES[airline] || airline,
        flight_number: flight.code,
        departure_airport_iata: null,
        arrival_airport_iata: null,
        departure_city_name: null,
        arrival_city_name: null,
        departure_time_local: smallFields.departure_time || null,
        arrival_time_local: smallFields.arrival_time || null,
        departure_date_local: flightDate,
        flight_date: flightDate,
        seat_number: smallFields.seat || null,
        cabin_class: smallFields.cabin || null,
        terminal_departure: smallFields.terminal || null,
        gate: smallFields.gate || null,
        ticket_number: ticketNumber,
        pnr,
        booking_reference: pnr,
        passenger_name: passengerName,
        parser_rule: "local_flight_only",
        confidence_score: 0.45,
        confidence: "review",
        missing_fields: missing,
        needs_review: true,
        status: "pending_review",
        parse_message: "We found the flight number but not the airports. Please fill in the route.",
      });
    }
  }

  return segments;
}

function extractSmallFields(text, index) {
  const window = text.slice(Math.max(0, index - 150), index + 400);
  const seat = window.match(/\b(?:SEAT)(?:\s*(?:NO|NUMBER))?\s*[:#\-]?\s*([0-9]{1,2}[A-Z]?)\b/i)?.[1] || null;
  const cabin = window.match(/\b(?:CABIN|CLASS|TRAVEL CLASS)\s*[:#\-]?\s*(ECONOMY|BUSINESS|FIRST|PREMIUM\s*ECONOMY|Y|J|F|C|W)\b/i)?.[1] || null;
  const terminal = window.match(/\b(?:TERMINAL|TERM)\s*[:#\-]?\s*([A-Z0-9]{1,3})\b/i)?.[1] || null;
  let gate = window.match(/\b(?:GATE)\s*[:#\-]?\s*([A-Z0-9]{1,5})\b/i)?.[1] || null;
  if (gate) {
    const gateUpper = gate.toUpperCase();
    const badGates = ["IS", "TO", "AT", "OR", "ON", "BY", "IN", "OF", "FOR", "AND", "THE", "WILL", "CLOSE", "SUBJECT", "CHANGE", "BE", "AN", "ARE", "NOT", "BUT"];
    if (badGates.includes(gateUpper)) {
      gate = null;
    }
  }
  const times = findTimes(text, index);
  return { seat, cabin, terminal, gate, ...times };
}

export async function parseTicketText(rawText, sourceType = "pdf_eticket") {
  const text = squash(rawText);
  if (!text || text.length < 10) {
    return {
      segments: [],
      parser_status: "needs_ocr",
      message: "Scanned PDF needs OCR — try a clearer image",
      passenger_name: null,
    };
  }

  try {
    if (!supabase?.functions?.invoke) {
      throw new Error("AI parser unavailable");
    }

    const { data, error } = await supabase.functions.invoke("parse-ticket", {
      body: { text: text },
    });

    if (error || !Array.isArray(data?.flights) || data.flights.length === 0) {
      console.error("Parse API error:", error);
      throw new Error(error?.message || "Failed to parse ticket");
    }

    const segments = [];
    let passenger_name = null;
    let missing_fields = false;

    for (let i = 0; i < data.flights.length; i++) {
      const flight = data.flights[i];
      if (flight.passenger_name) passenger_name = flight.passenger_name;
      
      const missing = [];
      if (!flight.flight_number) missing.push("flight_number");
      if (!flight.departure_airport_iata) missing.push("departure_airport_iata");
      if (!flight.arrival_airport_iata) missing.push("arrival_airport_iata");
      if (!flight.flight_date) missing.push("flight_date");

      if (missing.length > 0) missing_fields = true;
      if (!flight.flight_number || !flight.departure_airport_iata || !flight.arrival_airport_iata) {
        continue;
      }

      const segment = {
        source_type: sourceType,
        sequence_index: i,
        airline_iata: flight.airline_iata || null,
        airline_name: flight.airline_iata ? AIRLINES[flight.airline_iata] : "",
        flight_number: flight.flight_number || null,
        departure_airport_iata: flight.departure_airport_iata || null,
        arrival_airport_iata: flight.arrival_airport_iata || null,
        departure_city_name: flight.departure_airport_iata ? AIRPORTS[flight.departure_airport_iata]?.city : "",
        arrival_city_name: flight.arrival_airport_iata ? AIRPORTS[flight.arrival_airport_iata]?.city : "",
        departure_time_local: flight.departure_time_local || null,
        arrival_time_local: flight.arrival_time_local || null,
        departure_date_local: flight.flight_date || null,
        flight_date: flight.flight_date || null,
        seat_number: flight.seat_number || null,
        ticket_number: flight.ticket_number || null,
        pnr: flight.pnr || null,
        booking_reference: flight.pnr || null,
        passenger_name: flight.passenger_name || null,
        parser_rule: "GEMINI_AI_PARSER",
        confidence_score: missing.length === 0 ? 0.98 : 0.72,
        missing_fields: missing,
        needs_review: missing.length > 0,
        status: missing.length > 0 ? "pending_review" : "parsed"
      };
      
      segments.push(segment);
    }

    if (!segments.length) {
      throw new Error("AI parser did not return a usable flight route");
    }

    return {
      segments,
      parser_status: missing_fields ? "needs_review" : "parsed",
      passenger_name,
    };
  } catch (err) {
    if (err?.message !== "AI parser unavailable") {
      console.error("AI Parser Failed:", err);
    }
    const fallbackSegments = buildLocalSegments(text, sourceType);
    if (fallbackSegments.length) {
      return {
        segments: fallbackSegments,
        parser_status: "needs_review",
        message: "Parsed locally from ticket text. Please review before saving.",
        passenger_name: fallbackSegments.find((s) => s.passenger_name)?.passenger_name || null,
      };
    }
    return {
      segments: [],
      parser_status: "needs_review",
      message: "Could not parse flight details from this document.",
      passenger_name: null,
    };
  }
}
