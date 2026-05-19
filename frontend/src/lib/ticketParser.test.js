import { parseBcbp } from "./bcbpParser";
import { parseTicketText } from "./ticketParser";

const BLR_IXR_TEXT = `
Reeta Kumari
PNR EV9WKL
Depart Bengaluru T-2 (BLR)
Boarding Time 16.45 hrs, 11 Jun 25
Departure Time 17.25 hrs, 11 Jun 25
Gate D11
Arrive Ranchi (IXR)
Flight No IX 2690
Seat No 1F
`;

const RYKFVW_TEXT = `
SAL/SHRUTI/MS
KOZHIKODE (-) To BE N GALURU (T1)
Flight 6E 7576
Boarding Time 15:45 hrs
Seat 7C
Date 22 Apr 2026
Departure 16:30
KOZHIKODE (-) To BLR (T1)
PNR RYKFVW
`;

describe("ticket parser fixtures", () => {
  test("parses the BLR to IXR Air India Express boarding pass text", async () => {
    const parsed = await parseTicketText(BLR_IXR_TEXT, "pdf_eticket");
    expect(parsed.segments).toHaveLength(1);
    expect(parsed.segments[0]).toMatchObject({
      airline_iata: "IX",
      flight_number: "IX2690",
      departure_airport_iata: "BLR",
      arrival_airport_iata: "IXR",
      flight_date: "2025-06-11",
      departure_time_local: "17:25",
      gate: "D11",
      seat_number: "1F",
      pnr: "EV9WKL",
    });
  });

  test("parses the RYKFVW IndiGo boarding pass text", async () => {
    const parsed = await parseTicketText(RYKFVW_TEXT, "pdf_eticket");
    expect(parsed.segments).toHaveLength(1);
    expect(parsed.segments[0]).toMatchObject({
      airline_iata: "6E",
      flight_number: "6E7576",
      departure_airport_iata: "CCJ",
      arrival_airport_iata: "BLR",
      flight_date: "2026-04-22",
      departure_time_local: "16:30",
      seat_number: "7C",
      pnr: "RYKFVW",
    });
  });

  test("barcode-only BCBP keeps date but does not invent a departure time", () => {
    const parsed = parseBcbp("M1DESMARAIS/LUC       EABC123 YULFRAAC 0834 226F001A0025 100");
    expect(parsed).toMatchObject({
      airline_iata: "AC",
      flight_number: "AC834",
      departure_airport_iata: "YUL",
      arrival_airport_iata: "FRA",
      time_confidence: "barcode_date_only",
    });
  });
});
