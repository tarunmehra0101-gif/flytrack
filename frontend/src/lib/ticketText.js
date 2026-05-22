export async function loadPdfJsFromCdn() {
  if (window.pdfjsLib) return window.pdfjsLib;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Timeout loading PDF.js from CDN"));
    }, 10000);

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js";
    script.onload = () => {
      clearTimeout(timer);
      const pdfjs = window.pdfjsLib;
      if (pdfjs) {
        pdfjs.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
        resolve(pdfjs);
      } else {
        reject(new Error("pdfjsLib not found on window after script load"));
      }
    };
    script.onerror = () => {
      clearTimeout(timer);
      reject(new Error("Failed to load PDF.js from CDN"));
    };
    document.head.appendChild(script);
  });
}

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
  const pdfjs = await loadPdfJsFromCdn();
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
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
  
  const ocrPromise = (async () => {
    const worker = await createWorker("eng", 1, {
      workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/worker.min.js",
      corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0",
    });
    try {
      const result = await worker.recognize(file);
      return result?.data?.text || "";
    } finally {
      await worker.terminate();
    }
  })();

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Timeout processing OCR")), 10000)
  );

  return Promise.race([ocrPromise, timeoutPromise]);
}
