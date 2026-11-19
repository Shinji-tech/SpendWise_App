import { randomUUID } from "node:crypto";
import { getPool } from "@/lib/server/db";
import { getSessionUser } from "@/lib/server/session";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const FILE_TYPES = {
  jpeg: { mime: "image/jpeg", kind: "image" as const },
  png: { mime: "image/png", kind: "image" as const },
  pdf: { mime: "application/pdf", kind: "pdf" as const },
};

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

function detectType(bytes: Buffer) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return FILE_TYPES.jpeg;
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return FILE_TYPES.png;
  if (bytes.length >= 5 && bytes.subarray(0, 5).toString("ascii") === "%PDF-") return FILE_TYPES.pdf;
  return null;
}

export async function POST(request: Request) {
  let user;
  try {
    user = await getSessionUser();
  } catch (error) {
    console.error("Could not authenticate receipt upload:", error);
    return jsonError("Authentication service is unavailable. Check the server configuration.", 503);
  }
  if (!user) return jsonError("Sign in to upload a receipt.", 401);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("Send a valid receipt file.", 400);
  }
  const file = form.get("file");
  if (!(file instanceof File)) return jsonError("Choose a receipt file to upload.", 400);
  if (file.size === 0 || file.size > MAX_FILE_BYTES) return jsonError("Receipt files must be between 1 byte and 10 MB.", 413);

  const safeName = file.name.replace(/[\\/\u0000-\u001f\u007f]/g, "_").trim().slice(0, 255) || "receipt";
  const bytes = Buffer.from(await file.arrayBuffer());
  const detected = detectType(bytes);
  if (!detected || (file.type && file.type !== detected.mime)) {
    return jsonError("The file must be a valid JPG, PNG, or PDF receipt.", 415);
  }

  try {
    const id = randomUUID();
    const result = await getPool().query<{ created_at: Date }>(
      `INSERT INTO receipts (id, user_id, file_name, content_type, file_size, data)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING created_at`,
      [id, user.id, safeName, detected.mime, bytes.length, bytes],
    );

    return Response.json(
      { id, name: safeName, size: bytes.length, kind: detected.kind, status: "uploaded", uploadedAt: result.rows[0].created_at },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Could not save uploaded receipt:", error);
    return jsonError("Receipt storage is unavailable. Please try again.", 503);
  }
}
