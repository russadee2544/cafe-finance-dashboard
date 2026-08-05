import { createWorker } from 'tesseract.js';
import type { ReceiptScanResult } from '../types/finance';
import { parseReceiptText } from './receiptParser';
import { parseReceiptWithGemini } from './geminiVisionOcr';
import { getGeminiApiKey } from './storage';

type ProgressCallback = (status: string, progress: number) => void;

let progressCallback: ProgressCallback | null = null;

let workerPromise: Promise<Awaited<ReturnType<typeof createWorker>>> | null = null;

// Self-hosted tesseract assets so OCR works offline / inside the PWA
// (files live in /public/tess, copied at build time)
const TESS_PATHS = {
  workerPath: '/tess/worker.min.js',
  corePath: '/tess',
  langPath: '/tess/lang',
};

function getWorker(): Promise<Awaited<ReturnType<typeof createWorker>>> {
  if (!workerPromise) {
    workerPromise = createWorker('tha+eng', 1, {
      ...TESS_PATHS,
      logger: (m) => {
        if (progressCallback) {
          progressCallback(m.status, m.progress);
        }
      },
    }).catch((err) => {
      workerPromise = null;
      throw err;
    });
  }
  return workerPromise;
}

export const terminateOcrWorker = async (): Promise<void> => {
  if (workerPromise) {
    try {
      const worker = await workerPromise;
      await worker.terminate();
    } catch {
      // ignore cleanup errors
    }
    workerPromise = null;
  }
};

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('ไม่สามารถอ่านรูปภาพได้'));
    };
    img.src = url;
  });
}

// Camera photos are huge (several megapixels). Downscale before OCR so phones
// can process the image quickly and reliably.
async function downscaleToCanvas(file: File, maxDim = 2000): Promise<HTMLCanvasElement> {
  let source: ImageBitmap | HTMLImageElement;
  if (typeof createImageBitmap === 'function') {
    source = await createImageBitmap(file);
  } else {
    source = await loadImageElement(file);
  }
  try {
    const scale = Math.min(1, maxDim / Math.max(source.width, source.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(source.width * scale));
    canvas.height = Math.max(1, Math.round(source.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('ไม่สามารถวาดภาพลง canvas ได้');
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    if ('close' in source) {
      source.close();
    }
  }
}

// ---------- Tesseract fallback ----------
async function parseWithTesseract(
  file: File,
  onProgress?: ProgressCallback,
): Promise<ReceiptScanResult> {
  const previous = progressCallback;
  progressCallback = onProgress || null;
  try {
    const canvas = await downscaleToCanvas(file);
    const worker = await getWorker();
    const { data } = await worker.recognize(canvas);
    const parsed = parseReceiptText(data.text || '');
    return {
      ...parsed,
      confidence: Math.round(data.confidence * 100) / 100,
      rawText: data.text || '',
    };
  } finally {
    progressCallback = previous;
  }
}

// ---------- Main entry point ----------
export const parseReceiptImage = async (
  file: File,
  onProgress?: ProgressCallback,
): Promise<ReceiptScanResult> => {
  const apiKey = getGeminiApiKey();

  // If Gemini API Key is configured, use Gemini Vision as primary
  if (apiKey) {
    try {
      const geminiResult = await parseReceiptWithGemini(file, apiKey, onProgress);
      return {
        storeName: geminiResult.storeName,
        date: geminiResult.date,
        totalAmount: geminiResult.totalAmount,
        category: geminiResult.category,
        confidence: geminiResult.confidence,
        rawText: `[Gemini Vision AI] paymentMethod: ${geminiResult.paymentMethod}`,
        items: geminiResult.items,
      };
    } catch (err) {
      // If Gemini fails, fallback to Tesseract
      console.warn('Gemini Vision failed, falling back to Tesseract:', err);
      onProgress?.('Gemini ล้มเหลว กำลังสลับไปใช้ Tesseract OCR...', 0.1);
    }
  }

  // Fallback: Tesseract OCR (offline)
  return parseWithTesseract(file, onProgress);
};
