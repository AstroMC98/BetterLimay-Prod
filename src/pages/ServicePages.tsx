import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";

import { loadLguConfig } from "../app/lguConfig";
import officesJson from "../data/offices.json";
import servicesJson from "../data/services.json";
import type { OfficeRecord, ServiceCategory, ServiceRecord } from "../data/types";
import {
  ProvenancePanel,
  ProvenanceStatusBadge,
} from "../components/provenance/Provenance";
import { RouteMetadata } from "../lib/ui/RouteMetadata";
import {
  filterServices,
  findServiceByRoute,
  getServiceCategoryOptions,
  getStatedProcessingTime,
  hasListedFees,
  hasUnverifiedServiceData,
  isProvidedByAnotherEntity,
  sortServiceSteps,
} from "../lib/ui/serviceCatalog";
import { NotFoundPage } from "./PortalStatusPages";

const config = loadLguConfig();
const services = servicesJson as ServiceRecord[];
const offices = officesJson as OfficeRecord[];
const categoryOptions = getServiceCategoryOptions(services);

function isServiceCategory(value: string | undefined): value is ServiceCategory {
  return services.some((service) => service.category === value);
}

function officeNameFor(service: ServiceRecord): string | undefined {
  return (
    offices.find((office) => office.id === service.responsibleOfficeId)?.name ??
    service.responsibleOfficeName
  );
}

/**
 * One service in a grid: what it is, who handles it, how long, whether it costs.
 *
 * The card never names a peer LGU. A resident scanning "Municipality of Orion"
 * on a Limay card reads it as "go to Orion"; where a record comes from is
 * stated on the detail page, one click away, next to the fees it qualifies.
 */
function ServiceCard({
  service,
  showCategory = true,
}: {
  service: ServiceRecord;
  showCategory?: boolean;
}) {
  const { t } = useTranslation("common");
  const office = officeNameFor(service);
  const processingTime = getStatedProcessingTime(service);

  return (
    <Link
      className="service-record-card"
      data-testid={`service-card-${service.slug}`}
      to={`/services/${service.category}/${service.slug}`}
    >
      {showCategory ? (
        <span className="service-record-card__category">
          {t(`services.categories.${service.category}`)}
        </span>
      ) : null}
      <strong className="service-record-card__title">{service.title}</strong>
      {office ? <span className="service-record-card__office">{office}</span> : null}
      <dl className="service-record-card__facts">
        <div>
          <dt>{t("services.card.processingTime")}</dt>
          <dd title={processingTime}>{processingTime ?? t("services.card.notStated")}</dd>
        </div>
        <div>
          <dt>{t("services.card.fees")}</dt>
          <dd>
            {hasListedFees(service)
              ? t("services.card.feesSome")
              : t("services.card.feesNone")}
          </dd>
        </div>
      </dl>
    </Link>
  );
}

function ServiceCategoryCard({
  category,
  count,
}: {
  category: ServiceCategory;
  count: number;
}) {
  const { t } = useTranslation("common");
  const categoryLabel = t(`services.categories.${category}`);

  return (
    <Link
      className="service-category-card"
      data-testid={`service-category-${category}`}
      to={`/services/${category}`}
    >
      <strong className="service-category-card__title">{categoryLabel}</strong>
      <span className="service-category-card__count">
        {t("services.categoryCount", { count })}
      </span>
    </Link>
  );
}

