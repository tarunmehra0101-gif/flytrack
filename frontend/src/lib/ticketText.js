export async function loadPdfJsFromCdn() {
  if (window.pdfjsLib) return window.pdfjsLib;

  const cdns = [
    {
      src: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js",
      worker: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js"
    },
    {
      src: "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js",
      worker: "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js"
    },
    {
      src: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
      worker: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"
    }
  ];

  for (const cdn of cdns) {
    try {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Timeout loading PDF.js")), 8000);
        const script = document.createElement("script");
        script.src = cdn.src;
        script.onload = () => {
          clearTimeout(timer);
          if (window.pdfjsLib) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = cdn.worker;
            resolve(window.pdfjsLib);
          } else {
            reject(new Error("pdfjsLib not found on window after script load"));
          }
        };
        script.onerror = () => {
          clearTimeout(timer);
          reject(new Error("Failed to load PDF.js script"));
        };
        document.head.appendChild(script);
      });
      return window.pdfjsLib;
    } catch (err) {
      console.warn(`Failed to load PDF.js from CDN: ${cdn.src}, trying next...`, err);
    }
  }
  throw new Error("Failed to load PDF.js from all available CDNs. Please verify your internet connection.");
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
  try {
    const { createWorker } = await import("tesseract.js");
    
    const ocrPromise = (async () => {
      const worker = await createWorker("eng", 1);
      try {
        const result = await worker.recognize(file);
        return result?.data?.text || "";
      } finally {
        await worker.terminate();
      }
    })();

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout processing OCR")), 20000)
    );

    return await Promise.race([ocrPromise, timeoutPromise]);
  } catch (err) {
    console.error("OCR recognition or loading failed:", err);
    throw new Error("Unable to read text from this image. Please ensure you have a stable network connection to load the text recognition library, or try manually entering flight details.");
  }
}
