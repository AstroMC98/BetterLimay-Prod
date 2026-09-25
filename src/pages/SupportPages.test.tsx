import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import {
  AccessibilityPage,
  ContributePage,
  FaqPage,
  NewsPage,
  PrivacyPage,
  ReportPage,
  SitemapPage,
  TermsPage,
} from "./SupportPages";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string | number>) =>
      values ? `${key}:${JSON.stringify(values)}` : key,
  }),
}));

function renderPage(element: React.ReactElement): string {
  return renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>);
}

describe("support and trust pages", () => {
  it("shows a source gap instead of claiming there are no official announcements", () => {
    const markup = renderPage(<NewsPage />);

    expect(markup).toContain('data-testid="news-page"');
    expect(markup).toContain('data-testid="news-empty"');
    expect(markup).toContain("news.empty");
    expect(markup).toContain("https://www.facebook.com/1Limay");
  });

  it("renders the report privacy notice, consent, honeypot, and disabled-delivery state", () => {
    const markup = renderPage(<ReportPage />);

    expect(markup).toContain('data-testid="report-page"');
    expect(markup).toContain('data-testid="report-form"');
    expect(markup).toContain('data-testid="report-honeypot"');
    expect(markup).toContain("report.privacyNotice");
    expect(markup).toContain("report.consentLabel");
    expect(markup).toContain("report.deliveryDisabled");
    expect(markup).toContain('aria-live="polite"');
  });

  it("keeps Submit disabled without a site key, and until Turnstile issues a token", () => {
    // No key: delivery is off and the button cannot be pressed.
    expect(renderPage(<ReportPage />)).toMatch(
      /<button[^>]*disabled[^>]*type="submit"|<button[^>]*type="submit"[^>]*disabled/,
    );

    // With a key: the Turnstile container renders, the disabled note does not,
    // and Submit still waits for a token.
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "test-site-key");
    try {
      const markup = renderPage(<ReportPage />);
      expect(markup).toContain('data-testid="turnstile"');
      expect(markup).not.toContain("report.deliveryDisabled");
      expect(markup).toMatch(
        /<button[^>]*disabled[^>]*type="submit"|<button[^>]*type="submit"[^>]*disabled/,
      );
      expect(markup).toContain("report.turnstileLabel");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("renders contribution guidance without copying a second report form", () => {
    const markup = renderPage(<ContributePage />);

    expect(markup).toContain('data-testid="contribute-page"');
    expect(markup).toContain("contribute.correctionTitle");
    expect(markup).toContain("contribute.developerTitle");
    expect(markup).toContain("https://github.com/");
    expect(markup).not.toContain('data-testid="report-form"');
  });

  it("renders the legal, accessibility, FAQ, and sitemap routes as real content", () => {
    const pages = [
      [<PrivacyPage />, "privacy.page"],
      [<TermsPage />, "terms.page"],
      [<AccessibilityPage />, "accessibility.page"],
      [<FaqPage />, "faq.page"],
      [<SitemapPage />, "sitemap.page"],
    ] as const;

    pages.forEach(([page, key]) => {
      const markup = renderPage(page);
      expect(markup).toContain(`data-testid="${key}"`);
      expect(markup).toContain(key);
    });
  });
});
