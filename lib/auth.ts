export type Session = { name: string; email: string };

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
      cache: "no-store",
    });
  } catch {
    throw new AuthError("The server couldn't be reached. Please try again.");
  }

  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    if (response.status === 401 && url === "/api/auth") {
      throw new AuthError("Incorrect email or password.");
    }
    throw new AuthError(body?.error || "Authentication failed. Please try again.");
  }
  return body as T;
}

export async function getSession(): Promise<Session | null> {
  const result = await request<{ session: Session | null }>("/api/auth");
  return result.session;
}

export async function signOut(): Promise<void> {
  await request<{ ok: boolean }>("/api/auth", { method: "DELETE" });
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<Session> {
  const result = await request<{ session: Session }>("/api/auth", {
    method: "POST",
    body: JSON.stringify({ action: "register", ...input }),
  });
  return result.session;
}

export async function loginUser(input: { email: string; password: string }): Promise<Session> {
  const result = await request<{ session: Session }>("/api/auth", {
    method: "POST",
    body: JSON.stringify({ action: "login", ...input }),
  });
  return result.session;
}

export async function requestPasswordReset(email: string): Promise<void> {
  if (!email.trim()) throw new AuthError("Please enter your email.");
  throw new AuthError("Password reset isn't configured yet. Contact the administrator for help.");
}
