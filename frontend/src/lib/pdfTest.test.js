import { parseTicketText } from "./ticketParser";

// BLR-IXR boarding pass
const blrText = `Boarding Pass  Reeta Kumari  PNR   EV9WKL  Depart  Bengaluru T-2 (BLR)  Boarding Time  16.45 hrs, 11 Jun 25  Departure Time  17.25 hrs, 11 Jun 25  Gate  D11  Add Ons  PVIP, NCJB, PBCA, VLPR  Arrive  Ranchi (IXR)  Flight No  IX 2690  Seat No  1F  Zone  1  Sequence  110  Check-in counters closes 1 hour before departure for metro airports (domestic & international) and 45 minutes for domestic flights at other airports Boarding gates close 25 min before departure  We may change our schedule, cancel, terminate, divert or reschedule any flight we reasonably consider justified by circumstances beyond our control or for commercial or safety reasons.Frisking of passengers and checking of hand baggage is mandatory. Please co-operate with security staff.Booking on airindiaexpress.com and being a part of our loyalty program is not mandatory but is strongly recommended for fast bookings, fab deals & fantastic value.  Airline Copy  Reeta Kumari  Departure Time  17.25 hrs, 11 Jun 25  Flight No  IX 2690  Depart  Bengaluru T-2 (BLR)  Arrive  Ranchi (IXR)  Seat No  1F  Zone No  1  Sequence  110  Air India Express Ltd. is a wholly owned subsidiary of Air India Ltd.`;

// IndiGo e-ticket
const rykText = `BA N SAL/SHRUTI/MS   KOZHIKODE (-)   To   BE N GALURU (T1)  Flight  6E 7576  Gate  -  Boarding Time  15:45 hrs  Boarding  Zone 2  Seat  7C  Tier :   BLU3   FFN :   024310333  Date   22 Apr 2026  Seq   0003  Departure   16:30  Services   CPML, CPTR  Gate is subject to change and will close 25 minutes prior to departure  BA N SAL/SHRUTI/MS KOZHIKODE (-)   To   BLR (T1)  PNR   RYKFVW  Flight   6E 7576  Date   22 Apr 2026  Services   CPML, CPTR  Seat   7C  Seq   0003  6E Curated Snack Bag, Corp Booking T & C Apply  Boarding Pass (Web Check-In)   Your Departure Terminal is T-`;

// Synthetic: MakeMyTrip-style e-ticket with fare breakdown (common false-positive source)
const mmtText = `E-Ticket Confirmation - MakeMyTrip  Booking ID: NN4FZG  Passenger: Mr. TARUN MEHRA  Flight Details  AI 505  Delhi (DEL) to Mumbai (BOM)  Date: 15 Mar 2026  Departure: 06:30  Arrival: 08:45  Seat: 14A  Class: Economy  Fare Breakdown  Base Fare: INR 4500  Tax: INR 850  Convenience Fee: INR 200  Total: INR 5550  Payment: HDFC Credit Card ending 4456  E-Ticket Number: 0987654321012  Air India  PNR: NN4FZG`;

// Synthetic: multi-segment (connecting flight)
const multiText = `E-Ticket Itinerary  PNR: ABCDEF  Passenger: MR RAHUL SHARMA  Flight 1  6E 2341  Departure: BLR  Arrival: DEL  Date: 10 Jun 2026  Time: 08:00  Seat: 22A  Flight 2  6E 879  Departure: DEL  Arrival: CCU  Date: 10 Jun 2026  Time: 12:30  Seat: 15F`;

describe("Comprehensive PDF parser accuracy tests", () => {
  test("BLR-IXR: should return exactly 1 segment with IX2690", async () => {
    const r = await parseTicketText(blrText, "pdf_eticket");
    expect(r.segments.length).toBe(1);
    expect(r.segments[0].flight_number).toBe("IX2690");
    expect(r.segments[0].departure_airport_iata).toBe("BLR");
    expect(r.segments[0].arrival_airport_iata).toBe("IXR");
    expect(r.segments[0].flight_date).toBe("2025-06-11");
    expect(r.segments[0].seat_number).toBe("1F");
    expect(r.segments[0].pnr).toBe("EV9WKL");
  });

  test("RYKFVW: should return exactly 1 segment with 6E7576", async () => {
    const r = await parseTicketText(rykText, "pdf_eticket");
    expect(r.segments.length).toBe(1);
    expect(r.segments[0].flight_number).toBe("6E7576");
    expect(r.segments[0].departure_airport_iata).toBe("CCJ");
    expect(r.segments[0].arrival_airport_iata).toBe("BLR");
    expect(r.segments[0].flight_date).toBe("2026-04-22");
    expect(r.segments[0].seat_number).toBe("7C");
    expect(r.segments[0].pnr).toBe("RYKFVW");
  });

  test("MMT-style: should return exactly 1 segment with AI505, not confused by fare numbers", async () => {
    const r = await parseTicketText(mmtText, "pdf_eticket");
    expect(r.segments.length).toBe(1);
    expect(r.segments[0].flight_number).toBe("AI505");
    expect(r.segments[0].departure_airport_iata).toBe("DEL");
    expect(r.segments[0].arrival_airport_iata).toBe("BOM");
    expect(r.segments[0].flight_date).toBe("2026-03-15");
    expect(r.segments[0].pnr).toBe("NN4FZG");
  });

  test("Multi-segment: should return exactly 2 segments", async () => {
    const r = await parseTicketText(multiText, "pdf_eticket");
    expect(r.segments.length).toBe(2);
    expect(r.segments[0].flight_number).toBe("6E2341");
    expect(r.segments[0].departure_airport_iata).toBe("BLR");
    expect(r.segments[0].arrival_airport_iata).toBe("DEL");
    expect(r.segments[1].flight_number).toBe("6E879");
    expect(r.segments[1].departure_airport_iata).toBe("DEL");
    expect(r.segments[1].arrival_airport_iata).toBe("CCU");
  });
});
