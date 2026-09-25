import { Suspense, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";

import { loadLguConfig } from "../../app/lguConfig";
import { createPortalIdentity } from "../../app/portalIdentity";
import { HotlineBar } from "../home/HotlineBar";
import { InfoBar } from "../home/InfoBar";
import { SiteFooter } from "./SiteFooter";
import { LaunchBanner } from "./LaunchBanner";
import { LoadingState } from "./LoadingState";
import { ScrollToHash } from "./ScrollToHash";
import { SiteHeader } from "./SiteHeader";

const portalIdentity = createPortalIdentity(loadLguConfig());

export function RootLayout() {
  const { t } = useTranslation("common");

  return (
    <div
      className="portal-shell"
      style={
        {
          "--portal-brand": portalIdentity.brandColor,
        } as CSSProperties
      }
    >
      <a className="skip-link" href="#main-content">
        {t("accessibility.skipToContent")}
      </a>

      <HotlineBar />

      <SiteHeader />
      <ScrollToHash />

      <InfoBar />

      <main id="main-content" className="portal-main" tabIndex={-1}>
        <Suspense fallback={<LoadingState label={t("common.loadingPage")} />}>
          <Outlet />
        </Suspense>
      </main>

      <SiteFooter />

      <LaunchBanner />
    </div>
  );
}
