import { Suspense, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { Link, Outlet } from "react-router-dom";

import { loadLguConfig } from "../../app/lguConfig";
import { createPortalIdentity } from "../../app/portalIdentity";
import { HotlineBar } from "../home/HotlineBar";
import { InfoBar } from "../home/InfoBar";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { LoadingState } from "./LoadingState";
import { Navigation } from "./Navigation";

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

      <header className="portal-header">
        <div className="portal-header__inner">
          <Link className="portal-mark" to="/" aria-label={portalIdentity.portalName}>
            <span className="portal-mark__name">{portalIdentity.portalName}</span>
            <span className="portal-mark__place">{portalIdentity.lguFullName}</span>
          </Link>
          <div className="portal-header__actions">
            <Navigation />
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <InfoBar />

      <main id="main-content" className="portal-main" tabIndex={-1}>
        <Suspense fallback={<LoadingState label={t("common.loadingPage")} />}>
          <Outlet />
        </Suspense>
      </main>

      <footer className="portal-footer">
        <div className="portal-footer__inner">
          <div>
            <p>{t("footer.independentPortal")}</p>
            <p className="portal-footer__cost">{t("footer.costToPeople")}</p>
          </div>
          <nav className="portal-footer__links" aria-label={t("footer.footerNavigation")}>
            <a
              href={portalIdentity.socials.officialWebsite}
              target="_blank"
              rel="noreferrer"
            >
              {t("footer.officialWebsite")}
            </a>
            <a
              href={portalIdentity.socials.betterGovDirectory}
              target="_blank"
              rel="noreferrer"
            >
              {t("footer.directory")}
            </a>
            <a href={portalIdentity.socials.sourceCode} target="_blank" rel="noreferrer">
              {t("footer.sourceCode")}
            </a>
            <a
              href={`${portalIdentity.socials.sourceCode}/blob/main/LICENSE`}
              target="_blank"
              rel="noreferrer"
            >
              {t("footer.license")}
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
