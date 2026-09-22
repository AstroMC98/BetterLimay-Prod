import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";

import { loadLguConfig } from "../app/lguConfig";
import { createPortalIdentity } from "../app/portalIdentity";
import { RouteMetadata } from "../lib/ui/RouteMetadata";

const config = loadLguConfig();
const portalIdentity = createPortalIdentity(config);

export type DisabledFeature =
  "legislation" | "transparency" | "statistics" | "news" | "reports";

interface PlaceholderPageProps {
  titleKey: string;
  descriptionKey: string;
  testId: string;
}

export function PortalPlaceholderPage({
  titleKey,
  descriptionKey,
  testId,
}: PlaceholderPageProps) {
  const { t } = useTranslation("common");
  const location = useLocation();
  const title = t(titleKey);
  const description = t(descriptionKey);

  return (
    <section className="foundation-page" data-testid={testId}>
      <RouteMetadata
        config={config}
        title={title}
        description={description}
        path={location.pathname}
      />
      <p className="eyebrow">{t("pages.independentEyebrow")}</p>
      <h1>{title}</h1>
      <p className="foundation-page__tagline">{description}</p>
      <div className="foundation-page__notice">
        <span className="status-dot" aria-hidden="true" />
        <p>{t("pages.placeholderNotice", { portal: portalIdentity.portalName })}</p>
      </div>
    </section>
  );
}

export function NotFoundPage() {
  return (
    <PortalPlaceholderPage
      titleKey="pages.notFound.title"
      descriptionKey="pages.notFound.description"
      testId="not-found-page"
    />
  );
}

export function OfflinePage() {
  const { t } = useTranslation("common");
  const location = useLocation();
  const title = t("pages.offline.title");
  const description = t("pages.offline.description");

  return (
    <section className="foundation-page offline-page" data-testid="offline-page">
      <RouteMetadata
        config={config}
        title={title}
        description={description}
        path={location.pathname}
      />
      <p className="eyebrow">{t("pages.independentEyebrow")}</p>
      <h1>{title}</h1>
      <p className="foundation-page__tagline">{description}</p>
      <div
        className="offline-page__source-gap"
        data-testid="offline-hotline-gap"
        role="note"
      >
        <span className="status-dot" aria-hidden="true" />
        <div>
          <p>{t("pages.offline.hotlineGap")}</p>
          <a
            href={portalIdentity.socials.officialWebsite}
            target="_blank"
            rel="noreferrer"
          >
            {t("pages.offline.verifyOfficial")}
          </a>
        </div>
      </div>
    </section>
  );
}

export function FeatureDisabledPage({ feature }: { feature: DisabledFeature }) {
  const { t } = useTranslation("common");
  const location = useLocation();
  const featureLabel = t(`navigation.${feature === "reports" ? "report" : feature}`);
  const title = t("pages.featureDisabled.title", { feature: featureLabel });
  const description = t("pages.featureDisabled.description", {
    feature: featureLabel,
  });

  return (
    <section className="foundation-page" data-testid="feature-disabled-page">
      <RouteMetadata
        config={config}
        title={title}
        description={description}
        path={location.pathname}
      />
      <p className="eyebrow">{t("pages.independentEyebrow")}</p>
      <h1>{title}</h1>
      <p className="foundation-page__tagline">{description}</p>
      <div className="foundation-page__notice">
        <span className="status-dot" aria-hidden="true" />
        <p>{t("pages.featureDisabled.notice")}</p>
      </div>
    </section>
  );
}
