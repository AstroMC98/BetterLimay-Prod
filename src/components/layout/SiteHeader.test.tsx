import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, matchPath } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import en from "../../../public/locales/en/common.json";
import fil from "../../../public/locales/fil/common.json";
import { MVP_ROUTE_PATHS } from "../../routes/router";
import { NAV_GROUPS, NAV_HOME, NAV_NEWS, activeSection } from "./navigationItems";
import { SiteHeader } from "./SiteHeader";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", resolvedLanguage: "en", changeLanguage: vi.fn() },
  }),
}));

// React 19 needs this flag to run act() outside a test renderer.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const allItems = [
  NAV_HOME,
  NAV_NEWS,
  ...NAV_GROUPS.flatMap((group) => [...group.items, ...(group.more ?? [])]),
];

describe("navigation items", () => {
  it("links only to routes that exist", () => {
    const patterns = MVP_ROUTE_PATHS.filter((pattern) => pattern !== "*");
    for (const item of allItems) {
      const path = item.to.replace(/[?#].*$/, "");
      const route = patterns.find((pattern) => matchPath(pattern, path));
      // The catch-all would accept anything, so it does not count.
      expect(route, `${item.key} -> ${item.to}`).toBeDefined();
    }
  });

  it("has a label, and a description where the menu shows one, in both languages", () => {
    const described = new Set([
      NAV_HOME.key,
      NAV_NEWS.key,
      ...NAV_GROUPS.flatMap((group) => group.items.map((item) => item.key)),
    ]);
    for (const locale of [en, fil]) {
      const items = locale.nav.items as Record<string, { label: string; desc?: string }>;
      for (const item of allItems) {
        expect(items[item.key]?.label, item.key).toBeTruthy();
        if (described.has(item.key)) expect(items[item.key]?.desc, item.key).toBeTruthy();
      }
      for (const group of [...NAV_GROUPS, NAV_NEWS]) {
        expect(
          locale.nav.groups[group.key as keyof typeof locale.nav.groups],
        ).toBeTruthy();
      }
    }
  });

  it("marks the section the current page belongs to", () => {
    expect(activeSection("/")).toBeNull();
    expect(activeSection("/services/health/immunization")).toBe("services");
    expect(activeSection("/barangays/lamao")).toBe("government");
    expect(activeSection("/legislation")).toBe("government");
    expect(activeSection("/statistics")).toBe("data");
    expect(activeSection("/news/support-the-movement")).toBe("news");
    expect(activeSection("/contribute")).toBe("about");
    // Prefixes match whole segments only.
    expect(activeSection("/newsletter")).toBeNull();
  });
});

describe("SiteHeader", () => {
  let container: HTMLDivElement;
  let root: Root;

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  async function renderAt(path: string) {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () =>
      root.render(
        <MemoryRouter initialEntries={[path]}>
          <SiteHeader />
        </MemoryRouter>,
      ),
    );
  }

  const toggle = () =>
    container.querySelector<HTMLButtonElement>("[data-testid=navigation-menu-toggle]")!;
  const menu = () => document.querySelector("#mobile-menu");

  it("puts Report an issue and Submit data in the brand row", async () => {
    await renderAt("/");
    const cta = container.querySelector(".portal-header__cta")!;
    const links = [...cta.querySelectorAll("a")].map((a) => [
      a.textContent,
      a.getAttribute("href"),
    ]);
    expect(links).toEqual([
      ["nav.actions.submitData", "/contribute#submit-data"],
      ["nav.actions.report", "/report"],
    ]);
  });

  it("highlights the current section's trigger", async () => {
    await renderAt("/barangays/lamao");
    const current = container.querySelectorAll(".nav-trigger[data-current]");
    expect([...current].map((trigger) => trigger.textContent?.trim())).toEqual([
      "nav.groups.government",
    ]);
  });

  it("opens the phone menu, focuses its first link, and closes on Escape", async () => {
    await renderAt("/");
    expect(menu()).toBeNull();
    expect(toggle().getAttribute("aria-expanded")).toBe("false");

    await act(async () => toggle().click());
    expect(menu()).not.toBeNull();
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.activeElement?.getAttribute("href")).toBe("/");

    await act(async () =>
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })),
    );
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(toggle());
    expect(document.body.style.overflow).toBe("");
  });

  it("keeps Tab inside the open menu and its close button", async () => {
    await renderAt("/");
    await act(async () => toggle().click());
    const links = [...menu()!.querySelectorAll<HTMLElement>("a")];
    const tab = (shiftKey = false) =>
      act(async () =>
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Tab", shiftKey, cancelable: true }),
        ),
      );

    links.at(-1)!.focus();
    await tab();
    expect(document.activeElement).toBe(toggle());
    await tab();
    expect(document.activeElement).toBe(links[0]);
    await tab(true);
    expect(document.activeElement).toBe(toggle());
  });

  it("closes the phone menu when a link is followed", async () => {
    await renderAt("/");
    await act(async () => toggle().click());
    const report = menu()!.querySelector<HTMLAnchorElement>(
      ".mobile-menu__actions a[href='/report']",
    )!;
    await act(async () => report.click());
    expect(menu()).toBeNull();
  });
});
