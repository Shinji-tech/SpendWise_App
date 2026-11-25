import { getSessionUser } from "@/lib/server/session";
import { createGoal, listGoals, parseGoalInput, PlanningInputError } from "@/lib/server/planning";

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  let user;
  try {
    user = await getSessionUser();
  } catch (error) {
    console.error("Could not authenticate goal request:", error);
    return jsonError("Authentication service is unavailable.", 503);
  }
  if (!user) return jsonError("Sign in to view goals.", 401);
  try {
    return Response.json({ goals: await listGoals(user.id) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not read goals:", error);
    return jsonError("Goal storage is unavailable.", 503);
  }
}

export async function POST(request: Request) {
  let user;
  try {
    user = await getSessionUser();
  } catch (error) {
    console.error("Could not authenticate goal creation:", error);
    return jsonError("Authentication service is unavailable.", 503);
  }
  if (!user) return jsonError("Sign in to create a goal.", 401);
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return jsonError("Send a valid JSON request.", 400);
  }
  try {
    const goal = await createGoal(user.id, parseGoalInput(input));
    return Response.json({ goal }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof PlanningInputError) return jsonError(error.message, 400);
    console.error("Could not create goal:", error);
    return jsonError("Goal storage is unavailable.", 503);
  }
}
