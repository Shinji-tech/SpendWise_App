import type { CategoryId } from "./data";

export type ScanProgress = { progress: number; stage: string };
export type ExtractedReceipt = {
  merchant?: { value: string; confidence: number };
  amount?: { value: number; confidence: number };
  date?: { value: string; confidence: number };
  category?: { value: CategoryId; confidence: number };
};

const CATEGORY_KEYWORDS: Record<CategoryId, string[]> = {
  food: ["restaurant", "cafe", "coffee", "food", "grocery", "market", "supermarket", "nha hang", "quan an", "cua hang tien loi", "thuc pham"],
  transport: ["taxi", "grab", "be ", "bus", "fuel", "petrol", "parking", "transport", "xang", "xe om", "di chuyen"],
  shopping: ["shop", "store", "mall", "fashion", "clothing", "online order", "mua sam", "thoi trang"],
  utilities: ["electricity", "water bill", "internet", "mobile bill", "utility", "dien luc", "tien nuoc", "vien thong"],
  housing: ["rent", "apartment", "property", "housing", "thue nha", "can ho"],
  other: [],
};

const ACCENTED = /[\u0300-\u036f]/g;

function normalize(text: string): string {
  return text.normalize("NFD").replace(ACCENTED, "").replace(/đ/gi, "d").toLowerCase();
}

function parseAmount(text: string): number | undefined {
  const digits = text.replace(/\D/g, "");
  if (digits.length < 2 || digits.length > 15) return undefined;
  const amount = Number(digits);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : undefined;
}

function parseDate(text: string): string | undefined {
  const patterns = [
    { regex: /\b(\d{4})[./-](\d{1,2})[./-](\d{1,2})\b/, order: "ymd" },
    { regex: /\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/, order: "dmy" },
  ] as const;

  for (const { regex, order } of patterns) {
    const match = text.match(regex);
    if (!match) continue;
    const first = Number(match[1]);
    const second = Number(match[2]);
    const third = Number(match[3]);
    const year = order === "ymd" ? first : third < 100 ? 2000 + third : third;
    const month = order === "ymd" ? second : second;
    const day = order === "ymd" ? third : first;
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) continue;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  return undefined;
}

function extractAmount(lines: string[]): ExtractedReceipt["amount"] {
  const ranked: { value: number; confidence: number; index: number }[] = [];
  const labels = [
    { pattern: /\b(grand total|amount paid|total due|amount due|tong thanh toan|tong cong thanh toan|phai tra)\b/, confidence: 0.95 },
    { pattern: /\b(total|thanh toan|tong cong|thanh tien)\b/, confidence: 0.8 },
  ];
  const excluded = /\b(sub ?total|tax|vat|discount|change|cash|tender|tam tinh|tien thoi|khach dua|tong tien hang)\b/;
  const amountPattern = /\d[\d\s.,]{0,20}\d|\d/g;

  lines.forEach((line, index) => {
    const normalized = normalize(line);
    const label = labels.find(({ pattern }) => pattern.test(normalized));
    if (!label) return;
    if (excluded.test(normalized) && !labels[0].pattern.test(normalized) && !/\btotal\b/.test(normalized)) return;
    const amounts = [...line.matchAll(amountPattern)]
      .map((match) => parseAmount(match[0]))
      .filter((amount): amount is number => amount !== undefined);
    const value = amounts.at(-1);
    if (value) ranked.push({ value, confidence: label.confidence, index });

    if (!value && lines[index + 1]) {
      const nextAmount = [...lines[index + 1].matchAll(amountPattern)]
        .map((match) => parseAmount(match[0]))
        .filter((amount): amount is number => amount !== undefined)
        .at(-1);
      if (nextAmount) ranked.push({ value: nextAmount, confidence: label.confidence - 0.15, index });
    }
  });

  ranked.sort((a, b) => b.confidence - a.confidence || b.index - a.index);
  const best = ranked[0];
  return best ? { value: best.value, confidence: best.confidence } : undefined;
}

