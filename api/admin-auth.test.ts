import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createAdminAuthHandler } from "./admin-auth";

const ORIGIN = "https://www.betterlimay.org";
const handler = createAdminAuthHandler();

function get(path: string, cookie?: string): Request {
  return new Request(`${ORIGIN}${path}`, {
    headers: cookie ? { cookie } : {},
  });
}

/** Start sign-in and return the state GitHub would echo back, plus our cookie. */
async function begin(): Promise<{ state: string; cookie: string; location: URL }> {
  const response = await handler(get("/api/admin-auth"));
  const location = new URL(response.headers.get("location") ?? "");
  const setCookie = response.headers.get("set-cookie") ?? "";
  return {
    state: location.searchParams.get("state") ?? "",
    cookie: setCookie.split(";")[0],
    location,
  };
}

describe("admin sign-in", () => {
  beforeEach(() => {
    vi.stubEnv("GITHUB_OAUTH_CLIENT_ID", "client-id");
    vi.stubEnv("GITHUB_OAUTH_CLIENT_SECRET", "client-secret");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("fails closed when the OAuth app is not configured", async () => {
    vi.stubEnv("GITHUB_OAUTH_CLIENT_ID", "");
    const response = await handler(get("/api/admin-auth"));
    expect(response.status).toBe(503);
  });

  it("sends the editor to GitHub with a state, a narrow scope and our callback", async () => {
    const { state, cookie, location } = await begin();

    expect(location.origin + location.pathname).toBe(
      "https://github.com/login/oauth/authorize",
    );
    expect(location.searchParams.get("scope")).toBe("public_repo");
    expect(location.searchParams.get("redirect_uri")).toBe(`${ORIGIN}/api/admin-auth`);
    expect(state).toMatch(/^[0-9a-f]{64}$/);
    expect(cookie).toBe(`admin_oauth_state=${state}`);
  });

  it("marks the state cookie HttpOnly, Secure and SameSite=Lax", async () => {
    const response = await handler(get("/api/admin-auth"));
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("SameSite=Lax");
  });

  it("rejects a callback whose state does not match, without calling GitHub", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { cookie } = await begin();

    const forged = await handler(get("/api/admin-auth?code=abc&state=forged", cookie));
    const missing = await handler(get("/api/admin-auth?code=abc&state=anything"));

    for (const response of [forged, missing]) {
      expect(response.status).toBe(400);
      expect(await response.text()).toContain("STATE_MISMATCH");
    }
    // The secret never left the server for a forged callback.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("exchanges the code and hands the token over through the static script", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ access_token: 'gho_token"<x>' })),
    );
    const { state, cookie } = await begin();

    const response = await handler(
      get(`/api/admin-auth?code=abc&state=${state}`, cookie),
    );
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    // Inline scripts are blocked by the CSP; the page must load the file.
    expect(html).toContain('<script src="/admin/oauth-callback.js"></script>');
    expect(html).not.toMatch(/<script>(?!<\/script>)/);
    // A token containing quotes or angle brackets stays inside the attribute.
    expect(html).not.toContain('token"<x>');
    expect(html).toContain("gho_token\\&quot;&lt;x&gt;");
    // The state is single-use.
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("reports a failed exchange as an error rather than a token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ error: "bad_verification_code" })),
    );
    const { state, cookie } = await begin();

    const response = await handler(
      get(`/api/admin-auth?code=abc&state=${state}`, cookie),
    );
    expect(response.status).toBe(400);
    expect(await response.text()).toContain("bad_verification_code");
  });
});
