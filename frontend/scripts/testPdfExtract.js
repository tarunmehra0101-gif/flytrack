const fs = require("fs");
const path = require("path");

async function extractText(filePath) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = path.resolve("./node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs");

  const buffer = fs.readFileSync(filePath);
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    disableFontFace: true,
  });

  const pdf = await loadingTask.promise;
  const pages = [];
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(" ");
    pages.push(pageText);
  }
  return pages.join("\n").trim();
}

async function run() {
  try {
    const files = [
      "Boarding_Pass(BLR-IXR).pdf",
      "RYKFVW_1776746937406.pdf"
    ];
    for (const file of files) {
      const fullPath = path.join(__dirname, "../public", file);
      console.log(`\n========================================`);
      console.log(`Extracting text from: ${file}`);
      console.log(`========================================`);
      const text = await extractText(fullPath);
      console.log(`Length: ${text.length} characters`);
      console.log(`--- Preview (first 1000 chars) ---`);
      console.log(text.slice(0, 1000));
      console.log(`--- End of Preview ---`);
    }
  } catch (err) {
    console.error("Extraction error:", err);
  }
}

run();