export function ServicesPage() {
  const { t } = useTranslation("common");
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const initialCategory = searchParams.get("category");
  const initialServiceCategory: ServiceCategory | "all" = isServiceCategory(
    initialCategory ?? undefined,
  )
    ? (initialCategory as ServiceCategory)
    : "all";
  const [category, setCategory] = useState<ServiceCategory | "all">(
    initialServiceCategory,
  );
  const filteredRecords = filterServices(services, query, category);
  const title = t("pages.services.title");
  const description = t("pages.services.description");

  function updateFilters(nextQuery: string, nextCategory: ServiceCategory | "all") {
    const nextParams = new URLSearchParams();
    if (nextQuery.trim()) nextParams.set("q", nextQuery.trim());
    if (nextCategory !== "all") nextParams.set("category", nextCategory);
    setSearchParams(nextParams, { replace: true });
  }

  return (
    <section className="foundation-page services-page" data-testid="services-page">
      <RouteMetadata
        config={config}
        title={title}
        description={description}
        path={location.pathname}
      />
      <p className="eyebrow">{t("services.directoryEyebrow")}</p>
      <h1>{title}</h1>
      <p className="foundation-page__tagline">{t("services.directoryDescription")}</p>

      <form
        className="service-filter"
        role="search"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="service-filter__field">
          <label htmlFor="service-search">{t("services.searchLabel")}</label>
          <input
            id="service-search"
            name="q"
            placeholder={t("services.searchPlaceholder")}
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              updateFilters(event.target.value, category);
            }}
          />
        </div>
        <div className="service-filter__field">
          <label htmlFor="service-category">{t("services.categoryFilterLabel")}</label>
          <select
            id="service-category"
            name="category"
            value={category}
            onChange={(event) => {
              const nextCategory = event.target.value as ServiceCategory | "all";
              setCategory(nextCategory);
              updateFilters(query, nextCategory);
            }}
          >
            <option value="all">{t("services.allCategories")}</option>
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {t(`services.categories.${option.value}`)}
              </option>
            ))}
          </select>
        </div>
      </form>

      <div className="service-category-grid" aria-label={title}>
        {categoryOptions.map((option) => (
          <ServiceCategoryCard
            key={option.value}
            category={option.value}
            count={option.count}
          />
        ))}
      </div>

      <section className="service-results" aria-labelledby="service-results-heading">
        <div className="section-heading">
          <h2 id="service-results-heading">{t("services.resultsHeading")}</h2>
        </div>
        {filteredRecords.length > 0 ? (
          <div className="service-record-grid">
            {filteredRecords.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        ) : (
          <div className="foundation-page__notice" role="status">
            <span className="status-dot" aria-hidden="true" />
            <p>{t("services.noResults")}</p>
          </div>
        )}
      </section>
    </section>
  );
}

export function ServiceCategoryPage() {
  const { t } = useTranslation("common");
  const location = useLocation();
  const { category } = useParams();

  if (!isServiceCategory(category)) {
    return <NotFoundPage />;
  }

  const categoryLabel = t(`services.categories.${category}`);
  const records = services.filter((service) => service.category === category);
  const title = t("pages.services.categoryTitle", { category: categoryLabel });
  const description = t("pages.services.categoryDescription", {
    category: categoryLabel,
  });

  return (
    <section
      className="foundation-page services-page"
      data-testid="service-category-page"
    >
      <RouteMetadata
        config={config}
        title={title}
        description={description}
        path={location.pathname}
      />
      <Link className="text-link service-breadcrumb" to="/services">
        {t("services.backToServices")}
      </Link>
      <p className="eyebrow">{t("services.directoryEyebrow")}</p>
      <h1>{title}</h1>
      <p className="foundation-page__tagline">{description}</p>
      <div className="service-record-grid">
        {records.map((service) => (
          // Every card here shares the page's category; repeating it is noise.
          <ServiceCard key={service.id} service={service} showCategory={false} />
        ))}
      </div>
    </section>
  );
}

function ServiceList({ values }: { values: string[] }) {
  const { t } = useTranslation("common");

  return (
    <ul className="service-detail__list">
      {(values.length > 0 ? values : [t("services.missingValue")]).map((value, index) => (
        <li key={`${value}-${index}`}>{value}</li>
      ))}
    </ul>
  );
}

function ShareActions() {
  const { t } = useTranslation("common");
  const [shareStatus, setShareStatus] = useState("");

  async function sharePage() {
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, url: window.location.href });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
      } else {
        throw new Error("Clipboard unavailable");
      }
      setShareStatus(t("services.shared"));
    } catch {
      setShareStatus(t("services.shareUnavailable"));
    }
  }

  return (
    <div className="service-detail__actions" data-testid="service-actions">
      <button
        className="button button--secondary"
        type="button"
        onClick={() => window.print()}
      >
        {t("services.print")}
      </button>
      <button
        className="button button--secondary"
        type="button"
        onClick={() => void sharePage()}
      >
        {t("services.share")}
      </button>
      {shareStatus ? <span role="status">{shareStatus}</span> : null}
    </div>
  );
}

