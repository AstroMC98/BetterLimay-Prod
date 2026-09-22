import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { OfflinePage } from "../../pages/PortalStatusPages";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("offline fallback", () => {
  it("exposes a clear hotline source gap and official-source link", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/offline"]}>
        <OfflinePage />
      </MemoryRouter>,
    );

    expect(markup).toContain('data-testid="offline-page"');
    expect(markup).toContain('data-testid="offline-hotline-gap"');
    expect(markup).toContain("pages.offline.hotlineGap");
    expect(markup).toContain("pages.offline.verifyOfficial");
  });
});
