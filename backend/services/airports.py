"""Airport and airline reference data.

Curated seed list focused on common hubs for India-centric travel and
international routes most frequent for consultants. Expand as needed.
"""

from __future__ import annotations

import json
from pathlib import Path

CURATED_AIRPORTS: dict[str, dict] = {
    # India — metros
    "DEL": {"iata": "DEL", "name": "Indira Gandhi Intl", "city": "Delhi", "country": "IN", "lat": 28.5665, "lng": 77.1031, "tz": "Asia/Kolkata"},
    "BOM": {"iata": "BOM", "name": "Chhatrapati Shivaji Maharaj Intl", "city": "Mumbai", "country": "IN", "lat": 19.0887, "lng": 72.8679, "tz": "Asia/Kolkata"},
    "BLR": {"iata": "BLR", "name": "Kempegowda Intl", "city": "Bengaluru", "country": "IN", "lat": 13.1986, "lng": 77.7066, "tz": "Asia/Kolkata"},
    "MAA": {"iata": "MAA", "name": "Chennai Intl", "city": "Chennai", "country": "IN", "lat": 12.9941, "lng": 80.1709, "tz": "Asia/Kolkata"},
    "HYD": {"iata": "HYD", "name": "Rajiv Gandhi Intl", "city": "Hyderabad", "country": "IN", "lat": 17.2403, "lng": 78.4294, "tz": "Asia/Kolkata"},
    "CCU": {"iata": "CCU", "name": "Netaji Subhas Chandra Bose Intl", "city": "Kolkata", "country": "IN", "lat": 22.6547, "lng": 88.4467, "tz": "Asia/Kolkata"},
    # India — tier 2/3, tourist & regional
    "GOI": {"iata": "GOI", "name": "Dabolim", "city": "Goa", "country": "IN", "lat": 15.3808, "lng": 73.8314, "tz": "Asia/Kolkata"},
    "GOX": {"iata": "GOX", "name": "Manohar Intl (Mopa)", "city": "Goa", "country": "IN", "lat": 15.7432, "lng": 73.8693, "tz": "Asia/Kolkata"},
    "COK": {"iata": "COK", "name": "Cochin Intl", "city": "Kochi", "country": "IN", "lat": 10.1520, "lng": 76.4019, "tz": "Asia/Kolkata"},
    "AMD": {"iata": "AMD", "name": "Sardar Vallabhbhai Patel Intl", "city": "Ahmedabad", "country": "IN", "lat": 23.0772, "lng": 72.6347, "tz": "Asia/Kolkata"},
    "PNQ": {"iata": "PNQ", "name": "Pune", "city": "Pune", "country": "IN", "lat": 18.5822, "lng": 73.9197, "tz": "Asia/Kolkata"},
    "JAI": {"iata": "JAI", "name": "Jaipur Intl", "city": "Jaipur", "country": "IN", "lat": 26.8242, "lng": 75.8122, "tz": "Asia/Kolkata"},
    "LKO": {"iata": "LKO", "name": "Chaudhary Charan Singh Intl", "city": "Lucknow", "country": "IN", "lat": 26.7606, "lng": 80.8893, "tz": "Asia/Kolkata"},
    "TRV": {"iata": "TRV", "name": "Thiruvananthapuram Intl", "city": "Thiruvananthapuram", "country": "IN", "lat": 8.4821, "lng": 76.9200, "tz": "Asia/Kolkata"},
    "IXC": {"iata": "IXC", "name": "Chandigarh", "city": "Chandigarh", "country": "IN", "lat": 30.6735, "lng": 76.7885, "tz": "Asia/Kolkata"},
    "NAG": {"iata": "NAG", "name": "Dr. Babasaheb Ambedkar Intl", "city": "Nagpur", "country": "IN", "lat": 21.0922, "lng": 79.0472, "tz": "Asia/Kolkata"},
    "BBI": {"iata": "BBI", "name": "Biju Patnaik Intl", "city": "Bhubaneswar", "country": "IN", "lat": 20.2444, "lng": 85.8178, "tz": "Asia/Kolkata"},
    "VNS": {"iata": "VNS", "name": "Lal Bahadur Shastri Intl", "city": "Varanasi", "country": "IN", "lat": 25.4524, "lng": 82.8593, "tz": "Asia/Kolkata"},
    "PAT": {"iata": "PAT", "name": "Jay Prakash Narayan Intl", "city": "Patna", "country": "IN", "lat": 25.5913, "lng": 85.0880, "tz": "Asia/Kolkata"},
    "GAU": {"iata": "GAU", "name": "Lokpriya Gopinath Bordoloi Intl", "city": "Guwahati", "country": "IN", "lat": 26.1061, "lng": 91.5859, "tz": "Asia/Kolkata"},
    "IXB": {"iata": "IXB", "name": "Bagdogra", "city": "Siliguri", "country": "IN", "lat": 26.6812, "lng": 88.3286, "tz": "Asia/Kolkata"},
    "SXR": {"iata": "SXR", "name": "Srinagar Intl", "city": "Srinagar", "country": "IN", "lat": 33.9871, "lng": 74.7742, "tz": "Asia/Kolkata"},
    "IXL": {"iata": "IXL", "name": "Kushok Bakula Rimpochee", "city": "Leh", "country": "IN", "lat": 34.1359, "lng": 77.5465, "tz": "Asia/Kolkata"},
    "IDR": {"iata": "IDR", "name": "Devi Ahilya Bai Holkar", "city": "Indore", "country": "IN", "lat": 22.7217, "lng": 75.8011, "tz": "Asia/Kolkata"},
    "IXE": {"iata": "IXE", "name": "Mangaluru Intl", "city": "Mangaluru", "country": "IN", "lat": 12.9612, "lng": 74.8900, "tz": "Asia/Kolkata"},
    "VTZ": {"iata": "VTZ", "name": "Visakhapatnam Intl", "city": "Visakhapatnam", "country": "IN", "lat": 17.7212, "lng": 83.2245, "tz": "Asia/Kolkata"},
    "CJB": {"iata": "CJB", "name": "Coimbatore Intl", "city": "Coimbatore", "country": "IN", "lat": 11.0297, "lng": 77.0434, "tz": "Asia/Kolkata"},
    "TRZ": {"iata": "TRZ", "name": "Tiruchirappalli Intl", "city": "Tiruchirappalli", "country": "IN", "lat": 10.7654, "lng": 78.7097, "tz": "Asia/Kolkata"},
    "IXM": {"iata": "IXM", "name": "Madurai", "city": "Madurai", "country": "IN", "lat": 9.8345, "lng": 78.0934, "tz": "Asia/Kolkata"},
    "STV": {"iata": "STV", "name": "Surat", "city": "Surat", "country": "IN", "lat": 21.1140, "lng": 72.7417, "tz": "Asia/Kolkata"},
    "RPR": {"iata": "RPR", "name": "Swami Vivekananda", "city": "Raipur", "country": "IN", "lat": 21.1804, "lng": 81.7388, "tz": "Asia/Kolkata"},
    "ATQ": {"iata": "ATQ", "name": "Sri Guru Ram Dass Jee Intl", "city": "Amritsar", "country": "IN", "lat": 31.7096, "lng": 74.7973, "tz": "Asia/Kolkata"},
    "UDR": {"iata": "UDR", "name": "Maharana Pratap", "city": "Udaipur", "country": "IN", "lat": 24.6177, "lng": 73.8961, "tz": "Asia/Kolkata"},
    "IXZ": {"iata": "IXZ", "name": "Veer Savarkar Intl", "city": "Port Blair", "country": "IN", "lat": 11.6412, "lng": 92.7297, "tz": "Asia/Kolkata"},
    "IXR": {"iata": "IXR", "name": "Birsa Munda", "city": "Ranchi", "country": "IN", "lat": 23.3142, "lng": 85.3218, "tz": "Asia/Kolkata"},
    "CCJ": {"iata": "CCJ", "name": "Calicut Intl", "city": "Kozhikode", "country": "IN", "lat": 11.1368, "lng": 75.9553, "tz": "Asia/Kolkata"},
    # Middle East
    "DXB": {"iata": "DXB", "name": "Dubai Intl", "city": "Dubai", "country": "AE", "lat": 25.2532, "lng": 55.3657, "tz": "Asia/Dubai"},
    "AUH": {"iata": "AUH", "name": "Abu Dhabi Intl", "city": "Abu Dhabi", "country": "AE", "lat": 24.4330, "lng": 54.6511, "tz": "Asia/Dubai"},
    "DOH": {"iata": "DOH", "name": "Hamad Intl", "city": "Doha", "country": "QA", "lat": 25.2736, "lng": 51.6080, "tz": "Asia/Qatar"},
    "RUH": {"iata": "RUH", "name": "King Khalid Intl", "city": "Riyadh", "country": "SA", "lat": 24.9578, "lng": 46.6989, "tz": "Asia/Riyadh"},
    # USA
    "JFK": {"iata": "JFK", "name": "John F. Kennedy Intl", "city": "New York", "country": "US", "lat": 40.6413, "lng": -73.7781, "tz": "America/New_York"},
    "EWR": {"iata": "EWR", "name": "Newark Liberty Intl", "city": "Newark", "country": "US", "lat": 40.6895, "lng": -74.1745, "tz": "America/New_York"},
    "LAX": {"iata": "LAX", "name": "Los Angeles Intl", "city": "Los Angeles", "country": "US", "lat": 33.9416, "lng": -118.4085, "tz": "America/Los_Angeles"},
    "SFO": {"iata": "SFO", "name": "San Francisco Intl", "city": "San Francisco", "country": "US", "lat": 37.6213, "lng": -122.3790, "tz": "America/Los_Angeles"},
    "ORD": {"iata": "ORD", "name": "O'Hare Intl", "city": "Chicago", "country": "US", "lat": 41.9742, "lng": -87.9073, "tz": "America/Chicago"},
    "SEA": {"iata": "SEA", "name": "Seattle-Tacoma Intl", "city": "Seattle", "country": "US", "lat": 47.4502, "lng": -122.3088, "tz": "America/Los_Angeles"},
    "BOS": {"iata": "BOS", "name": "Logan Intl", "city": "Boston", "country": "US", "lat": 42.3656, "lng": -71.0096, "tz": "America/New_York"},
    "ATL": {"iata": "ATL", "name": "Hartsfield-Jackson Atlanta Intl", "city": "Atlanta", "country": "US", "lat": 33.6407, "lng": -84.4277, "tz": "America/New_York"},
    "IAD": {"iata": "IAD", "name": "Washington Dulles Intl", "city": "Washington", "country": "US", "lat": 38.9531, "lng": -77.4565, "tz": "America/New_York"},
    # Europe
    "LHR": {"iata": "LHR", "name": "Heathrow", "city": "London", "country": "GB", "lat": 51.4700, "lng": -0.4543, "tz": "Europe/London"},
    "LGW": {"iata": "LGW", "name": "Gatwick", "city": "London", "country": "GB", "lat": 51.1537, "lng": -0.1821, "tz": "Europe/London"},
    "CDG": {"iata": "CDG", "name": "Charles de Gaulle", "city": "Paris", "country": "FR", "lat": 49.0097, "lng": 2.5479, "tz": "Europe/Paris"},
    "FRA": {"iata": "FRA", "name": "Frankfurt am Main", "city": "Frankfurt", "country": "DE", "lat": 50.0379, "lng": 8.5622, "tz": "Europe/Berlin"},
    "MUC": {"iata": "MUC", "name": "Munich", "city": "Munich", "country": "DE", "lat": 48.3538, "lng": 11.7861, "tz": "Europe/Berlin"},
    "AMS": {"iata": "AMS", "name": "Schiphol", "city": "Amsterdam", "country": "NL", "lat": 52.3105, "lng": 4.7683, "tz": "Europe/Amsterdam"},
    "ZRH": {"iata": "ZRH", "name": "Zurich", "city": "Zurich", "country": "CH", "lat": 47.4647, "lng": 8.5492, "tz": "Europe/Zurich"},
    "IST": {"iata": "IST", "name": "Istanbul", "city": "Istanbul", "country": "TR", "lat": 41.2753, "lng": 28.7519, "tz": "Europe/Istanbul"},
    # Asia
    "SIN": {"iata": "SIN", "name": "Changi", "city": "Singapore", "country": "SG", "lat": 1.3644, "lng": 103.9915, "tz": "Asia/Singapore"},
    "HKG": {"iata": "HKG", "name": "Hong Kong Intl", "city": "Hong Kong", "country": "HK", "lat": 22.3080, "lng": 113.9185, "tz": "Asia/Hong_Kong"},
    "BKK": {"iata": "BKK", "name": "Suvarnabhumi", "city": "Bangkok", "country": "TH", "lat": 13.6900, "lng": 100.7501, "tz": "Asia/Bangkok"},
    "KUL": {"iata": "KUL", "name": "Kuala Lumpur Intl", "city": "Kuala Lumpur", "country": "MY", "lat": 2.7456, "lng": 101.7099, "tz": "Asia/Kuala_Lumpur"},
    "NRT": {"iata": "NRT", "name": "Narita Intl", "city": "Tokyo", "country": "JP", "lat": 35.7720, "lng": 140.3929, "tz": "Asia/Tokyo"},
    "HND": {"iata": "HND", "name": "Haneda", "city": "Tokyo", "country": "JP", "lat": 35.5494, "lng": 139.7798, "tz": "Asia/Tokyo"},
    "ICN": {"iata": "ICN", "name": "Incheon Intl", "city": "Seoul", "country": "KR", "lat": 37.4602, "lng": 126.4407, "tz": "Asia/Seoul"},
    "CMB": {"iata": "CMB", "name": "Bandaranaike Intl", "city": "Colombo", "country": "LK", "lat": 7.1808, "lng": 79.8842, "tz": "Asia/Colombo"},
    "KTM": {"iata": "KTM", "name": "Tribhuvan Intl", "city": "Kathmandu", "country": "NP", "lat": 27.6966, "lng": 85.3591, "tz": "Asia/Kathmandu"},
    # Oceania
    "SYD": {"iata": "SYD", "name": "Sydney Kingsford Smith", "city": "Sydney", "country": "AU", "lat": -33.9399, "lng": 151.1753, "tz": "Australia/Sydney"},
    "MEL": {"iata": "MEL", "name": "Melbourne", "city": "Melbourne", "country": "AU", "lat": -37.6690, "lng": 144.8410, "tz": "Australia/Melbourne"},
}


