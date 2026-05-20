import os
import sys
import json
from services.pdf_parser import parse_pdf_ticket

def run():
    pdf_path = "/Users/kumarlouhit/Documents/flytrack-main/frontend/public/Boarding_Pass(BLR-IXR).pdf"
    with open(pdf_path, "rb") as f:
        pdf_bytes = f.read()
    result = parse_pdf_ticket(pdf_bytes)
    print("PYTHON PARSE RESULT FOR Boarding_Pass(BLR-IXR).pdf:")
    print(json.dumps(result, indent=2))
    
    pdf_path2 = "/Users/kumarlouhit/Documents/flytrack-main/frontend/public/RYKFVW_1776746937406.pdf"
    with open(pdf_path2, "rb") as f:
        pdf_bytes2 = f.read()
    result2 = parse_pdf_ticket(pdf_bytes2)
    print("\nPYTHON PARSE RESULT FOR RYKFVW_1776746937406.pdf:")
    print(json.dumps(result2, indent=2))

if __name__ == "__main__":
    run()
