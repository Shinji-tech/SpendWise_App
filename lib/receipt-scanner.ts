import type { CategoryId } from "./data";

export type ScanProgress = { progress: number; stage: string };
export type ExtractedReceipt = {
  merchant?: { value: string; confidence: number };
  amount?: { value: number; confidence: number };
  date?: { value: string; confidence: number };
  category?: { value: CategoryId; confidence: number };
};

const CATEGORY_KEYWORDS: Record<CategoryId, string[]> = {
  food: ["restaurant", "cafe", "coffee", "food", "drink", "beverage", "milk tea", "espresso", "latte", "tea", "grocery", "market", "supermarket", "nha hang", "quan an", "cua hang tien loi", "thuc pham", "do uong", "ca phe", "tra sua"],
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
  const digits = text.replace(/[^\d]/g, "");
  if (digits.length < 2 || digits.length > 15) return undefined;
  const amount = Number(digits);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : undefined;
}

function findAmounts(text: string) {
  const pattern = /(?<!\d)(?:\d{1,3}(?:[.,]\d{3})+|\d{1,3}(?:\s\d{3})+|\d{2,})(?!\d)/g;
  return [...text.matchAll(pattern)].flatMap((match) => {
    const value = parseAmount(match[0]);
    return value ? [{ value, index: match.index ?? 0 }] : [];
  });
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
    {
      pattern: /\b(grand total|amount paid|total due|amount due|balance due|total payable|total payment|tong cong thanh toan|tong tien thanh toan|tong thanh toan|tong tien phai tra|phai thanh toan|khach hang phai tra|khach phai tra|can thanh toan|so tien thanh toan)\b/,
      confidence: 0.95,
    },
    { pattern: /\b(total|thanh toan|tong cong|thanh tien|cong tien hang|phai tra)\b/, confidence: 0.8 },
  ];
  const excluded = /\b(sub ?total|subtotal|total items|total qty|tax|vat|discount|change|cash|tender|tam tinh|tien thoi|khach dua|tong tien hang|tien hang|tien thue|chiet khau)\b/;

  lines.forEach((line, index) => {
    const normalized = normalize(line);
    for (const label of labels) {
      const matches = [...normalized.matchAll(new RegExp(label.pattern.source, "g"))];
      for (const match of matches) {
        const labelStart = match.index ?? 0;
        const labelEnd = labelStart + match[0].length;
        if (/\bsub\s*$/.test(normalized.slice(Math.max(0, labelStart - 8), labelStart))) continue;

        const afterLabel = normalized.slice(labelEnd);
        const amountsAfterLabel = findAmounts(afterLabel);
        const amount = amountsAfterLabel[0];
        if (amount && excluded.test(afterLabel.slice(0, amount.index))) continue;

        if (amount) {
          ranked.push({ value: amount.value, confidence: label.confidence, index });
          continue;
        }
        if (excluded.test(afterLabel)) continue;

        const beforeLabel = findAmounts(normalized.slice(0, labelStart)).at(-1);
        if (beforeLabel) {
          ranked.push({ value: beforeLabel.value, confidence: label.confidence - 0.1, index });
          continue;
        }

        for (let offset = 1; offset <= 2 && index + offset < lines.length; offset += 1) {
          const nextLine = normalize(lines[index + offset]);
          if (labels.some(({ pattern }) => pattern.test(nextLine))) break;
          const nextAmount = findAmounts(nextLine)[0];
          if (nextAmount) {
            ranked.push({ value: nextAmount.value, confidence: label.confidence - 0.1 * offset, index });
            break;
          }
        }
      }
    }
  });

  ranked.sort((a, b) => b.confidence - a.confidence || b.index - a.index);
  const best = ranked[0];
  return best ? { value: best.value, confidence: best.confidence } : undefined;
}

