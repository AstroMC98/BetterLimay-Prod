import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import hotlinesJson from "../../data/hotlines.json";
import type { HotlineRecord } from "../../data/types";
import { HotlineBar } from "./HotlineBar";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const hotlines = hotlinesJson as HotlineRecord[];

describe("emergency hotline bar", () => {
  const markup = renderToStaticMarkup(<HotlineBar />);

  it("renders every number as a dialable link", () => {
    expect(hotlines.length).toBeGreaterThan(0);
    for (const hotline of hotlines) {
      for (const number of hotline.numbers) {
        // A number someone can read but not tap is half a feature on the device
        // most likely to be in their hand.
        expect(markup).toContain(`tel:${number.replace(/[^\d+]/g, "")}`);
      }
    }
  });

  it("leads with the services someone reaches for first", () => {
    // Disaster response and police before utilities: the bar scrolls, so what
    // appears first is what a reader sees without waiting.
    const order = ["disaster", "police", "fire", "medical", "coastguard", "utility"];
    const positions = hotlines
      .map((hotline) => order.indexOf(hotline.category ?? "other"))
      .filter((index) => index >= 0);

    const rendered = hotlines
      .map((hotline) => ({
        category: hotline.category,
        at: markup.indexOf(hotline.service),
      }))
      .filter((entry) => entry.at >= 0);

    const firstDisaster =
      rendered.find((entry) => entry.category === "disaster")?.at ?? Infinity;
    const firstUtility =
      rendered.find((entry) => entry.category === "utility")?.at ?? -Infinity;

    expect(positions.length).toBeGreaterThan(0);
    expect(firstDisaster).toBeLessThan(firstUtility);
  });

  it("duplicates the track for a seamless loop without duplicating it for screen readers", () => {
    // The second copy exists only to hide the seam. Announcing thirteen
    // emergency numbers twice, or making a keyboard user tab through them
    // twice, would be worse than the seam.
    // Note the hidden copy also matches the plain class pattern, so count the
    // total and the hidden subset separately rather than adding them.
    const lists = markup.match(/class="hotline-bar__list"/g) ?? [];
    const hidden = markup.match(/class="hotline-bar__list" aria-hidden="true"/g) ?? [];

    expect(lists.length).toBe(2);
    expect(hidden.length).toBe(1);

    // Only the visible copy carries real links; the duplicate is inert.
    const links = markup.match(/href="tel:/g) ?? [];
    const totalNumbers = hotlines.reduce((sum, h) => sum + h.numbers.length, 0);
    expect(links.length).toBe(totalNumbers);
  });

  it("scales the scroll duration with the number of entries", () => {
    // A longer list must take longer, not move faster — the speed is what makes
    // a number readable as it passes.
    const match = markup.match(/animation-duration:\s*(\d+)s/);
    expect(match, "expected an inline animation-duration").not.toBeNull();
    expect(Number(match![1])).toBe(hotlines.length * 4);
  });
});
