import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { loadLguConfig } from "../app/lguConfig";
import { createPortalIdentity } from "../app/portalIdentity";
import { ProvenanceStatusBadge } from "../components/provenance/Provenance";
import { GlobalSearch } from "../components/search/GlobalSearch";
import services from "../data/services.json";

const portalIdentity = createPortalIdentity(loadLguConfig());
const quickServices = services.slice(0, 6);

export function HomePage() {
  const { t } = useTranslation("common");

  return (
    <div className="home-page">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero__copy">
          <p className="eyebrow">{portalIdentity.lguFullName}</p>
          <h1 id="home-title">{t("home.heroTitle")}</h1>
          <p>{t("home.heroDescription")}</p>
        </div>
        <GlobalSearch />
      </section>

      <section className="home-section" aria-labelledby="quick-access-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{portalIdentity.portalName}</p>
            <h2 id="quick-access-title">{t("home.quickAccessTitle")}</h2>
          </div>
          <p>{t("home.quickAccessDescription")}</p>
        </div>
        <div className="service-tile-grid">
          {quickServices.map((service) => (
            <Link
              key={service.id}
              className="service-tile"
              to={`/services/${service.category}`}
            >
              <span className="service-tile__title">
                {t(`services.categories.${service.category}`)}
              </span>
              <ProvenanceStatusBadge provenance={service.provenance} />
            </Link>
          ))}
        </div>
      </section>

      <section
        className="home-section home-section--split"
        aria-labelledby="announcements-title"
      >
        <article className="home-panel">
          <p className="eyebrow">{t("home.latestAnnouncements")}</p>
          <h2 id="announcements-title">{t("home.latestAnnouncements")}</h2>
          <p>{t("home.announcementsUnavailable")}</p>
          <a
            href={loadLguConfig().portal.socials.officialFacebook}
            target="_blank"
            rel="noreferrer"
          >
            {t("hotline.verifyOfficial")}
          </a>
        </article>
        <article className="home-panel" aria-labelledby="transparency-title">
          <p className="eyebrow">{t("home.transparencyTitle")}</p>
          <h2 id="transparency-title">{t("home.transparencyTitle")}</h2>
          <p>{t("home.transparencyUnavailable")}</p>
          <div className="home-panel__links">
            <Link className="text-link" to="/transparency">
              {t("home.transparencyAction")}
            </Link>
            <Link className="text-link" to="/statistics">
              {t("home.statisticsAction")}
            </Link>
          </div>
        </article>
      </section>

      <section
        id="contribute"
        className="contribute-panel"
        aria-labelledby="contribute-title"
      >
        <div>
          <p className="eyebrow">{t("home.contributeTitle")}</p>
          <h2 id="contribute-title">{t("home.contributeTitle")}</h2>
          <p>{t("home.contributeDescription")}</p>
        </div>
        <a
          className="button button--secondary"
          href={`${portalIdentity.socials.sourceCode}/issues`}
          target="_blank"
          rel="noreferrer"
        >
          {t("home.contributeAction")}
        </a>
      </section>

      <section
        id="disclaimer"
        className="disclaimer-panel"
        aria-labelledby="disclaimer-title"
      >
        <p className="eyebrow">{t("home.disclaimerTitle")}</p>
        <h2 id="disclaimer-title">{t("home.disclaimerTitle")}</h2>
        <p>{t("home.disclaimerBody")}</p>
        <a href={portalIdentity.socials.officialWebsite} target="_blank" rel="noreferrer">
          {t("footer.officialWebsite")}
        </a>
      </section>
    </div>
  );
}
