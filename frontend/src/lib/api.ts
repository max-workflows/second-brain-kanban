const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function jsonResponse(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * The API reads and writes private files, so it only serves this computer:
 * - the Host header must be localhost (blocks DNS rebinding),
 * - a browser request from another site is refused (blocks cross-site requests),
 * - changes must be sent as JSON (a plain HTML form cannot do that).
 * Returns a response to send back when the request is refused, otherwise null.
 */
export function guardRequest(request: Request, { mutating }: { mutating: boolean }): Response | null {
  const host = request.headers.get("host") ?? new URL(request.url).host;
  const hostname = host.replace(/:\d+$/, "").replace(/^\[|\]$/g, "").toLowerCase();
  if (!LOCAL_HOSTS.has(hostname)) return jsonResponse({ error: "Only local requests are allowed." }, 403);

  const origin = request.headers.get("origin");
  if (origin) {
    let originHost: string | null = null;
    try {
      originHost = new URL(origin).host;
    } catch {
      /* invalid origin */
    }
    if (originHost !== host) return jsonResponse({ error: "Cross-site requests are not allowed." }, 403);
  }

  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") {
    return jsonResponse({ error: "Cross-site requests are not allowed." }, 403);
  }

  if (mutating && !request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return jsonResponse({ error: "Send JSON." }, 415);
  }
  return null;
}