function extractMerchant(lines: string[]): ExtractedReceipt["merchant"] {
  const ignored = /\b(receipt|invoice|tax invoice|vat invoice|bill|order|customer copy|merchant copy)\b/;
  const candidate = lines
    .slice(0, 8)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .find((line) => line.length >= 2 && line.length <= 60 && /[a-zA-Z\u00c0-\u024f\u1e00-\u1eff]/.test(line) && !ignored.test(normalize(line)) && !parseDate(line));
  return candidate ? { value: candidate, confidence: 0.55 } : undefined;
}

function extractCategory(text: string): ExtractedReceipt["category"] {
  const normalized = normalize(text);
  let best: { value: CategoryId; confidence: number } | undefined;
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as [CategoryId, string[]][]) {
    if (keywords.some((keyword) => normalized.includes(normalize(keyword)))) {
      best = { value: category, confidence: 0.55 };
      break;
    }
  }
  return best;
}

export function extractReceiptFields(text: string): ExtractedReceipt {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const dateLine = lines.find((line) => parseDate(line));
  return {
    merchant: extractMerchant(lines),
    amount: extractAmount(lines),
    date: dateLine ? { value: parseDate(dateLine)!, confidence: 0.8 } : undefined,
    category: extractCategory(text),
  };
}

async function imageForOcr(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("This browser could not prepare the receipt image.");
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

async function canvasesForPdf(file: File, onPage: (page: number, total: number) => void): Promise<HTMLCanvasElement[]> {
  const pdfjs = await import("pdfjs-dist/webpack.mjs");
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const document = await loadingTask.promise;
  const canvases: HTMLCanvasElement[] = [];
  try {
    if (document.numPages > 10) throw new Error("For now, receipt scanning supports PDFs with up to 10 pages.");

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      onPage(pageNumber, document.numPages);
      const page = await document.getPage(pageNumber);
      const initialViewport = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: Math.min(2, 2200 / Math.max(initialViewport.width, initialViewport.height)) });
      const canvas = window.document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("This browser could not prepare the invoice PDF.");
      await page.render({ canvas, canvasContext: context, viewport }).promise;
      page.cleanup();
      canvases.push(canvas);
    }
    return canvases;
  } catch (error) {
    canvases.forEach((canvas) => {
      canvas.width = 0;
      canvas.height = 0;
    });
    throw error;
  } finally {
    await loadingTask.destroy();
  }
}

export async function scanReceipt(file: File, onProgress: (progress: ScanProgress) => void): Promise<{
  fields: ExtractedReceipt;
  recognitionConfidence: number;
}> {
  const { createWorker } = await import("tesseract.js");
  let pageNumber = 1;
  let pageCount = 1;
  const worker = await createWorker("eng+vie", undefined, {
    logger: ({ progress, status }) => {
      onProgress({
        progress: Math.min(0.95, 0.1 + ((pageNumber - 1 + progress) / pageCount) * 0.85),
        stage: status,
      });
    },
  });

  let canvases: HTMLCanvasElement[] = [];
  try {
    canvases = file.type === "application/pdf" || /\.pdf$/i.test(file.name)
      ? await canvasesForPdf(file, (page, total) => {
          pageNumber = page;
          pageCount = total;
          onProgress({ progress: 0.1 + ((page - 1) / total) * 0.85, stage: `Preparing page ${page} of ${total}` });
        })
      : [await imageForOcr(file)];

    if (!canvases.length) throw new Error("No pages were found in this receipt.");
    const results: string[] = [];
    const confidences: number[] = [];
    for (let index = 0; index < canvases.length; index += 1) {
      pageNumber = index + 1;
      pageCount = canvases.length;
      onProgress({ progress: 0.1 + (index / canvases.length) * 0.85, stage: `Reading page ${index + 1} of ${canvases.length}` });
      const result = await worker.recognize(canvases[index]);
      results.push(result.data.text);
      confidences.push(result.data.confidence);
      canvases[index].width = 0;
      canvases[index].height = 0;
    }
    onProgress({ progress: 1, stage: "Scan complete" });
    return {
      fields: extractReceiptFields(results.join("\n")),
      recognitionConfidence: confidences.reduce((sum, confidence) => sum + confidence, 0) / confidences.length,
    };
  } finally {
    canvases.forEach((canvas) => {
      canvas.width = 0;
      canvas.height = 0;
    });
    await worker.terminate();
  }
}
