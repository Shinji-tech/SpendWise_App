import { getSessionUser } from "@/lib/server/session";
import { listTransactions } from "@/lib/server/transactions";
import { listAccounts } from "@/lib/server/accounts";
import { listBudgets, listGoals } from "@/lib/server/planning";
import { summarize } from "@/lib/finance";
import { answerWithAdvisorModel } from "@/lib/server/ai-advisor";

type AdvisorTurn = { role: "user" | "assistant"; content: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

function validDate(value: string) {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function parseHistory(value: unknown): AdvisorTurn[] {
  if (!Array.isArray(value)) return [];
  return value.slice(-8).flatMap((turn): AdvisorTurn[] => {
    if (
      !isRecord(turn) ||
      (turn.role !== "user" && turn.role !== "assistant") ||
      typeof turn.content !== "string"
    ) {
      return [];
    }
    const content = turn.content.trim();
    return content.length > 0 && content.length <= 1500 ? [{ role: turn.role, content }] : [];
  });
}

export async function POST(request: Request) {
  let user;
  try {
    user = await getSessionUser();
  } catch (error) {
    console.error("Could not authenticate advisor request:", error);
    return jsonError("Authentication service is unavailable.", 503);
  }
  if (!user) return jsonError("Sign in to use the financial advisor.", 401);

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return jsonError("Send a valid JSON request.", 400);
  }
  if (!isRecord(input) || typeof input.question !== "string") {
    return jsonError("Send an advisor question.", 400);
  }
  const question = input.question.trim();
  if (!question || question.length > 1000) {
    return jsonError("Questions must be between 1 and 1,000 characters.", 400);
  }
  if (input.today !== undefined && (typeof input.today !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input.today) || !validDate(input.today))) {
    return jsonError("Send a valid local date.", 400);
  }

  try {
    const [transactions, accounts, budgets, goals] = await Promise.all([
      listTransactions(user.id),
      listAccounts(user.id),
      listBudgets(user.id),
      listGoals(user.id),
    ]);
    const now = typeof input.today === "string" ? new Date(`${input.today}T12:00:00`) : new Date();
    if (!Number.isFinite(now.getTime())) return jsonError("Send a valid local date.", 400);
    const summary = summarize(transactions, now, accounts, budgets);
    const result = await answerWithAdvisorModel(question, parseHistory(input.history), {
      transactions,
      goals,
      summary,
      now,
    });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not answer the advisor question:", error);
    return jsonError("The financial advisor is unavailable right now. Please try again.", 503);
  }
}
