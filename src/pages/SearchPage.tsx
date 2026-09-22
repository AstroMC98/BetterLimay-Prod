import { useTranslation } from "react-i18next";
import { useLocation, useSearchParams } from "react-router-dom";

import { loadLguConfig } from "../app/lguConfig";
import { GlobalSearch } from "../components/search/GlobalSearch";
import { RouteMetadata } from "../lib/ui/RouteMetadata";

const config = loadLguConfig();

export function SearchPage() {
  const { t } = useTranslation("common");
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const title = t("pages.search.title");
  const description = t("pages.search.description");

  return (
    <section className="foundation-page search-page" data-testid="search-page">
      <RouteMetadata
        config={config}
        title={title}
        description={description}
        path={location.pathname}
      />
      <p className="eyebrow">{t("search.results")}</p>
      <h1>{title}</h1>
      <p className="foundation-page__tagline">{description}</p>
      <GlobalSearch initialQuery={searchParams.get("q") ?? ""} autoFocus />
    </section>
  );
}
