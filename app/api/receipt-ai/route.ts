import { EXPENSE_CATEGORIES, type CategoryId } from "@/lib/data";
import { extractReceiptFields } from "@/lib/receipt-scanner";
import { getSessionUser } from "@/lib/server/session";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const CATEGORY_IDS: ReadonlySet<string> = new Set(EXPENSE_CATEGORIES);

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCategory(value: unknown): value is CategoryId {
  return typeof value === "string" && CATEGORY_IDS.has(value);
}

export async function POST(request: Request) {
  let user;
  try {
    user = await getSessionUser();
  } catch (error) {
    console.error("Could not authenticate receipt AI request:", error);
    return jsonError("Authentication service is unavailable. Check the server configuration.", 503);
  }
  if (!user) return jsonError("Sign in to scan a receipt.", 401);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("Send a valid receipt file.", 400);
  }
  const file = form.get("file");
  if (!(file instanceof File)) return jsonError("Choose a receipt file to scan.", 400);
  if (file.size === 0 || file.size > MAX_FILE_BYTES) return jsonError("Receipt files must be between 1 byte and 10 MB.", 413);

  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  const isImage = /^image\/(jpeg|png)$/.test(file.type) || /\.(jpe?g|png)$/i.test(file.name);
  if (!isPdf && !isImage) return jsonError("The file must be a JPG, PNG, or PDF receipt.", 415);

  const baseUrl = process.env.RECEIPT_AI_URL || "http://127.0.0.1:8000";
  let serviceUrl: URL;
  try {
    serviceUrl = new URL("/scan", baseUrl);
    if (serviceUrl.protocol !== "http:" && serviceUrl.protocol !== "https:") {
      return jsonError("Receipt AI service URL must use HTTP or HTTPS.", 503);
    }
  } catch (error) {
    console.error("Invalid receipt AI service URL:", error);
    return jsonError("Receipt AI service URL is invalid.", 503);
  }

  const upstreamForm = new FormData();
  upstreamForm.append("file", file, file.name);
  let upstream: Response;
  try {
    upstream = await fetch(serviceUrl, {
      method: "POST",
      body: upstreamForm,
      cache: "no-store",
      signal: AbortSignal.timeout(180_000),
    });
  } catch (error) {
    console.error("Receipt AI service request failed:", error);
    return jsonError("The local receipt AI service is unavailable.", 503);
  }

  let payload: unknown;
  try {
    payload = await upstream.json();
  } catch (error) {
    console.error("Receipt AI service returned invalid JSON:", error);
    return jsonError("The local receipt AI service returned an invalid response.", 503);
  }

  if (!upstream.ok) {
    const message = isRecord(payload) && typeof payload.detail === "string" ? payload.detail : "Receipt AI could not process this file.";
    return jsonError(message, upstream.status >= 500 ? 503 : upstream.status);
  }

  if (
    !isRecord(payload) ||
    typeof payload.text !== "string" ||
    typeof payload.recognitionConfidence !== "number" ||
    !Number.isFinite(payload.recognitionConfidence) ||
    payload.recognitionConfidence < 0 ||
    payload.recognitionConfidence > 100
  ) {
    console.error("Receipt AI service response did not match the expected schema.");
    return jsonError("The local receipt AI service returned an invalid response.", 503);
  }

  const fields = extractReceiptFields(payload.text);
  if (
    isRecord(payload.category) &&
    isCategory(payload.category.value) &&
    typeof payload.category.confidence === "number" &&
    Number.isFinite(payload.category.confidence) &&
    payload.category.confidence >= 0 &&
    payload.category.confidence <= 1
  ) {
    fields.category = {
      value: payload.category.value,
      confidence: payload.category.confidence,
    };
  }

  return Response.json(
    { fields, recognitionConfidence: payload.recognitionConfidence },
    { headers: { "Cache-Control": "no-store" } },
  );
}
