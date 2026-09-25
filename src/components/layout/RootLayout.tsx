import { Suspense, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { Link, Outlet } from "react-router-dom";

import { loadLguConfig } from "../../app/lguConfig";
import { createPortalIdentity } from "../../app/portalIdentity";
import { HotlineBar } from "../home/HotlineBar";
import { InfoBar } from "../home/InfoBar";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { LoadingState } from "./LoadingState";
import { Navigation } from "./Navigation";

const portalIdentity = createPortalIdentity(loadLguConfig());

/* The brand guide sets the wordmark in Montserrat with "Better" in Medium and the
   place name in ExtraBold. Every BetterGov chapter follows the same Better+place
   pattern, so a fork gets the correct lockup without extra configuration. */
const BRAND_PREFIX = "Better";
const portalNameParts = portalIdentity.portalName.startsWith(BRAND_PREFIX)
  ? [BRAND_PREFIX, portalIdentity.portalName.slice(BRAND_PREFIX.length)]
  : [portalIdentity.portalName, ""];

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
            <img
              className="portal-mark__emblem"
              src="/brand/emblem-full-colour.svg"
              alt=""
              width="54"
              height="52"
            />
            <span className="portal-mark__text">
              <span className="portal-mark__name">
                {portalNameParts[0]}
                <b>{portalNameParts[1]}</b>
              </span>
              <span className="portal-mark__place">{portalIdentity.lguFullName}</span>
            </span>
          </Link>
          <div className="portal-header__actions">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>
        <div className="portal-nav">
          <div className="portal-nav__inner">
            <Navigation />
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
            <p className="portal-footer__endorsement">{t("footer.endorsement")}</p>
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
