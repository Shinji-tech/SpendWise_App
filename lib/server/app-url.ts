export function getAppUrl(): URL {
  const value = process.env.APP_URL?.trim();
  if (!value) throw new Error("APP_URL is not configured.");

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("APP_URL must be an absolute HTTP or HTTPS URL.");
  }

  const localHttp = url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !localHttp) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("APP_URL must be a bare HTTPS origin; localhost HTTP is allowed for development.");
  }

  return url;
}
