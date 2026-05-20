import { parseTicketText } from "./ticketParser";

describe("Test parseTicketText on actual extracted PDF texts", () => {
  test("Boarding_Pass(BLR-IXR).pdf text", async () => {
    const text = "Boarding Pass  Reeta Kumari  PNR   EV9WKL  Depart  Bengaluru T-2 (BLR)  Boarding Time  16.45 hrs, 11 Jun 25  Departure Time  17.25 hrs, 11 Jun 25  Gate  D11  Add Ons  PVIP, NCJB, PBCA, VLPR  Arrive  Ranchi (IXR)  Flight No  IX 2690  Seat No  1F  Zone  1  Sequence  110  Check-in counters closes 1 hour before departure for metro airports (domestic & international) and 45 minutes for domestic flights at other airports Boarding gates close 25 min before departure  We may change our schedule, cancel, terminate, divert or reschedule any flight we reasonably consider justified by circumstances beyond our control or for commercial or safety reasons.Frisking of passengers and checking of hand baggage is mandatory. Please co-operate with security staff.Booking on airindiaexpress.com and being a part of our loyalty program is not mandatory but is strongly recommended for fast bookings, fab deals & fantastic value.  Airline Copy  Reeta Kumari  Departure Time  17.25 hrs, 11 Jun 25  Flight No  IX 2690  Depart  Bengaluru T-2 (BLR)  Arrive  Ranchi (IXR)  Seat No  1F  Zone No  1  Sequence  110  Air India Express Ltd. is a wholly owned subsidiary of Air India Ltd.";
    const parsed = await parseTicketText(text, "pdf_eticket");
    console.log("BLR-IXR PARSED SEGMENTS:", JSON.stringify(parsed.segments, null, 2));
  });

  test("RYKFVW_1776746937406.pdf text", async () => {
    const text = "BA N SAL/SHRUTI/MS   KOZHIKODE (-)   To   BE N GALURU (T1)  Flight  6E 7576  Gate  -  Boarding Time  15:45 hrs  Boarding  Zone 2  Seat  7C  Tier :   BLU3   FFN :   024310333  Date   22 Apr 2026  Seq   0003  Departure   16:30  Services   CPML, CPTR  Gate is subject to change and will close 25 minutes prior to departure  BA N SAL/SHRUTI/MS KOZHIKODE (-)   To   BLR (T1)  PNR   RYKFVW  Flight   6E 7576  Date   22 Apr 2026  Services   CPML, CPTR  Seat   7C  Seq   0003  6E Curated Snack Bag, Corp Booking T & C Apply  Boarding Pass (Web Check-In)   Your Departure Terminal is T-";
    const parsed = await parseTicketText(text, "pdf_eticket");
    console.log("RYKFVW PARSED SEGMENTS:", JSON.stringify(parsed.segments, null, 2));
  });
});
