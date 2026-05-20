const fs = require("fs");
const path = require("path");

// Mock values from ticketParser.js
const AIRPORTS = require("../src/data/airports.js").AIRPORTS;
const AIRLINES = require("../src/data/airports.js").AIRLINES;

const AIRLINE_CODES_RE = "AI|6E|UK|SG|QP|EK|EY|QR|SQ|BA|LH|AF|KL|LX|CX|TG|TK|JL|NH|KE|UA|AA|DL|AC|QF|VS|I5|G8|MH|UL|IX|AK|FZ|WY|GF|9W|S7|AZ|IB|TP|SK|AY|LO|OS|RJ|PK|BG|FY|H9|WJ";

function squash(text) {
  return String(text || "")
    .replace(/[→➜⟶⮕►▸]/g, " TO ")
    .replace(/\u00a0/g, " ")
    .replace(/[|•·]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeAirport(value) {
  const code = String(value || "").toUpperCase().trim();
  return (code.length === 3 && AIRPORTS[code]) ? code : null;
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

function airportFromLabel(value) {
  const label = normalizeLabel(value);
  if (!label) return null;
  const direct = normalizeAirport(label);
  if (direct) return direct;

  const aliases = {
    BENGALURU: "BLR",
    "BE N GALURU": "BLR",
    BANGALORE: "BLR",
    RANCHI: "IXR",
    KOZHIKODE: "CCJ",
    CALICUT: "CCJ",
  };
  for (const [name, code] of Object.entries(aliases)) {
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

function routeCandidates(text) {
  const upper = text.toUpperCase();
  const candidates = [];
  const pushCandidate = (fromValue, toValue, index) => {
    const from = normalizeAirport(fromValue) || airportFromLabel(fromValue);
    const to = normalizeAirport(toValue) || airportFromLabel(toValue);
    if (from && to && from !== to) candidates.push({ from, to, index });
  };
  const patterns = [
    /\b([A-Z]{3})\s*(?:[-–—]|TO|>|→)\s*([A-Z]{3})\b/g,
    /\bFROM\s+([A-Z]{3})\b.{0,100}?\bTO\s+([A-Z]{3})\b/g,
    /\b(?:ORIGIN|DEPARTURE|DEP)\s*[:#\-]?\s*([A-Z]{3})\b.{0,100}?\b(?:DESTINATION|ARRIVAL|ARR)\s*[:#\-]?\s*([A-Z]{3})\b/g,
    /\b(?:BOARDING|DEPARTS?)\s*(?:FROM|AT)?\s*[:#\-]?\s*\w*\s*\(([A-Z]{3})\).{0,120}?\b(?:ARRIVES?|TO)\s*(?:AT|IN)?\s*[:#\-]?\s*\w*\s*\(([A-Z]{3})\)/g,
  ];
  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(upper))) {
      pushCandidate(match[1], match[2], match.index);
    }
  });

  const parenRoutes = [
    /\bDEPART\s+([A-Z0-9\s.'-]{2,60})\(([A-Z]{3})\).{0,180}?\bARRIVE\s+([A-Z0-9\s.'-]{2,60})\(([A-Z]{3})\)/g,
    /\b([A-Z][A-Z\s.'-]{2,50})\s*\((?:-|[A-Z]{3})\)\s+TO\s+([A-Z]{3}|[A-Z][A-Z\s.'-]{2,50})\s*\((?:T\d|TERMINAL\s*\d|[A-Z]{3}|-)\)/g,
  ];
  parenRoutes.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(upper))) {
      if (match.length >= 5) pushCandidate(match[2] || match[1], match[4] || match[3], match.index);
      else pushCandidate(match[1], match[2], match.index);
    }
  });

  if (candidates.length === 0) {
    const codes = [];
    const codeRe = /\b([A-Z]{3})\b/g;
    let m;
    while ((m = codeRe.exec(upper))) {
      if (AIRPORTS[m[1]] && !["THE", "AND", "FOR", "NOT", "ARE", "BUT", "YOU", "ALL", "CAN", "HER", "WAS", "ONE", "OUR", "OUT", "HAS", "HIS", "HOW", "MAN", "NEW", "NOW", "OLD", "SEE", "WAY", "WHO", "BOY", "DID", "ITS", "LET", "PUT", "SAY", "SHE", "TOO", "USE"].includes(m[1])) {
        codes.push({ code: m[1], index: m.index });
      }
    }
    for (let i = 0; i < codes.length - 1; i++) {
      for (let j = i + 1; j < Math.min(codes.length, i + 4); j++) {
        if (codes[i].code !== codes[j].code) {
          candidates.push({ from: codes[i].code, to: codes[j].code, index: codes[i].index });
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
  const flightRe = new RegExp(`\\b(?:FLIGHT(?:\\s*(?:NO|NUMBER|#))?\\s*[:#\\-]?\\s*)?((${AIRLINE_CODES_RE})\\s*[-~]?\\s*\\d{2,4}[A-Z]?)\\b`, "g");
  let match;
  while ((match = flightRe.exec(upper))) {
    const code = match[1].replace(/[\s\-~]+/g, "");
    matches.push({ code, airline: code.slice(0, 2), number: code.slice(2), index: match.index });
  }
  return matches;
}

async function extractText(filePath) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = path.resolve("./node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs");
  const buffer = fs.readFileSync(filePath);
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true, disableFontFace: true });
  const pdf = await loadingTask.promise;
  const pages = [];
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str).join(" "));
  }
  return pages.join("\n").trim();
}

async function run() {
  const files = [
    "Boarding_Pass(BLR-IXR).pdf",
    "RYKFVW_1776746937406.pdf"
  ];
  for (const file of files) {
    const fullPath = path.join(__dirname, "../public", file);
    const rawText = await extractText(fullPath);
    const text = squash(rawText);
    console.log(`\n========================================`);
    console.log(`Analyzing parser output for: ${file}`);
    console.log(`========================================`);
    
    const flights = flightMatches(text);
    const routes = routeCandidates(text);
    
    console.log("Matched Flights:", flights);
    console.log("Matched Routes Candidates:", routes);

    if (flights.length && routes.length) {
      const flight = flights[0];
      const route = routes.sort((a, b) => Math.abs(a.index - flight.index) - Math.abs(b.index - flight.index))[0];
      console.log(`Best matched pair -> Flight: ${flight.code}, Route: ${route.from} to ${route.to}`);
    } else {
      console.log("Could not pair flight and route!");
    }
  }
}

run();
