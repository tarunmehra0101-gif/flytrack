async function ocrPdfPage(pdf, pageNo) {
  if (typeof document === "undefined") return "";
  const page = await pdf.getPage(pageNo);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: context, viewport }).promise;
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return "";
  return ocrImageFile(blob);
}

export async function extractPdfText(file, options = {}) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "https://unpkg.com/pdfjs-dist@5.7.284/legacy/build/pdf.worker.min.mjs";
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;
  const pages = [];
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str).join(" "));
  }
  const text = pages.join("\n").trim();
  if (text.length >= 80 || !options.ocrFallback) return text;

  const ocrPages = [];
  const maxPages = Math.min(pdf.numPages, options.maxOcrPages || 3);
  for (let pageNo = 1; pageNo <= maxPages; pageNo += 1) {
    try {
      const pageText = await ocrPdfPage(pdf, pageNo);
      if (pageText) ocrPages.push(pageText);
    } catch {
      // Keep the original extracted text as the fallback.
    }
  }
  return [text, ...ocrPages].filter(Boolean).join("\n");
}

export async function ocrImageFile(file) {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    workerPath: "https://unpkg.com/tesseract.js@7.0.0/dist/worker.min.js",
    corePath: "https://unpkg.com/tesseract.js-core@5.0.0",
  });
  try {
    const result = await worker.recognize(file);
    return result?.data?.text || "";
  } finally {
    await worker.terminate();
  }
}
