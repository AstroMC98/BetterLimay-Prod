import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SCRIPT = readFileSync(
  resolve(__dirname, "../public/admin/oauth-callback.js"),
  "utf8",
);
const TOKEN_MESSAGE =
  'authorization:github:success:{"token":"gho_x","provider":"github"}';

/** Run the popup script against a stubbed opener, as Decap's popup would. */
function runPopup() {
  const opener = { postMessage: vi.fn() };
  Object.defineProperty(window, "opener", { value: opener, configurable: true });
  document.body.innerHTML = `<p id="oauth-handshake" data-message='${TOKEN_MESSAGE}'></p>`;
  new Function(SCRIPT)();
  return opener;
}

function replyFromEditor(data: string, origin = window.location.origin) {
  window.dispatchEvent(new MessageEvent("message", { data, origin }));
}

describe("admin OAuth popup", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, "close").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("announces itself before sending anything else", () => {
    const opener = runPopup();
    expect(opener.postMessage).toHaveBeenCalledTimes(1);
    expect(opener.postMessage).toHaveBeenCalledWith(
      "authorizing:github",
      window.location.origin,
    );
  });

  it("sends the token only after the editor answers the handshake", () => {
    const opener = runPopup();
    replyFromEditor("authorizing:github");

    expect(opener.postMessage).toHaveBeenLastCalledWith(
      TOKEN_MESSAGE,
      window.location.origin,
    );
    // Once, however many times the editor answers.
    replyFromEditor("authorizing:github");
    expect(opener.postMessage).toHaveBeenCalledTimes(2);
  });

  it("ignores a reply from another origin", () => {
    const opener = runPopup();
    replyFromEditor("authorizing:github", "https://evil.example");
    replyFromEditor("something else");

    expect(opener.postMessage).toHaveBeenCalledTimes(1);
  });
});
