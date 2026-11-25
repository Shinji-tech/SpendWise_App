import { getSessionUser } from "@/lib/server/session";
import { beginGoogleOAuth, type GoogleOAuthMode } from "@/lib/server/google-oauth";

function redirectTo(path: string) {
  return new Response(null, {
    status: 303,
    headers: { Location: path, "Cache-Control": "no-store" },
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const modeValue = url.searchParams.get("mode");
  if (modeValue && modeValue !== "login" && modeValue !== "link") {
    return Response.json({ error: "Unsupported Google sign-in mode." }, { status: 400 });
  }
  const mode: GoogleOAuthMode = modeValue === "link" ? "link" : "login";

  if (mode === "link") {
    try {
      if (!(await getSessionUser())) return redirectTo("/sign-in?google_error=sign_in_required");
    } catch (error) {
      console.error("Could not verify the session before linking Google:", error);
      return redirectTo("/settings?google_error=unavailable");
    }
  }

  try {
    const authorizationUrl = await beginGoogleOAuth(mode);
    return Response.redirect(authorizationUrl, 303);
  } catch (error) {
    console.error("Could not start Google sign-in:", error);
    return redirectTo(mode === "link" ? "/settings?google_error=not_configured" : "/sign-in?google_error=not_configured");
  }
}