def _load_generated_airports() -> dict[str, dict]:
    path = Path(__file__).resolve().parent.parent / "data" / "airports_generated.json"
    if not path.exists():
        return {}
    try:
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
        return {str(k).upper(): v for k, v in data.items() if isinstance(v, dict)}
    except (OSError, json.JSONDecodeError):
        return {}


AIRPORTS: dict[str, dict] = {
    **_load_generated_airports(),
    **CURATED_AIRPORTS,
}

AIRLINES: dict[str, dict] = {
    "AI": {"iata": "AI", "name": "Air India"},
    "6E": {"iata": "6E", "name": "IndiGo"},
    "UK": {"iata": "UK", "name": "Vistara"},
    "SG": {"iata": "SG", "name": "SpiceJet"},
    "QP": {"iata": "QP", "name": "Akasa Air"},
    "I5": {"iata": "I5", "name": "AIX Connect"},
    "EK": {"iata": "EK", "name": "Emirates"},
    "EY": {"iata": "EY", "name": "Etihad Airways"},
    "QR": {"iata": "QR", "name": "Qatar Airways"},
    "SV": {"iata": "SV", "name": "Saudia"},
    "BA": {"iata": "BA", "name": "British Airways"},
    "LH": {"iata": "LH", "name": "Lufthansa"},
    "AF": {"iata": "AF", "name": "Air France"},
    "KL": {"iata": "KL", "name": "KLM"},
    "LX": {"iata": "LX", "name": "SWISS"},
    "SQ": {"iata": "SQ", "name": "Singapore Airlines"},
    "CX": {"iata": "CX", "name": "Cathay Pacific"},
    "TG": {"iata": "TG", "name": "Thai Airways"},
    "JL": {"iata": "JL", "name": "Japan Airlines"},
    "NH": {"iata": "NH", "name": "All Nippon Airways"},
    "KE": {"iata": "KE", "name": "Korean Air"},
    "UA": {"iata": "UA", "name": "United Airlines"},
    "AA": {"iata": "AA", "name": "American Airlines"},
    "DL": {"iata": "DL", "name": "Delta Air Lines"},
    "B6": {"iata": "B6", "name": "JetBlue"},
    "WN": {"iata": "WN", "name": "Southwest"},
    "AC": {"iata": "AC", "name": "Air Canada"},
    "QF": {"iata": "QF", "name": "Qantas"},
    "VS": {"iata": "VS", "name": "Virgin Atlantic"},
    "TK": {"iata": "TK", "name": "Turkish Airlines"},
    "UL": {"iata": "UL", "name": "SriLankan Airlines"},
}

