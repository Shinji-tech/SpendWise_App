import { randomUUID } from "node:crypto";
import { EXPENSE_CATEGORIES, type BudgetLimit, type CategoryId, type Goal } from "@/lib/data";
import { getPool } from "./db";

export class PlanningInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlanningInputError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCategory(value: unknown): value is CategoryId {
  return typeof value === "string" && EXPENSE_CATEGORIES.includes(value as CategoryId);
}

export function parseBudgetInput(value: unknown): BudgetLimit {
  if (!isRecord(value) || !isCategory(value.category)) {
    throw new PlanningInputError("Choose a valid expense category.");
  }
  if (typeof value.limit !== "number" || !Number.isSafeInteger(value.limit) || value.limit < 0) {
    throw new PlanningInputError("The monthly limit must be a non-negative whole number.");
  }
  return { category: value.category, limit: value.limit };
}

export function parseGoalInput(value: unknown): Omit<Goal, "id"> {
  if (!isRecord(value)) throw new PlanningInputError("Send valid goal details.");
  if (typeof value.name !== "string" || value.name.trim().length < 2 || value.name.trim().length > 60) {
    throw new PlanningInputError("Enter a goal name between 2 and 60 characters.");
  }
  if (typeof value.saved !== "number" || !Number.isSafeInteger(value.saved) || value.saved < 0) {
    throw new PlanningInputError("Saved amount must be a non-negative whole number.");
  }
  if (typeof value.target !== "number" || !Number.isSafeInteger(value.target) || value.target <= 0) {
    throw new PlanningInputError("Target amount must be a positive whole number.");
  }
  if (typeof value.due !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.due)) {
    throw new PlanningInputError("Choose a valid goal due date.");
  }
  return { name: value.name.trim(), saved: value.saved, target: value.target, due: value.due };
}

export async function listBudgets(userId: string): Promise<BudgetLimit[]> {
  const result = await getPool().query<{ category: CategoryId; monthly_limit: string }>(
    `SELECT category, monthly_limit::text FROM monthly_budgets WHERE user_id = $1 ORDER BY category`,
    [userId],
  );
  return result.rows.map((row) => ({ category: row.category, limit: Number(row.monthly_limit) }));
}

export async function saveBudget(userId: string, input: BudgetLimit): Promise<BudgetLimit> {
  const result = await getPool().query<{ category: CategoryId; monthly_limit: string }>(
    `INSERT INTO monthly_budgets (user_id, category, monthly_limit)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, category)
     DO UPDATE SET monthly_limit = EXCLUDED.monthly_limit, updated_at = NOW()
     RETURNING category, monthly_limit::text`,
    [userId, input.category, input.limit],
  );
  return { category: result.rows[0].category, limit: Number(result.rows[0].monthly_limit) };
}

type GoalRow = { id: string; name: string; saved: string; target: string; due_date: Date | string };

function toGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    name: row.name,
    saved: Number(row.saved),
    target: Number(row.target),
    due: typeof row.due_date === "string" ? row.due_date.slice(0, 10) : row.due_date.toISOString().slice(0, 10),
  };
}

export async function listGoals(userId: string): Promise<Goal[]> {
  const result = await getPool().query<GoalRow>(
    `SELECT id, name, saved::text, target::text, due_date, created_at
     FROM saving_goals WHERE user_id = $1 ORDER BY created_at, name`,
    [userId],
  );
  return result.rows.map(toGoal);
}

export async function createGoal(userId: string, input: Omit<Goal, "id">): Promise<Goal> {
  const result = await getPool().query<GoalRow>(
    `INSERT INTO saving_goals (user_id, id, name, saved, target, due_date)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, name, saved::text, target::text, due_date, created_at`,
    [userId, randomUUID(), input.name, input.saved, input.target, input.due],
  );
  return toGoal(result.rows[0]);
}

export async function updateGoal(userId: string, id: string, input: Omit<Goal, "id">): Promise<Goal | null> {
  const result = await getPool().query<GoalRow>(
    `UPDATE saving_goals SET name = $3, saved = $4, target = $5, due_date = $6
     WHERE user_id = $1 AND id = $2
     RETURNING id, name, saved::text, target::text, due_date, created_at`,
    [userId, id, input.name, input.saved, input.target, input.due],
  );
  return result.rows[0] ? toGoal(result.rows[0]) : null;
}

export async function deleteGoal(userId: string, id: string): Promise<boolean> {
  const result = await getPool().query(`DELETE FROM saving_goals WHERE user_id = $1 AND id = $2`, [userId, id]);
  return (result.rowCount ?? 0) > 0;
}
