import { getSessionUser } from "@/lib/server/session";
import { listBudgets, parseBudgetInput, PlanningInputError, saveBudget } from "@/lib/server/planning";

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  let user;
  try {
    user = await getSessionUser();
  } catch (error) {
    console.error("Could not authenticate budget request:", error);
    return jsonError("Authentication service is unavailable.", 503);
  }
  if (!user) return jsonError("Sign in to view budgets.", 401);
  try {
    return Response.json({ budgets: await listBudgets(user.id) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not read budgets:", error);
    return jsonError("Budget storage is unavailable.", 503);
  }
}

export async function PUT(request: Request) {
  let user;
  try {
    user = await getSessionUser();
  } catch (error) {
    console.error("Could not authenticate budget update:", error);
    return jsonError("Authentication service is unavailable.", 503);
  }
  if (!user) return jsonError("Sign in to update budgets.", 401);
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return jsonError("Send a valid JSON request.", 400);
  }
  try {
    const budget = await saveBudget(user.id, parseBudgetInput(input));
    return Response.json({ budget }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof PlanningInputError) return jsonError(error.message, 400);
    console.error("Could not update budget:", error);
    return jsonError("Budget storage is unavailable.", 503);
  }
}