AIRPORT_ALIASES = {
    "BANGALORE": "BLR",
    "BENGALURU": "BLR",
}


def lookup_airport(iata: str | None) -> dict | None:
    if not iata:
        return None
    return AIRPORTS.get(iata.upper())


def lookup_airline(iata: str | None) -> dict | None:
    if not iata:
        return None
    return AIRLINES.get(iata.upper())


def search_airports(query: str, limit: int = 10) -> list[dict]:
    if not query:
        priority = ["BLR", "DEL", "BOM", "HYD", "MAA", "CCU", "GOI", "GOX", "DXB", "SIN", "LHR"]
        return [AIRPORTS[c] for c in priority if c in AIRPORTS][:limit]
    q = query.strip().upper()
    if q in AIRPORT_ALIASES:
        return [AIRPORTS[AIRPORT_ALIASES[q]]]
    scored = []
    for code, row in AIRPORTS.items():
        city = str(row.get("city") or "").upper()
        name = str(row.get("name") or "").upper()
        icao = str(row.get("icao") or "").upper()
        keywords = str(row.get("keywords") or "").upper()
        if not (q in code or q in icao or q in city or q in name or q in keywords):
            continue
        score = 0
        if row.get("country") == "IN":
            score += 40
        if row.get("scheduled_service"):
            score += 20
        if code == q:
            score += 100
        elif code.startswith(q):
            score += 70
        if icao == q:
            score += 80
        if city.startswith(q):
            score += 45
        if name.startswith(q):
            score += 30
        scored.append((score, row))
    scored.sort(key=lambda item: (-item[0], item[1].get("iata", "")))
    return [row for _, row in scored[:limit]]


def search_airlines(query: str, limit: int = 10) -> list[dict]:
    if not query:
        return list(AIRLINES.values())[:limit]
    q = query.strip().upper()
    results = []
    for code, row in AIRLINES.items():
        if q in code or q in row["name"].upper():
            results.append(row)
        if len(results) >= limit:
            break
    return results
