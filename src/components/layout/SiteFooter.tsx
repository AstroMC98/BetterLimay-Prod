import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { loadLguConfig } from "../../app/lguConfig";
import { createPortalIdentity } from "../../app/portalIdentity";
import officesJson from "../../data/offices.json";
import type { OfficeRecord } from "../../data/types";
import { IconFacebook, IconGitHub } from "../home/icons";
import { FOOTER_COLUMNS, type FooterLink } from "./footerLinks";

const portalIdentity = createPortalIdentity(loadLguConfig());

/** The Municipal Hall line: the one contact every page should carry. */
const municipalHall = (officesJson as OfficeRecord[]).find(
  (office) => office.id === "municipal-hall",
);

const BRAND_PREFIX = "Better";
const nameParts = portalIdentity.portalName.startsWith(BRAND_PREFIX)
  ? [BRAND_PREFIX, portalIdentity.portalName.slice(BRAND_PREFIX.length)]
  : [portalIdentity.portalName, ""];

function FooterAnchor({ link }: { link: FooterLink }) {
  const { t } = useTranslation("common");
  const label = t(`footer.links.${link.label}`);
  // /admin is a separate app, not a client route, so it gets a plain anchor.
  if (link.external) {
    return link.href.startsWith("/") ? (
      <a href={link.href}>{label}</a>
    ) : (
      <a href={link.href} target="_blank" rel="noreferrer">
        {label}
      </a>
    );
  }
  return <Link to={link.href}>{label}</Link>;
}

/**
 * A full site footer in the BetterGov chapter style: identity and contact on
 * the left, four link columns, then the "Cost to the People" line.
 *
 * Dark in both themes on purpose: it closes every page the same way.
 */
export function SiteFooter() {
  const { t } = useTranslation("common");
  const phone = municipalHall?.contact?.phone?.split("/")[0].trim();
  const email = municipalHall?.contact?.email;

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__top">
          <div className="site-footer__brand">
            <Link
              className="site-footer__mark"
              to="/"
              aria-label={portalIdentity.portalName}
            >
              <img src="/brand/emblem-white.svg" alt="" width="40" height="38" />
              <span>
                <span className="site-footer__name">
                  {nameParts[0]}
                  <b>{nameParts[1]}</b>
                </span>
                <span className="site-footer__tag">{t("footer.tagline")}</span>
              </span>
            </Link>
            <p>{t("footer.description")}</p>
            {phone || email ? (
              <p className="site-footer__contact">
                {t("footer.municipalHall")}:{" "}
                {phone ? (
                  <a href={`tel:${phone.replace(/[^0-9+]/g, "")}`}>{phone}</a>
                ) : null}
                {phone && email ? " · " : null}
                {email ? <a href={`mailto:${email}`}>{email}</a> : null}
              </p>
            ) : null}
            <div className="site-footer__social">
              <a
                href={portalIdentity.socials.officialFacebook}
                target="_blank"
                rel="noreferrer"
                aria-label={t("footer.facebookLabel")}
              >
                <IconFacebook />
              </a>
              <a
                href={portalIdentity.socials.sourceCode}
                target="_blank"
                rel="noreferrer"
                aria-label={t("footer.githubLabel")}
              >
                <IconGitHub />
              </a>
            </div>
          </div>

          <nav className="site-footer__columns" aria-label={t("footer.footerNavigation")}>
            {FOOTER_COLUMNS.map((column) => (
              <div key={column.title}>
                <h2>{t(`footer.columns.${column.title}`)}</h2>
                <ul>
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <FooterAnchor link={link} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <p className="site-footer__pill">
          <span>{t("footer.builtBy")}</span>
          <span aria-hidden="true">•</span>
          <strong>
            {t("footer.costLabel")} <span className="site-footer__zero">₱0</span>
          </strong>
        </p>

        <div className="site-footer__bottom">
          <p>
            {t("footer.copyright", { year: new Date().getFullYear() })}{" "}
            {t("footer.independentPortal")} {t("footer.facebookNote")}
          </p>
          <div>
            <a
              href={`${portalIdentity.socials.sourceCode}/blob/main/LICENSE`}
              target="_blank"
              rel="noreferrer"
            >
              {t("footer.license")}
            </a>
            <a href={portalIdentity.socials.sourceCode} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <Link to="/sitemap">{t("footer.sitemap")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
