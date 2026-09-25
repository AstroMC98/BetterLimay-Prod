import { useTranslation } from "react-i18next";

import { loadLguConfig } from "../app/lguConfig";
import { createPortalIdentity } from "../app/portalIdentity";
import { FacebookFeed } from "../components/home/FacebookFeed";
import { HistoryTimeline } from "../components/home/HistoryTimeline";
import {
  AboutStrip,
  PopularServices,
  SpendingCards,
  WhoServes,
} from "../components/home/HomeSections";
import { GlobalSearch } from "../components/search/GlobalSearch";

const portalIdentity = createPortalIdentity(loadLguConfig());

/**
 * The home page, in the order a resident needs it: find a service, see what
 * the Municipality is saying, know who serves you, follow the money, and
 * where Limay comes from.
 */
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
        <div className="home-hero__search">
          <GlobalSearch />
          <PopularServices />
        </div>
      </section>

      <FacebookFeed />
      <WhoServes />
      <SpendingCards />
      <HistoryTimeline />
      <AboutStrip />
    </div>
  );
}
