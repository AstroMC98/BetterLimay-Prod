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
 *
 * The alternative to this file is asking editors to paste a long-lived personal
 * access token into a web page. That is worse: a PAT is a bearer credential with
 * no expiry that ends up in browser storage, and revoking one means finding it
 * again later.
 */

const GITHUB_AUTHORIZE = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN = "https://github.com/login/oauth/access_token";

/** Only what the CMS needs: read and write content in repositories. */
const SCOPE = "repo";

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
 * `authorization:github:success:<json>` from the popup it opened. The payload is
 * serialised into the script, so it is JSON-encoded rather than interpolated
 * raw -- a token containing a quote would otherwise break out of the string.
 */
function handshakePage(status: "success" | "error", payload: unknown): Response {
  const message = `authorization:github:${status}:${JSON.stringify(payload)}`;
  const body = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Signing in…</title></head>
<body>
<p>Completing sign-in…</p>
<script>
  (function () {
    var message = ${JSON.stringify(message)};
    function send() {
      if (!window.opener) return;
      window.opener.postMessage(message, window.location.origin);
    }
    // Decap sends an initiating message first; answer it, and also send once
    // directly in case the listener was already attached.
    window.addEventListener("message", send, false);
    send();
    setTimeout(function () { window.close(); }, 1000);
  })();
</script>
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
      const authorize = new URL(GITHUB_AUTHORIZE);
      authorize.searchParams.set("client_id", config.clientId);
      authorize.searchParams.set("scope", SCOPE);
      authorize.searchParams.set("redirect_uri", `${url.origin}/api/admin-auth`);
      return Response.redirect(authorize.toString(), 302);
    }

    const result = await exchangeCode(config, code);
    if ("error" in result) {
      return handshakePage("error", { message: result.error });
    }
    return handshakePage("success", { token: result.token, provider: "github" });
  };
}

export default createAdminAuthHandler();
