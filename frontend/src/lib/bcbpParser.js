// IATA BCBP (Bar Coded Boarding Pass) Parser.
// The `bcbp` package handles variable-length/multi-leg BCBP strings more
// reliably than fixed offsets. A small fixed-offset fallback stays here for
// malformed scanner output.

import { decode as decodeBcbp } from "bcbp";

export function parseBcbp(barcodeData) {
  const decoded = parseWithPackage(barcodeData);
  if (decoded) return decoded;
  return parseWithFixedOffsets(barcodeData);
}

function parseWithPackage(barcodeData) {
  const raw = normalizeRawBarcode(barcodeData);
  if (!raw) return null;
  try {
    const years = candidateReferenceYears();
    for (const year of years) {
      const pass = decodeBcbp(raw, year);
      const leg = pass?.data?.legs?.[0];
      const normalized = normalizeDecodedLeg(pass?.data, leg);
      if (normalized) return normalized;
    }
  } catch {
    // Fall back to fixed offsets below.
  }
  return null;
}

function parseWithFixedOffsets(barcodeData) {
  if (!barcodeData || barcodeData.length < 60) {
    return null; // Not a valid BCBP
  }

  // A valid BCBP usually starts with M1
  if (!barcodeData.startsWith("M1")) {
    // Sometimes scanners miss the first character or it has special prefix
    const m1Index = barcodeData.indexOf("M1");
    if (m1Index === -1) return null;
    barcodeData = barcodeData.slice(m1Index);
  }

  try {
    const passengerName = barcodeData.slice(2, 22).trim();
    const pnr = barcodeData.slice(23, 30).trim();
    const fromCity = barcodeData.slice(30, 33).trim();
    const toCity = barcodeData.slice(33, 36).trim();
    const carrier = barcodeData.slice(36, 39).trim();
    const flightNumber = barcodeData.slice(39, 44).trim();
    const julianDate = barcodeData.slice(44, 47).trim();
    const compartmentCode = barcodeData.slice(47, 48).trim();
    const seatNumber = barcodeData.slice(48, 52).trim();
    
    // BCBP provides Julian Date (day of the year 1-365). 
    // We must guess the year based on the current date since it's not provided.
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentJulian = getJulianDate(now);
    
    let flightYear = currentYear;
    const parsedJulian = parseInt(julianDate, 10);
    
    // If the flight date is wildly in the past compared to today, it might be next year's flight booked in late Dec
    // If the flight date is wildly in the future compared to today, it might be last year's boarding pass
    if (parsedJulian < 50 && currentJulian > 300) {
      flightYear = currentYear + 1;
    } else if (parsedJulian > 300 && currentJulian < 50) {
      flightYear = currentYear - 1;
    }

    const flightDateObj = getDateFromJulian(flightYear, parsedJulian);
    const flightDateStr = flightDateObj.toISOString().split("T")[0];
    const airline = carrier.slice(0, 2).toUpperCase();
    const bareFlight = flightNumber.replace(/^0+/, "");
    return {
      passenger_name: formatPassengerName(passengerName),
      pnr: pnr,
      departure_airport_iata: fromCity,
      arrival_airport_iata: toCity,
      airline_iata: airline,
      flight_number: `${airline}${bareFlight}`,
      flight_date: flightDateStr,
      seat_number: seatNumber.replace(/^0+/, ''),
      cabin_class: getCabinClass(compartmentCode),
      source_type: "barcode_scan",
      parser_rule: "iata_bcbp_fixed_offset",
      time_confidence: "barcode_date_only",
    };
  } catch (e) {
    console.error("Failed to parse BCBP:", e);
    return null;
  }
}

function normalizeRawBarcode(value) {
  const raw = String(value || "");
  const idx = raw.indexOf("M1");
  if (idx >= 0) return raw.slice(idx).trim();
  return raw.trim();
}

function candidateReferenceYears() {
  const current = new Date().getFullYear();
  return [current, current - 1, current + 1];
}

function normalizeDecodedLeg(data, leg) {
  if (!leg) return null;
  const airline = String(leg.operatingCarrierDesignator || leg.marketingCarrierDesignator || "").trim().toUpperCase();
  const bareFlight = String(leg.flightNumber || "").trim().replace(/^0+/, "");
  const dep = String(leg.departureAirport || "").trim().toUpperCase();
  const arr = String(leg.arrivalAirport || "").trim().toUpperCase();
  const date = leg.flightDate instanceof Date && !Number.isNaN(leg.flightDate.getTime())
    ? leg.flightDate.toISOString().slice(0, 10)
    : null;
  if (!(airline && bareFlight && dep && arr)) return null;
  return {
    passenger_name: formatPassengerName(data?.passengerName || ""),
    pnr: leg.operatingCarrierPNR || null,
    departure_airport_iata: dep,
    arrival_airport_iata: arr,
    airline_iata: airline,
    flight_number: `${airline}${bareFlight}`,
    flight_date: date,
    seat_number: String(leg.seatNumber || "").replace(/^0+/, "").trim() || null,
    cabin_class: getCabinClass(leg.compartmentCode || ""),
    source_type: "barcode_scan",
    parser_rule: "iata_bcbp_package",
    time_confidence: "barcode_date_only",
    missing_fields: [!date && "flight_date"].filter(Boolean),
  };
}

function formatPassengerName(nameStr) {
  // Usually LASTNAME/FIRSTNAME MR
  if (!nameStr.includes("/")) return nameStr;
  const parts = nameStr.split("/");
  const last = parts[0].trim();
  const firstRaw = parts[1] ? parts[1].trim() : "";
  
  // Strip common titles attached to first name (e.g. JOHNMR -> JOHN)
  let first = firstRaw.replace(/(MR|MRS|MS|MISS|MSTR|DR|PROF)$/i, "").trim();
  if (!first) first = firstRaw; // Fallback if they were actually named Mr

  // Title case
  const titleCase = (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  
  return `${titleCase(first)} ${titleCase(last)}`.trim();
}

function getJulianDate(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = (date - start) + ((start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000);
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

function getDateFromJulian(year, julianDay) {
  const date = new Date(year, 0, 1);
  date.setDate(julianDay);
  return date;
}

function getCabinClass(code) {
  const mapping = {
    'R': 'First', 'P': 'First', 'F': 'First', 'A': 'First',
    'J': 'Business', 'C': 'Business', 'D': 'Business', 'I': 'Business', 'Z': 'Business',
    'W': 'Premium Economy', 'E': 'Premium Economy',
    'Y': 'Economy', 'B': 'Economy', 'H': 'Economy', 'M': 'Economy', 'K': 'Economy', 
    'L': 'Economy', 'V': 'Economy', 'S': 'Economy', 'N': 'Economy', 'Q': 'Economy', 
    'O': 'Economy', 'G': 'Economy', 'T': 'Economy', 'X': 'Economy'
  };
  return mapping[code.toUpperCase()] || 'Economy';
}