export function ServiceDetailPage() {
  const { t } = useTranslation("common");
  const location = useLocation();
  const { category, slug } = useParams();
  const service = findServiceByRoute(services, category, slug);

  if (!service) {
    return <NotFoundPage />;
  }

  const categoryLabel = t(`services.categories.${service.category}`);
  const office = offices.find(
    (candidate) => candidate.id === service.responsibleOfficeId,
  );
  const steps = sortServiceSteps(service.steps);
  const providedElsewhere = isProvidedByAnotherEntity(service);
  const title = service.title;
  const description = t("pages.services.detailDescription", {
    service: service.title,
  });

  return (
    <article className="foundation-page service-detail" data-testid="service-detail-page">
      <RouteMetadata
        config={config}
        title={title}
        description={description}
        path={location.pathname}
        type="article"
      />
      <Link className="text-link service-breadcrumb" to={`/services/${service.category}`}>
        {t("services.backToCategory", { category: categoryLabel })}
      </Link>
      <div className="service-detail__header">
        <div>
          <p className="eyebrow">{t("services.directoryEyebrow")}</p>
          <h1>{title}</h1>
          <p className="foundation-page__tagline">
            {service.summary ?? t("services.missingValue")}
          </p>
          {providedElsewhere ? (
            // Small and next to the title rather than a warning banner: the
            // process is the useful part and transfers; only the numbers may
            // not, and this line says exactly that.
            <p
              className="service-origin-note"
              role="note"
              data-testid="service-provider-notice"
            >
              {t("services.providerNotice.inferred", {
                entity: service.providerEntity ?? t("services.missingValue"),
                edition: service.charterEdition ?? t("services.missingValue"),
                page: service.sourcePage
                  ? t("services.providerNotice.page", { page: service.sourcePage })
                  : "",
              })}
            </p>
          ) : null}
        </div>
        <div className="service-detail__status">
          <ProvenanceStatusBadge provenance={service.provenance} />
          <span>
            {t("services.lastRetrieved")}: {service.provenance.retrieved_at}
          </span>
        </div>
      </div>
      <ShareActions />
      {hasUnverifiedServiceData(service) ? (
        <div className="service-detail__notice" role="note">
          <span className="status-dot" aria-hidden="true" />
          <p>{t("services.verifyBeforeRelying")}</p>
        </div>
      ) : null}

      <div className="service-detail__grid">
        <section aria-labelledby="service-eligibility-heading">
          <h2 id="service-eligibility-heading">{t("services.eligibility")}</h2>
          <ServiceList values={service.eligibleApplicants} />
        </section>
        <section aria-labelledby="service-requirements-heading">
          <h2 id="service-requirements-heading">{t("services.requirements")}</h2>
          <fieldset className="service-checklist">
            <legend className="sr-only">{t("services.requirements")}</legend>
            {(service.requirements.length > 0
              ? service.requirements
              : [t("services.missingValue")]
            ).map((requirement, index) => (
              <label key={`${requirement}-${index}`}>
                <input type="checkbox" />
                <span>{requirement}</span>
              </label>
            ))}
          </fieldset>
        </section>
        <section aria-labelledby="service-steps-heading">
          <h2 id="service-steps-heading">{t("services.steps")}</h2>
          <ol className="service-steps">
            {(steps.length > 0
              ? steps
              : [
                  {
                    order: 1,
                    actor: t("services.missingValue"),
                    action: t("services.missingValue"),
                  },
                ]
            ).map((step) => (
              <li key={`${step.order}-${step.actor}-${step.action}`}>
                <strong>{t("services.stepActor", { actor: step.actor })}</strong>
                <span>{step.action}</span>
              </li>
            ))}
          </ol>
        </section>
        <section aria-labelledby="service-fees-heading">
          <h2 id="service-fees-heading">{t("services.fees")}</h2>
          <dl className="service-fees">
            {(service.fees.length > 0
              ? service.fees
              : [
                  {
                    label: t("services.missingValue"),
                    amount: t("services.missingValue"),
                  },
                ]
            ).map((fee, index) => (
              <div key={`${fee.label}-${index}`}>
                <dt>{fee.label}</dt>
                <dd>{fee.amount}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section aria-labelledby="service-office-heading">
          <h2 id="service-office-heading">{t("services.responsibleOffice")}</h2>
          <p>{officeNameFor(service) ?? t("services.missingValue")}</p>
          {office ? <ProvenanceStatusBadge provenance={office.provenance} /> : null}
        </section>
        <section aria-labelledby="service-time-heading">
          <h2 id="service-time-heading">{t("services.processingTime")}</h2>
          <p>{service.processingTime || t("services.missingValue")}</p>
        </section>
      </div>
      <ProvenancePanel provenance={service.provenance} className="service-source-panel" />
    </article>
  );
}