const MERCHANT_METADATA = /\b(receipt|invoice|tax invoice|vat invoice|bill|order|customer copy|merchant copy|hoa don|phieu tam tinh|phieu tinh tien|phieu thu|ma so thue|mst|customer|khach hang|cashier|thu ngan|nhan vien|date|ngay|thoi gian|so hd|so giao dich|ten hang|don gia|thanh tien|tong so|tien khach tra|address|dia chi|phone|hotline|website|email|table|ban so)\b/;
const MERCHANT_ADDRESS = /\b(?:p|q|tp)\s*\.?\s*\d*\b|\b(?:thon|xa|huyen|tinh|district|ward|go vap|ha noi|phu thi|gia lam|cho sui)\b/;
const MERCHANT_BODY_START = /\b(hoa don ban hang|sales invoice|ten hang|item description|subtotal|tong cong|grand total|total due)\b/;

function isMerchantCandidate(line: string): boolean {
  const normalized = normalize(line);
  const letters = (line.match(/[a-zA-Z\u00c0-\u024f\u1e00-\u1eff]/g) ?? []).length;
  const digits = (line.match(/\d/g) ?? []).length;
  return (
    line.length >= 2 &&
    line.length <= 60 &&
    letters >= 3 &&
    digits / line.length < 0.35 &&
    !MERCHANT_ADDRESS.test(normalized) &&
    !MERCHANT_METADATA.test(normalized) &&
    !parseDate(line)
  );
}

function extractMerchant(lines: string[]): ExtractedReceipt["merchant"] {
  const receiptLines = lines.slice(0, 40);
  const bodyStart = receiptLines.findIndex((line) => MERCHANT_BODY_START.test(normalize(line)));
  const merchantLines = bodyStart > 0 ? receiptLines.slice(0, bodyStart) : receiptLines.slice(0, 20);
  const candidates = merchantLines.map((line) => {
    const collapsed = line.replace(/\s+/g, " ").trim();
    const hasMerchantPrefix = /^(?:merchant|store|shop|cua hang|ten cua hang|don vi ban hang)\s*[:：-]\s*/.test(normalize(collapsed));
    const separator = collapsed.search(/[:：-]/);
    const cleaned = (hasMerchantPrefix && separator >= 0 ? collapsed.slice(separator + 1) : collapsed)
      .replace(/\b(?:tel|phone|hotline|sdt|mst|tax id|address|dia chi)\b.*$/i, "")
      .replace(/\s+\d{1,2}[./-]\d{1,2}[./-]\d{2,4}.*$/, "")
      .replace(/\s+\d{5,}.*$/, "")
      .replace(/^[^\p{L}\d]+|[^\p{L}\d]+$/gu, "")
      .replace(/\s+[il]\s*$/i, "")
      .replace(/^\p{Ll}\s+(?=\p{Lu})/u, "")
      .trim();
    return cleaned;
  });
  const ranked = candidates.flatMap((candidate, index) => {
    const words = candidate.split(/\s+/);
    const variants = [candidate];
    for (let end = words.length; end > 2 && words[end - 1].length <= 2; end -= 1) {
      variants.push(words.slice(0, end - 1).join(" "));
    }
    return variants
      .filter(isMerchantCandidate)
      .map((value) => {
        const parts = value.split(/\s+/);
        const letters = (value.match(/[a-zA-Z\u00c0-\u024f\u1e00-\u1eff]/g) ?? []).length;
        const digits = (value.match(/\d/g) ?? []).length;
        const shortWords = parts.filter((part) => (part.match(/[\p{L}\d]/gu) ?? []).length <= 2).length;
        const score =
          letters +
          Math.min(parts.length, 3) * 2 +
          (parts.length > 1 ? 4 : 0) -
          shortWords * 5 -
          digits * 3 -
          index * 0.15;
        return { value, index, score };
      });
  });
  ranked.sort((a, b) => b.score - a.score || a.index - b.index);
  const best = ranked[0];
  if (!best) return undefined;

  let merchant = best.value;
  let combined = false;
  const firstWord = merchant.split(/\s+/);
  const next = candidates[best.index + 1];
  if (firstWord.length === 1 && next && next.split(/\s+/).length === 1 && isMerchantCandidate(next)) {
    merchant = `${merchant} ${next}`;
    combined = true;
  }

  if (/^the coffee h[09o]us(?:e)?$/.test(normalize(merchant))) {
    merchant = "THE COFFEE HOUSE";
  }

  return { value: merchant, confidence: combined ? 0.7 : 0.55 };
}

