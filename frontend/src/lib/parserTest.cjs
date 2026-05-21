/**
 * Standalone test for flightMatches + routeCandidates logic.
 * No module imports — pure copy-paste of the core functions to verify correctness.
 * Run: node src/lib/parserTest.cjs
 */

// Minimal AIRLINES lookup
const AIRLINES = {
  "AI": "Air India", "6E": "IndiGo", "UK": "Vistara", "SG": "SpiceJet",
  "QP": "Akasa Air", "EK": "Emirates", "IX": "Air India Express", "G8": "Go First",
  "BA": "British Airways", "LH": "Lufthansa", "DL": "Delta", "UA": "United",
  "AA": "American Airlines", "QR": "Qatar Airways", "SQ": "Singapore Airlines",
};

// Build airline codes set
const AIRLINE_CODES_SET = new Set([
  "AI","6E","UK","SG","QP","EK","EY","QR","SQ","BA","LH","AF","KL","LX",
  "CX","TG","TK","JL","NH","KE","UA","AA","DL","AC","QF","VS","I5","G8",
  "MH","UL","IX","AK","FZ","WY","GF","9W","S7","AZ","IB","TP","SK","AY",
  "LO","OS","RJ","PK","BG","FY","H9","WJ","B6","WN","FR","W6","U2","EI",
  "SU","HU","CA","MU","CZ","3U","SC","ZH","FM","CI","BR","GA","SV","WE",
  ...Object.keys(AIRLINES),
]);

