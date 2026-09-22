import { loadLguConfig } from "../app/lguConfig";
import { createPortalIdentity } from "../app/portalIdentity";
import { useTranslation } from "react-i18next";

const portalIdentity = createPortalIdentity(loadLguConfig());

export function FoundationPage() {
  const { t } = useTranslation("common");

  return (
    <section className="foundation-page" aria-labelledby="foundation-title">
      <p className="eyebrow">{t("common.communityInformationPortal")}</p>
      <h1 id="foundation-title">{portalIdentity.portalName}</h1>
      <p className="foundation-page__tagline">{portalIdentity.tagline}</p>
      <div className="foundation-page__notice">
        <span className="status-dot" aria-hidden="true" />
        <p>{t("common.portalIdentityLoaded")}</p>
      </div>
    </section>
  );
}
