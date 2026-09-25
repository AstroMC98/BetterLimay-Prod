/**
 * GitHub OAuth proxy for the /admin content editor.
 *
 * Decap CMS runs entirely in the browser and commits through the GitHub API, so
 * it needs an access token. A browser cannot complete the OAuth authorization
 * code exchange itself: that step requires the client secret, which must never
 * reach the browser. This function is the only piece that holds the secret.
 *
 * Two routes, distinguished by the `code` parameter:
 *
 *   GET /api/admin-auth            -> redirect the editor to GitHub to authorize
 *   GET /api/admin-auth?code=...   -> exchange that code for a token and hand it
 *                                     back to the CMS window
 *
 * The handshake back to Decap is a `postMessage` to the opener window, which is
 * the protocol Decap's `github` backend expects from an external OAuth client.
 * The script that sends it is a static file, /admin/oauth-callback.js, because
 * the site's Content-Security-Policy forbids inline scripts.
 *
 * A random `state` value, held in a short-lived HttpOnly cookie, must come back
 * from GitHub unchanged. Without it, a crafted link could complete sign-in with
 * a code the attacker obtained for their own account (login CSRF).
 *
 * The alternative to this file is asking editors to paste a long-lived personal
 * access token into a web page. That is worse: a PAT is a bearer credential with
 * no expiry that ends up in browser storage, and revoking one means finding it
 * again later.
 */

const GITHUB_AUTHORIZE = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN = "https://github.com/login/oauth/access_token";

/**
 * Only what the CMS needs. The content repository is public, so `public_repo`
 * is enough; `repo` would also grant every private repository the editor can
 * reach. If the repository is ever made private, this must become `repo`.
 */
const SCOPE = "public_repo";

const STATE_COOKIE = "admin_oauth_state";
/** Long enough to approve on GitHub, short enough that a stale value is useless. */
const STATE_MAX_AGE_SECONDS = 600;

function randomState(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function stateCookie(value: string, maxAge: number): string {
  // Lax, not Strict: the return from GitHub is a top-level navigation from
  // another site, which Strict would strip the cookie from.
  return `${STATE_COOKIE}=${value}; Path=/api/admin-auth; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}

/** Constant-time comparison, so the state cannot be guessed byte by byte. */
function sameState(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
}

function readConfig(): OAuthConfig | null {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

/**
 * The page handed back to the CMS window.
 *
 * Decap listens for a `postMessage` of the form
 * `authorization:github:success:<json>` from the popup it opened. The message
 * rides in a data attribute (escaped, so a token cannot break out of it) and
 * /admin/oauth-callback.js sends it. An inline script would be simpler and is
 * exactly what the site's Content-Security-Policy blocks.
 */
function handshakePage(status: "success" | "error", payload: unknown): Response {
  const message = `authorization:github:${status}:${JSON.stringify(payload)}`;
  const body = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Signing in…</title></head>
<body>
<p id="oauth-handshake" data-message="${escapeAttribute(message)}">Completing sign-in…</p>
<script src="/admin/oauth-callback.js"></script>
</body>
</html>`;

  return new Response(body, {
    status: status === "success" ? 200 : 400,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // This page briefly holds a credential; it must never be cached or framed.
      "Cache-Control": "no-store",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
      // The state is single-use: clear it whatever the outcome.
      "Set-Cookie": stateCookie("", 0),
    },
  });
}

async function exchangeCode(
  config: OAuthConfig,
  code: string,
): Promise<{ token: string } | { error: string }> {
  const response = await fetch(GITHUB_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
    }),
  });

  if (!response.ok) return { error: "TOKEN_EXCHANGE_FAILED" };

  const payload = (await response.json()) as {
    access_token?: string;
    error?: string;
  };
  if (payload.error || !payload.access_token) {
    return { error: payload.error ?? "NO_ACCESS_TOKEN" };
  }
  return { token: payload.access_token };
}

export function createAdminAuthHandler() {
  return async function adminAuthHandler(request: Request): Promise<Response> {
    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }

    const config = readConfig();
    if (!config) {
      // Fail closed and say exactly what is missing, rather than redirecting to
      // GitHub with an empty client id and failing there instead.
      return new Response(
        "Admin sign-in is not configured. Set GITHUB_OAUTH_CLIENT_ID and " +
          "GITHUB_OAUTH_CLIENT_SECRET in the Vercel project environment.",
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    const url = new URL(request.url);
    const code = url.searchParams.get("code");

    if (!code) {
      const state = randomState();
      const authorize = new URL(GITHUB_AUTHORIZE);
      authorize.searchParams.set("client_id", config.clientId);
      authorize.searchParams.set("scope", SCOPE);
      authorize.searchParams.set("redirect_uri", `${url.origin}/api/admin-auth`);
      authorize.searchParams.set("state", state);
      // Built by hand: Response.redirect() returns immutable headers, and the
      // state cookie has to ride on this response.
      return new Response(null, {
        status: 302,
        headers: {
          Location: authorize.toString(),
          "Set-Cookie": stateCookie(state, STATE_MAX_AGE_SECONDS),
          "Cache-Control": "no-store",
        },
      });
    }

    const returnedState = url.searchParams.get("state");
    const expectedState = readCookie(request, STATE_COOKIE);
    if (!returnedState || !expectedState || !sameState(returnedState, expectedState)) {
      // Checked before the code is exchanged, so a forged callback never
      // reaches GitHub with our client secret.
      return handshakePage("error", { message: "STATE_MISMATCH" });
    }

    const result = await exchangeCode(config, code);
    if ("error" in result) {
      return handshakePage("error", { message: result.error });
    }
    return handshakePage("success", { token: result.token, provider: "github" });
  };
}

// Exported under the HTTP method, not as a default export: Vercel only calls a
// method-named export with a Fetch API Request (absolute URL). A default-exported
// function is called Node-style with a relative URL, and `new URL()` throws.
export const GET = createAdminAuthHandler();
