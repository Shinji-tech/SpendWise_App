import { getPool } from "@/lib/server/db";
import { getSessionUser } from "@/lib/server/session";

type RouteContext = { params: Promise<{ id: string }> };

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

async function authenticatedUser() {
  try {
    return await getSessionUser();
  } catch (error) {
    console.error("Could not authenticate receipt request:", error);
    throw new Error("AUTH_SERVICE_UNAVAILABLE");
  }
}

export async function GET(_request: Request, context: RouteContext) {
  let user;
  try {
    user = await authenticatedUser();
  } catch {
    return jsonError("Authentication service is unavailable. Check the server configuration.", 503);
  }
  if (!user) return jsonError("Sign in to view this receipt.", 401);

  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)) return jsonError("Receipt not found.", 404);
  try {
    const result = await getPool().query<{ file_name: string; content_type: string; data: Buffer }>(
      `SELECT r.file_name, r.content_type, r.data
       FROM receipts r
       JOIN users u ON u.id = r.user_id
       WHERE r.id = $1 AND u.id = $2`,
      [id, user.id],
    );
    const receipt = result.rows[0];
    if (!receipt) return jsonError("Receipt not found.", 404);

    return new Response(new Uint8Array(receipt.data), {
      headers: {
        "Content-Type": receipt.content_type,
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(receipt.file_name)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Could not read receipt:", error);
    return jsonError("Receipt storage is unavailable. Please try again.", 503);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  let user;
  try {
    user = await authenticatedUser();
  } catch {
    return jsonError("Authentication service is unavailable. Check the server configuration.", 503);
  }
  if (!user) return jsonError("Sign in to remove this receipt.", 401);

  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)) return jsonError("Receipt not found.", 404);
  try {
    await getPool().query(
      `DELETE FROM receipts r
       USING users u
       WHERE r.id = $1 AND r.user_id = u.id AND u.id = $2`,
      [id, user.id],
    );
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not delete receipt:", error);
    return jsonError("Receipt storage is unavailable. Please try again.", 503);
  }
}