function extractCategory(text: string, merchant?: string): ExtractedReceipt["category"] {
  const normalized = normalize(`${text}\n${merchant ?? ""}`);
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
  const merchant = extractMerchant(lines);
  return {
    merchant,
    amount: extractAmount(lines),
    date: dateLine ? { value: parseDate(dateLine)!, confidence: 0.8 } : undefined,
    category: extractCategory(text, merchant?.value),
  };
}

async function imageForOcr(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(2, 2800 / Math.max(bitmap.width, bitmap.height));
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

function headerForOcr(page: HTMLCanvasElement): HTMLCanvasElement | null {
  if (page.height < page.width) return null;

  const left = Math.round(page.width * 0.13);
  const top = Math.round(page.height * 0.026);
  const width = Math.max(1, Math.round(page.width * 0.716));
  const height = Math.max(1, Math.round(page.height * 0.42));
  const scale = Math.min(1.5, 2200 / Math.max(width, height));
  const header = document.createElement("canvas");
  header.width = Math.max(1, Math.round(width * scale));
  header.height = Math.max(1, Math.round(height * scale));
  const context = header.getContext("2d");
  if (!context) throw new Error("This browser could not prepare the receipt header.");
  context.imageSmoothingQuality = "high";
  context.drawImage(page, left, top, width, height, 0, 0, header.width, header.height);

  const image = context.getImageData(0, 0, header.width, header.height);
  let minimum = 255;
  let maximum = 0;
  for (let index = 0; index < image.data.length; index += 4) {
    const gray = Math.round(image.data[index] * 0.299 + image.data[index + 1] * 0.587 + image.data[index + 2] * 0.114);
    minimum = Math.min(minimum, gray);
    maximum = Math.max(maximum, gray);
  }
  const range = maximum - minimum;
  if (range > 0) {
    for (let index = 0; index < image.data.length; index += 4) {
      const gray = Math.round(image.data[index] * 0.299 + image.data[index + 1] * 0.587 + image.data[index + 2] * 0.114);
      const normalized = Math.max(0, Math.min(255, Math.round(((gray - minimum) / range) * 255)));
      image.data[index] = normalized;
      image.data[index + 1] = normalized;
      image.data[index + 2] = normalized;
    }
    context.putImageData(image, 0, 0);
  }
  return header;
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
      const viewport = page.getViewport({ scale: Math.min(3, 2800 / Math.max(initialViewport.width, initialViewport.height)) });
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
  let recognitionPass = 0;
  const worker = await createWorker(["vie", "eng"], undefined, {
    logger: ({ progress, status }) => {
      onProgress({
        progress: Math.min(0.95, 0.1 + ((pageNumber - 1) * 2 + recognitionPass + progress) / (pageCount * 2) * 0.85),
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
    let headerText = "";
    for (let index = 0; index < canvases.length; index += 1) {
      pageNumber = index + 1;
      pageCount = canvases.length;
      recognitionPass = 0;
      onProgress({ progress: 0.1 + ((index * 2) / (canvases.length * 2)) * 0.85, stage: `Reading page ${index + 1} of ${canvases.length}` });
      const result = await worker.recognize(canvases[index], { rotateAuto: true });
      results.push(result.data.text);
      confidences.push(result.data.confidence);

      if (index === 0) {
        const header = headerForOcr(canvases[index]);
        if (header) {
          recognitionPass = 1;
          onProgress({ progress: 0.1 + ((index * 2 + 1) / (canvases.length * 2)) * 0.85, stage: "Reading receipt header" });
          try {
            const headerResult = await worker.recognize(header, { rotateAuto: true });
            headerText = headerResult.data.text;
          } finally {
            header.width = 0;
            header.height = 0;
          }
        }
      }

      canvases[index].width = 0;
      canvases[index].height = 0;
    }
    onProgress({ progress: 1, stage: "Scan complete" });
    return {
      fields: extractReceiptFields([...results, headerText].filter(Boolean).join("\n")),
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
