import fs from "node:fs";
import path from "node:path";

const input = process.argv[2] || "/tmp/ourairports-airports.csv";
const root = process.cwd();

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"' && line[i + 1] === '"') {
      cur += '"';
      i += 1;
    } else if (ch === '"') {
      quoted = !quoted;
    } else if (ch === "," && !quoted) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parseCsv(text) {
  const rows = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(rows.shift());
  return rows.map((line) => {
    const cells = parseCsvLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, cells[i] || ""]));
  });
}

function cleanName(name) {
  return String(name || "")
    .replace(/\s+Airport$/i, "")
    .replace(/\s+International$/i, " Intl")
    .trim();
}

const text = fs.readFileSync(input, "utf8");
const rows = parseCsv(text)
  .filter((row) => row.iata_code && row.latitude_deg && row.longitude_deg)
  .filter((row) => row.type !== "closed")
  .map((row) => ({
    iata: row.iata_code,
    icao: row.icao_code || row.gps_code || row.ident || "",
    ident: row.ident || "",
    name: cleanName(row.name),
    city: row.municipality || row.name || row.iata_code,
    country: row.iso_country || "",
    region: row.iso_region || "",
    lat: Number(row.latitude_deg),
    lng: Number(row.longitude_deg),
    elevation_ft: row.elevation_ft ? Number(row.elevation_ft) : null,
    type: row.type || "",
    scheduled_service: row.scheduled_service === "yes",
    wikipedia_link: row.wikipedia_link || "",
    keywords: row.keywords || "",
  }))
  .filter((row) => Number.isFinite(row.lat) && Number.isFinite(row.lng));

rows.sort((a, b) => {
  if (a.country === "IN" && b.country !== "IN") return -1;
  if (a.country !== "IN" && b.country === "IN") return 1;
  if (a.scheduled_service !== b.scheduled_service) return a.scheduled_service ? -1 : 1;
  return a.iata.localeCompare(b.iata);
});

const byIata = Object.fromEntries(rows.map((row) => [row.iata, row]));
const header = `// Generated from OurAirports airports.csv. Do not edit manually.\n// Run: node scripts/generate_airports_from_ourairports.mjs /path/to/airports.csv\n`;

fs.mkdirSync(path.join(root, "frontend/src/data"), { recursive: true });
fs.writeFileSync(
  path.join(root, "frontend/src/data/globalAirports.generated.js"),
  `${header}export const GLOBAL_AIRPORTS = ${JSON.stringify(byIata, null, 2)};\n`,
);

fs.mkdirSync(path.join(root, "backend/data"), { recursive: true });
fs.writeFileSync(
  path.join(root, "backend/data/airports_generated.json"),
  JSON.stringify(byIata, null, 2),
);

console.log(`Generated ${rows.length} airports with IATA codes.`);
