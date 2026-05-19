/**
 * Browser-side boarding-pass barcode scanner.
 * Two modes:
 *   1. Live camera (continuous frame scanning)
 *   2. Static image file (multi-variant processing)
 */

import { BrowserMultiFormatReader } from "@zxing/browser";
import { DecodeHintType, BarcodeFormat } from "@zxing/library";

const hints = new Map();
hints.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.PDF_417,
  BarcodeFormat.AZTEC,
  BarcodeFormat.QR_CODE,
  BarcodeFormat.DATA_MATRIX,
]);
hints.set(DecodeHintType.TRY_HARDER, true);

/**
 * Check if camera access is available.
 */
export function isCameraAvailable() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/**
 * Start a live camera barcode scanner that continuously scans video frames.
 * @param {HTMLVideoElement} videoElement
 * @param {Function} onResult - Called with { text, format } when barcode found
 * @returns {Function} stop - Call to release camera and stop scanning
 */
export function startLiveScanner(videoElement, onResult) {
  let stopped = false;
  let stream = null;
  const reader = new BrowserMultiFormatReader(hints);

  const run = async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      videoElement.srcObject = stream;
      videoElement.setAttribute("playsinline", "true");
      await videoElement.play();
    } catch (err) {
      console.error("Camera access failed:", err);
      throw new Error("Camera access denied. Allow camera permission and try again.");
    }

    // Continuous scanning: capture frame -> decode -> repeat
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    const scanFrame = async () => {
      if (stopped || !videoElement.videoWidth) {
        if (!stopped) requestAnimationFrame(scanFrame);
        return;
      }

      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      ctx.drawImage(videoElement, 0, 0);

      try {
        const url = canvas.toDataURL("image/png");
        const result = await reader.decodeFromImageUrl(url);
        if (result && !stopped) {
          stopped = true;
          onResult({ text: result.getText(), format: result.getBarcodeFormat() });
          return;
        }
      } catch {
        // No barcode found in this frame — continue
      }

      if (!stopped) {
        // Scan ~4 frames per second (not every frame to save CPU)
        setTimeout(scanFrame, 250);
      }
    };

    // Wait for camera to warm up then start scanning
    setTimeout(scanFrame, 600);
  };

  run().catch((err) => {
    console.error("Scanner startup failed:", err);
  });

  return function stop() {
    stopped = true;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (videoElement) {
      videoElement.srcObject = null;
    }
  };
}

/**
 * Decode barcode from a static image file.
 */
export async function decodeBarcodeFromFile(file) {
  const reader = new BrowserMultiFormatReader(hints);
  const urls = [];
  try {
    const originalUrl = URL.createObjectURL(file);
    urls.push(originalUrl);
    try {
      const result = await reader.decodeFromImageUrl(originalUrl);
      return { text: result.getText(), format: result.getBarcodeFormat() };
    } catch {
      // Try processed canvases below.
    }

    const image = await loadImage(originalUrl);
    const variants = [
      makeCanvasVariant(image, { scale: 1.5, grayscale: true }),
      makeCanvasVariant(image, { scale: 2, grayscale: true, contrast: 1.35 }),
      makeCanvasVariant(image, { scale: 2, grayscale: true, invert: true }),
    ];
    for (const canvas of variants) {
      const url = canvas.toDataURL("image/png");
      urls.push(url);
      try {
        const result = await reader.decodeFromImageUrl(url);
        return { text: result.getText(), format: result.getBarcodeFormat() };
      } catch {
        // Continue trying variants.
      }
    }
    throw new Error("Couldn't read the barcode. Try getting closer or use a clearer image.");
  } finally {
    urls.forEach((url) => {
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    });
  }
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function makeCanvasVariant(image, opts = {}) {
  const scale = opts.scale || 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const contrast = opts.contrast || 1;
  for (let i = 0; i < data.data.length; i += 4) {
    let r = data.data[i], g = data.data[i + 1], b = data.data[i + 2];
    if (opts.grayscale) { const y = 0.299 * r + 0.587 * g + 0.114 * b; r = g = b = y; }
    r = ((r - 128) * contrast) + 128;
    g = ((g - 128) * contrast) + 128;
    b = ((b - 128) * contrast) + 128;
    if (opts.invert) { r = 255 - r; g = 255 - g; b = 255 - b; }
    data.data[i] = Math.max(0, Math.min(255, r));
    data.data[i + 1] = Math.max(0, Math.min(255, g));
    data.data[i + 2] = Math.max(0, Math.min(255, b));
  }
  ctx.putImageData(data, 0, 0);
  return canvas;
}

export async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
