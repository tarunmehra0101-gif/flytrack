"""Inline test for the pdf_parser module — verifies blacklists work correctly."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from services.pdf_parser import parse_pdf_ticket

pdf_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "public")

for fname in ["Boarding_Pass(BLR-IXR).pdf", "RYKFVW_1776746937406.pdf"]:
    path = os.path.join(pdf_dir, fname)
    if not os.path.exists(path):
        print(f"SKIP: {fname} not found at {path}")
        continue
    with open(path, "rb") as f:
        result = parse_pdf_ticket(f.read())
    segs = result.get("segments", [])
    print(f"\n=== {fname} ===")
    print(f"  confidence: {result.get('confidence')}")
    print(f"  valid: {result.get('valid')}")
    print(f"  segments ({len(segs)}):")
    for s in segs:
        print(f"    flight_number={s.get('flight_number')}, from={s.get('from_airport')}, to={s.get('to_airport')}, date={s.get('flight_date_iso')}, seat={s.get('seat_number')}")
    if len(segs) != 1:
        print(f"  ⚠️  EXPECTED 1 SEGMENT, GOT {len(segs)}")
