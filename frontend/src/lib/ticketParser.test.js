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

  test("parses full raw PDF text from Boarding_Pass(BLR-IXR).pdf", async () => {
    const rawText = "Boarding Pass  Reeta Kumari  PNR   EV9WKL  Depart  Bengaluru T-2 (BLR)  Boarding Time  16.45 hrs, 11 Jun 25  Departure Time  17.25 hrs, 11 Jun 25  Gate  D11  Add Ons  PVIP, NCJB, PBCA, VLPR  Arrive  Ranchi (IXR)  Flight No  IX 2690  Seat No  1F  Zone  1  Sequence  110  Check-in counters closes 1 hour before departure for metro airports (domestic & international) and 45 minutes for domestic flights at other airports Boarding gates close 25 min before departure  We may change our schedule, cancel, terminate, divert or reschedule any flight we reasonably consider justified by circumstances beyond our control or for commercial or safety reasons.Frisking of passengers and checking of hand baggage is mandatory. Please co-operate with security staff.Booking on airindiaexpress.com and being a part of our loyalty program is not mandatory but is strongly recommended for fast bookings, fab deals & fantastic value.  Airline Copy  Reeta Kumari  Departure Time  17.25 hrs, 11 Jun 25  Flight No  IX 2690 Seat No 1F Zone 1 Sequence 110 Boarding Time 16.45 hrs, 11 Jun 25 Gate D11 Depart Bengaluru T-2 (BLR) Arrive Ranchi (IXR) PNR EV9WKL";
    const parsed = await parseTicketText(rawText, "pdf_eticket");
    console.log("Boarding Pass (BLR-IXR) Parsed Result:", JSON.stringify(parsed, null, 2));
    expect(parsed.segments).toHaveLength(1);
    expect(parsed.segments[0]).toMatchObject({
      airline_iata: "IX",
      flight_number: "IX2690",
      departure_airport_iata: "BLR",
      arrival_airport_iata: "IXR",
      flight_date: "2025-06-11",
      departure_time_local: "17:25",
      seat_number: "1F",
      pnr: "EV9WKL",
    });
  });

  test("parses full raw PDF text from RYKFVW_1776746937406.pdf", async () => {
    const rawText = "BA N SAL/SHRUTI/MS   KOZHIKODE (-)   To   BE N GALURU (T1)  Flight  6E 7576  Gate  -  Boarding Time  15:45 hrs  Boarding  Zone 2  Seat  7C  Tier :   BLU3   FFN :   024310333  Date   22 Apr 2026  Seq   0003  Departure   16:30  Services   CPML, CPTR  Gate is subject to change and will close 25 minutes prior to departure  BA N SAL/SHRUTI/MS KOZHIKODE (-)   To   BLR (T1)  PNR   RYKFVW  Flight   6E 7576  Date   22 Apr 2026  Services   CPML, CPTR  Seat   7C  Seq   0003  6E Curated Snack Bag, Corp Booking T & C Apply  Boarding Pass (Web Check-In)   Your Departure Terminal is T-1";
    const parsed = await parseTicketText(rawText, "pdf_eticket");
    console.log("RYKFVW Parsed Result:", JSON.stringify(parsed, null, 2));
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