function flightMatches(text) {
  const upper = text.toUpperCase();
  const matches = [];
  const seen = new Set();

  function addMatch(code, airline, number, index) {
    if (seen.has(code)) return;
    const numericPart = parseInt(number, 10);
    if (isNaN(numericPart) || numericPart < 1 || numericPart > 9999) return;
    seen.add(code);
    matches.push({ code, airline, number, index });
  }

  // Priority 1: Explicitly labeled
  const labeledRe = /\bFLIGHT\s*(?:NO\.?|NUMBER|#|:)?\s*[:#\-]?\s*([A-Z0-9]{2})\s*[-~]?\s*(\d{1,4}[A-Z]?)\b/g;
  let match;
  while ((match = labeledRe.exec(upper))) {
    const airline = match[1];
    const number = match[2];
    if (AIRLINE_CODES_SET.has(airline)) {
      addMatch(`${airline}${number}`, airline, number, match.index);
    }
  }

  // Priority 2: Unlabeled airline+number
  if (!matches.length) {
    const codeNumRe = /\b([A-Z0-9]{2})\s*[-~]?\s*(\d{2,4}[A-Z]?)\b/g;
    const badPrefixRe = /\b(SEQ(?:UENCE)?|ZONE|ROW|AMOUNT|INR|RS\.?|FARE|TAX|TOTAL|PAID|CHARGE|FEE|COST|PRICE|RATE|TICKET\s*(?:NO|NUMBER)?|E.?TICKET|FFN)\s*[:#\-]?\s*$/i;
    const contextKeywords = /\b(DEPART|ARRIV|BOARD|CHECK.?IN|GATE|TERMINAL|PNR|BOOKING|ORIGIN|DESTINATION|FLIGHT)\b/i;
    const candidates = [];

    while ((match = codeNumRe.exec(upper))) {
      const airline = match[1];
      const number = match[2];
      if (!AIRLINE_CODES_SET.has(airline)) continue;
      const numericPart = parseInt(number, 10);
      const prefix = upper.slice(Math.max(0, match.index - 30), match.index);
      if (badPrefixRe.test(prefix)) continue;
      if (numericPart < 100 && !/FLIGHT/i.test(prefix)) continue;
      const neighborhood = upper.slice(Math.max(0, match.index - 100), Math.min(upper.length, match.index + 100));
      const hasContext = contextKeywords.test(neighborhood);
      candidates.push({ code: `${airline}${number}`, airline, number, index: match.index, hasContext });
    }

    const freq = {};
    for (const c of candidates) freq[c.code] = (freq[c.code] || 0) + 1;
    candidates.sort((a, b) =>
      (b.hasContext ? 1 : 0) - (a.hasContext ? 1 : 0) ||
      (freq[b.code] - freq[a.code]) ||
      (a.index - b.index)
    );
    for (const c of candidates) addMatch(c.code, c.airline, c.number, c.index);
  }

  return matches;
}

// Test cases
const tests = [
  {
    name: "BLR-IXR boarding pass",
    text: "Boarding Pass  Reeta Kumari  PNR   EV9WKL  Depart  Bengaluru T-2 (BLR)  Boarding Time  16.45 hrs, 11 Jun 25  Departure Time  17.25 hrs, 11 Jun 25  Gate  D11  Add Ons  PVIP, NCJB, PBCA, VLPR  Arrive  Ranchi (IXR)  Flight No  IX 2690  Seat No  1F  Zone  1  Sequence  110  Check-in counters closes 1 hour before departure  Airline Copy  Reeta Kumari  Departure Time  17.25 hrs, 11 Jun 25  Flight No  IX 2690  Depart  Bengaluru T-2 (BLR)  Arrive  Ranchi (IXR)  Seat No  1F  Zone No  1  Sequence  110  Air India Express Ltd.",
    expect: { count: 1, flight: "IX2690" },
  },
  {
    name: "IndiGo RYKFVW",
    text: "BA N SAL/SHRUTI/MS   KOZHIKODE (-)   To   BE N GALURU (T1)  Flight  6E 7576  Gate  -  Boarding Time  15:45 hrs  Boarding  Zone 2  Seat  7C  Tier :   BLU3   FFN :   024310333  Date   22 Apr 2026  Seq   0003  Departure   16:30  Services   CPML, CPTR  Gate is subject to change  BA N SAL/SHRUTI/MS KOZHIKODE (-)   To   BLR (T1)  PNR   RYKFVW  Flight   6E 7576  Date   22 Apr 2026  Seat   7C  Seq   0003  6E Curated Snack Bag",
    expect: { count: 1, flight: "6E7576" },
  },
  {
    name: "MMT e-ticket with fare breakdown",
    text: "E-Ticket Confirmation - MakeMyTrip  Booking ID: NN4FZG  Passenger: Mr. TARUN MEHRA  Flight Details  AI 505  Delhi (DEL) to Mumbai (BOM)  Date: 15 Mar 2026  Departure: 06:30  Arrival: 08:45  Seat: 14A  Class: Economy  Fare Breakdown  Base Fare: INR 4500  Tax: INR 850  Convenience Fee: INR 200  Total: INR 5550  Payment: HDFC Credit Card ending 4456  E-Ticket Number: 0987654321012  Air India  PNR: NN4FZG",
    expect: { count: 1, flight: "AI505" },
  },
  {
    name: "Multi-segment connecting flight",
    text: "E-Ticket Itinerary  PNR: ABCDEF  Passenger: MR RAHUL SHARMA  Flight 1  6E 2341  Departure: BLR  Arrival: DEL  Date: 10 Jun 2026  Time: 08:00  Seat: 22A  Flight 2  6E 879  Departure: DEL  Arrival: CCU  Date: 10 Jun 2026  Time: 12:30  Seat: 15F",
    expect: { count: 2, flights: ["6E2341", "6E879"] },
  },
];

let passed = 0, failed = 0;
for (const t of tests) {
  const result = flightMatches(t.text);
  const codes = result.map(r => r.code);
  
  let ok = true;
  if (t.expect.count !== undefined && result.length !== t.expect.count) ok = false;
  if (t.expect.flight && !codes.includes(t.expect.flight)) ok = false;
  if (t.expect.flights && !t.expect.flights.every(f => codes.includes(f))) ok = false;

  if (ok) {
    console.log(`✅ ${t.name}: ${codes.join(", ")} (${result.length} match${result.length !== 1 ? 'es' : ''})`);
    passed++;
  } else {
    console.log(`❌ ${t.name}: expected ${JSON.stringify(t.expect)}, got [${codes.join(", ")}] (${result.length})`);
    failed++;
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
