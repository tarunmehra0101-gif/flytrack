import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { parseTicketText } from "./src/lib/ticketParser.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  const pdfPath = path.resolve(__dirname, "public/Boarding_Pass(BLR-IXR).pdf");
  const buffer = fs.readFileSync(pdfPath);
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  const pages = [];
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str).join(" "));
  }
  const text = pages.join("\n").trim();
  console.log("EXTRACTED TEXT FROM Boarding_Pass(BLR-IXR).pdf:");
  
  const parsed1 = await parseTicketText(text, "pdf_eticket");
  console.log(JSON.stringify(parsed1, null, 2));
  
  const pdfPath2 = path.resolve(__dirname, "public/RYKFVW_1776746937406.pdf");
  const buffer2 = fs.readFileSync(pdfPath2);
  const pdf2 = await pdfjs.getDocument({ data: new Uint8Array(buffer2) }).promise;
  const pages2 = [];
  for (let pageNo = 1; pageNo <= pdf2.numPages; pageNo += 1) {
    const page = await pdf2.getPage(pageNo);
    const content = await page.getTextContent();
    pages2.push(content.items.map((item) => item.str).join(" "));
  }
  const text2 = pages2.join("\n").trim();
  console.log("\nEXTRACTED TEXT FROM RYKFVW_1776746937406.pdf:");
  
  const parsed2 = await parseTicketText(text2, "pdf_eticket");
  console.log(JSON.stringify(parsed2, null, 2));
}

run().catch(console.error);
