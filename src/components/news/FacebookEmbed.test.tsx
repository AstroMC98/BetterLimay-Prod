import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  facebookEmbedKind,
  facebookEmbedUrl,
  isFacebookUrl,
} from "../../lib/ui/facebook";
import { FacebookEmbed } from "./FacebookEmbed";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// React 19 needs this flag to run act() outside a test renderer.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const VIDEO = "https://www.facebook.com/limay.cc/videos/1234567890/";
const POST = "https://www.facebook.com/limay.cc/posts/pfbid0abc";

describe("facebook links", () => {
  it("accepts only https Facebook hosts", () => {
    expect(isFacebookUrl(VIDEO)).toBe(true);
    expect(isFacebookUrl("https://fb.watch/abc123/")).toBe(true);
    expect(isFacebookUrl("http://www.facebook.com/limay.cc")).toBe(false);
    expect(isFacebookUrl("https://facebook.com.evil.example/x")).toBe(false);
    expect(facebookEmbedUrl("https://example.com/video")).toBeNull();
  });

  it("uses the video plugin for videos and lives, the post plugin otherwise", () => {
    expect(facebookEmbedKind(VIDEO)).toBe("video");
    expect(facebookEmbedKind("https://www.facebook.com/watch/?v=123")).toBe("video");
    expect(facebookEmbedKind("https://fb.watch/abc123/")).toBe("video");
    expect(facebookEmbedKind(POST)).toBe("post");
    expect(facebookEmbedUrl(VIDEO)).toContain(
      "https://www.facebook.com/plugins/video.php?href=",
    );
    expect(facebookEmbedUrl(POST)).toContain("/plugins/post.php?");
  });
});

describe("FacebookEmbed", () => {
  let container: HTMLDivElement;

  afterEach(() => {
    container?.remove();
  });

  it("requests nothing from Facebook until the reader clicks", async () => {
    container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => root.render(<FacebookEmbed url={VIDEO} />));
    expect(container.querySelector("iframe")).toBeNull();
    // The plain link is always there, embed or not.
    expect(container.querySelector(`a[href="${VIDEO}"]`)).not.toBeNull();

    await act(async () => container.querySelector("button")?.click());
    const frame = container.querySelector("iframe");
    expect(frame?.getAttribute("src")).toContain("facebook.com/plugins/video.php");

    await act(async () => root.unmount());
  });
});
