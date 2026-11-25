import { getSessionUser } from "@/lib/server/session";
import { deleteGoal, parseGoalInput, PlanningInputError, updateGoal } from "@/lib/server/planning";

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await getSessionUser();
  } catch (error) {
    console.error("Could not authenticate goal update:", error);
    return jsonError("Authentication service is unavailable.", 503);
  }
  if (!user) return jsonError("Sign in to update goals.", 401);
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return jsonError("Send a valid JSON request.", 400);
  }
  try {
    const { id } = await params;
    const goal = await updateGoal(user.id, id, parseGoalInput(input));
    if (!goal) return jsonError("Goal not found.", 404);
    return Response.json({ goal }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof PlanningInputError) return jsonError(error.message, 400);
    console.error("Could not update goal:", error);
    return jsonError("Goal storage is unavailable.", 503);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await getSessionUser();
  } catch (error) {
    console.error("Could not authenticate goal deletion:", error);
    return jsonError("Authentication service is unavailable.", 503);
  }
  if (!user) return jsonError("Sign in to delete goals.", 401);
  try {
    const { id } = await params;
    if (!(await deleteGoal(user.id, id))) return jsonError("Goal not found.", 404);
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not delete goal:", error);
    return jsonError("Goal storage is unavailable.", 503);
  }
}
