import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import barangaysJson from "../../data/barangays.json";
import facebookPagesJson from "../../data/facebook-pages.json";
import historyJson from "../../data/history.json";
import officialsJson from "../../data/officials.json";
import type {
  BarangayRecord,
  FacebookPageRecord,
  HistoryDocument,
  OfficialRecord,
} from "../../data/types";
import { pagePluginUrl } from "../../lib/ui/facebookFeed";
import { homeFacts } from "../../lib/ui/homeFacts";
import { FOOTER_COLUMNS } from "../layout/footerLinks";
import { FacebookFeed } from "./FacebookFeed";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const pages = facebookPagesJson as FacebookPageRecord[];
const history = historyJson as HistoryDocument;

describe("official Facebook pages", () => {
  it("are all on www.facebook.com, in tab order, with unique ids", () => {
    expect(pages.length).toBeGreaterThan(0);
    for (const page of pages) expect(page.url).toMatch(/^https:\/\/www\.facebook\.com\//);
    expect(pages.map((p) => p.order)).toEqual(
      [...pages.map((p) => p.order)].sort((a, b) => a - b),
    );
    expect(new Set(pages.map((p) => p.id)).size).toBe(pages.length);
  });

  it("build a Page Plugin URL with the page encoded", () => {
    const url = new URL(pagePluginUrl("https://www.facebook.com/1Limay"));
    expect(url.origin + url.pathname).toBe("https://www.facebook.com/plugins/page.php");
    expect(url.searchParams.get("href")).toBe("https://www.facebook.com/1Limay");
    expect(url.searchParams.get("tabs")).toBe("timeline");
  });
});

describe("FacebookFeed", () => {
  let container: HTMLDivElement;
  afterEach(() => container?.remove());

  it("loads one timeline, the active tab's, and switches with the tabs", async () => {
    container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => root.render(<FacebookFeed />));

    const frames = () => container.querySelectorAll("iframe");
    expect(frames()).toHaveLength(1);
    expect(frames()[0].src).toContain(encodeURIComponent(pages[0].url));

    const tabs = container.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    expect(tabs).toHaveLength(pages.length);
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");

    await act(async () => tabs[1].click());
    expect(frames()).toHaveLength(1);
    expect(frames()[0].src).toContain(encodeURIComponent(pages[1].url));
    expect(tabs[1].getAttribute("aria-selected")).toBe("true");

    await act(async () => root.unmount());
  });
});

describe("history", () => {
  it("cites a real source for every event and highlight", () => {
    const keys = Object.keys(history.sources);
    for (const era of history.eras) {
      for (const event of era.events) expect(keys).toContain(event.source);
    }
    for (const highlight of history.highlights) expect(keys).toContain(highlight.source);
    for (const source of Object.values(history.sources)) {
      expect(source.source_url).toMatch(/^https:\/\//);
    }
  });

  it("orders dated events oldest first within each era", () => {
    for (const era of history.eras) {
      const years = era.events
        .map((event) => Number.parseInt(event.year, 10))
        .filter((year) => !Number.isNaN(year));
      expect(years).toEqual([...years].sort((a, b) => a - b));
    }
  });
});

describe("home page facts", () => {
  it("come from the data files, not constants", () => {
    const facts = homeFacts();
    const officials = (officialsJson as OfficialRecord[]).filter(
      (o) => o.status === "current",
    );
    const barangays = barangaysJson as BarangayRecord[];

    expect(facts.otherOfficials).toBe(officials.length - 1);
    expect(facts.mayorName).toBe(
      officials.find((o) => o.role === "Municipal Mayor")?.name,
    );
    expect(facts.barangayCount).toBe(barangays.length);
    expect(facts.population).toBe(
      barangays.reduce((sum, b) => sum + (b.population2024 ?? 0), 0),
    );
  });
});

describe("footer", () => {
  it("links only to site routes or https addresses", () => {
    for (const column of FOOTER_COLUMNS) {
      for (const link of column.links) {
        expect(link.href.startsWith("/") || link.href.startsWith("https://")).toBe(true);
      }
    }
  });

  it("renders every column", async () => {
    const { SiteFooter } = await import("../layout/SiteFooter");
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () =>
      root.render(
        <MemoryRouter>
          <SiteFooter />
        </MemoryRouter>,
      ),
    );
    for (const column of FOOTER_COLUMNS) {
      expect(container.textContent).toContain(`footer.columns.${column.title}`);
    }
    expect(container.textContent).toContain("footer.costLabel");
    await act(async () => root.unmount());
  });
});
