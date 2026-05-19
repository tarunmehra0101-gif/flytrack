import { GLOBAL_AIRPORTS } from "@/data/globalAirports.generated";

// India-heavy overrides keep names/cities polished while the generated
// OurAirports dataset gives Ryoko global IATA coverage.
const CURATED_AIRPORTS = {
  DEL: { iata: "DEL", city: "Delhi", country: "IN", lat: 28.5665, lng: 77.1031 },
  BOM: { iata: "BOM", city: "Mumbai", country: "IN", lat: 19.0887, lng: 72.8679 },
  BLR: { iata: "BLR", city: "Bengaluru", country: "IN", lat: 13.1986, lng: 77.7066 },
  MAA: { iata: "MAA", city: "Chennai", country: "IN", lat: 12.9941, lng: 80.1709 },
  HYD: { iata: "HYD", city: "Hyderabad", country: "IN", lat: 17.2403, lng: 78.4294 },
  CCU: { iata: "CCU", city: "Kolkata", country: "IN", lat: 22.6547, lng: 88.4467 },
  GOI: { iata: "GOI", city: "Goa", country: "IN", lat: 15.3808, lng: 73.8314 },
  COK: { iata: "COK", city: "Kochi", country: "IN", lat: 10.1520, lng: 76.4019 },
  AMD: { iata: "AMD", city: "Ahmedabad", country: "IN", lat: 23.0772, lng: 72.6347 },
  PNQ: { iata: "PNQ", city: "Pune", country: "IN", lat: 18.5822, lng: 73.9197 },
  DXB: { iata: "DXB", city: "Dubai", country: "AE", lat: 25.2532, lng: 55.3657 },
  AUH: { iata: "AUH", city: "Abu Dhabi", country: "AE", lat: 24.433, lng: 54.6511 },
  DOH: { iata: "DOH", city: "Doha", country: "QA", lat: 25.2736, lng: 51.608 },
  JFK: { iata: "JFK", city: "New York", country: "US", lat: 40.6413, lng: -73.7781 },
  EWR: { iata: "EWR", city: "Newark", country: "US", lat: 40.6895, lng: -74.1745 },
  LAX: { iata: "LAX", city: "Los Angeles", country: "US", lat: 33.9416, lng: -118.4085 },
  SFO: { iata: "SFO", city: "San Francisco", country: "US", lat: 37.6213, lng: -122.379 },
  ORD: { iata: "ORD", city: "Chicago", country: "US", lat: 41.9742, lng: -87.9073 },
  SEA: { iata: "SEA", city: "Seattle", country: "US", lat: 47.4502, lng: -122.3088 },
  BOS: { iata: "BOS", city: "Boston", country: "US", lat: 42.3656, lng: -71.0096 },
  ATL: { iata: "ATL", city: "Atlanta", country: "US", lat: 33.6407, lng: -84.4277 },
  IAD: { iata: "IAD", city: "Washington", country: "US", lat: 38.9531, lng: -77.4565 },
  LHR: { iata: "LHR", city: "London", country: "GB", lat: 51.47, lng: -0.4543 },
  LGW: { iata: "LGW", city: "London", country: "GB", lat: 51.1537, lng: -0.1821 },
  CDG: { iata: "CDG", city: "Paris", country: "FR", lat: 49.0097, lng: 2.5479 },
  FRA: { iata: "FRA", city: "Frankfurt", country: "DE", lat: 50.0379, lng: 8.5622 },
  MUC: { iata: "MUC", city: "Munich", country: "DE", lat: 48.3538, lng: 11.7861 },
  AMS: { iata: "AMS", city: "Amsterdam", country: "NL", lat: 52.3105, lng: 4.7683 },
  ZRH: { iata: "ZRH", city: "Zurich", country: "CH", lat: 47.4647, lng: 8.5492 },
  SIN: { iata: "SIN", city: "Singapore", country: "SG", lat: 1.3644, lng: 103.9915 },
  HKG: { iata: "HKG", city: "Hong Kong", country: "HK", lat: 22.308, lng: 113.9185 },
  BKK: { iata: "BKK", city: "Bangkok", country: "TH", lat: 13.69, lng: 100.7501 },
  KUL: { iata: "KUL", city: "Kuala Lumpur", country: "MY", lat: 2.7456, lng: 101.7099 },
  NRT: { iata: "NRT", city: "Tokyo", country: "JP", lat: 35.772, lng: 140.3929 },
  HND: { iata: "HND", city: "Tokyo", country: "JP", lat: 35.5494, lng: 139.7798 },
  ICN: { iata: "ICN", city: "Seoul", country: "KR", lat: 37.4602, lng: 126.4407 },
  SYD: { iata: "SYD", city: "Sydney", country: "AU", lat: -33.9399, lng: 151.1753 },
  MEL: { iata: "MEL", city: "Melbourne", country: "AU", lat: -37.669, lng: 144.841 },
};

export const AIRPORTS = {
  ...GLOBAL_AIRPORTS,
  ...CURATED_AIRPORTS,
};

export const AIRLINES = {
  AI: "Air India", "6E": "IndiGo", UK: "Vistara", SG: "SpiceJet", QP: "Akasa Air",
  IX: "Air India Express",
  EK: "Emirates", EY: "Etihad", QR: "Qatar Airways",
  BA: "British Airways", LH: "Lufthansa", AF: "Air France", KL: "KLM", LX: "SWISS",
  SQ: "Singapore Airlines", CX: "Cathay Pacific", TG: "Thai Airways",
  JL: "Japan Airlines", NH: "ANA", KE: "Korean Air",
  UA: "United", AA: "American", DL: "Delta", B6: "JetBlue", WN: "Southwest",
  AC: "Air Canada", QF: "Qantas", VS: "Virgin Atlantic", TK: "Turkish Airlines",
};
