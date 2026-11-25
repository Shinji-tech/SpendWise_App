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

export async function updateProfile(name: string): Promise<Session> {
  const result = await request<{ session: Session }>("/api/settings/profile", {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
  return result.session;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await request<{ ok: boolean }>("/api/settings/password", {
    method: "PATCH",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function requestEmailChange(email: string, currentPassword: string): Promise<string> {
  const result = await request<{ message: string }>("/api/settings/email", {
    method: "POST",
    body: JSON.stringify({ email, currentPassword }),
  });
  return result.message;
}

export async function confirmEmailChange(token: string): Promise<string> {
  const result = await request<{ message: string }>("/api/settings/email", {
    method: "PATCH",
    body: JSON.stringify({ token }),
  });
  return result.message;
}

export async function requestPasswordReset(email: string): Promise<void> {
  await request<{ ok: boolean }>("/api/auth/password-reset", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await request<{ ok: boolean }>("/api/auth/password-reset", {
    method: "PATCH",
    body: JSON.stringify({ token, newPassword }),
  });
}
