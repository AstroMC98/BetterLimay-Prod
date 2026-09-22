import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";

import { loadLguConfig } from "../app/lguConfig";
import legislationJson from "../data/legislation.json";
import type { LegislationRecord } from "../data/types";
import {
  ProvenanceDetails,
  ProvenancePanel,
  ProvenanceStatusBadge,
} from "../components/provenance/Provenance";
import { RouteMetadata } from "../lib/ui/RouteMetadata";
import {
  filterLegislation,
  findLegislationById,
  getLegislationFilterOptions,
  type LegislationFilters,
} from "../lib/ui/legislationCatalog";
import { NotFoundPage } from "./PortalStatusPages";

const config = loadLguConfig();
const legislation = legislationJson as LegislationRecord[];
const filterOptions = getLegislationFilterOptions(legislation);

function getFilters(searchParams: URLSearchParams): LegislationFilters {
  return {
    query: searchParams.get("q") ?? "",
    type: (searchParams.get("type") as LegislationFilters["type"]) ?? "all",
    year: searchParams.get("year") ?? "",
    committee: searchParams.get("committee") ?? "",
    author: searchParams.get("author") ?? "",
    status: searchParams.get("status") ?? "",
  };
}

function getRecordTitle(record: LegislationRecord): string {
  return `${record.type.replaceAll("-", " ")} No. ${record.number}: ${record.title}`;
}

function hasActiveFilters(filters: LegislationFilters): boolean {
  return Boolean(
    filters.query ||
    (filters.type && filters.type !== "all") ||
    filters.year ||
    filters.committee ||
    filters.author ||
    filters.status,
  );
}

export function LegislationRecordCard({ record }: { record: LegislationRecord }) {
  const { t } = useTranslation("common");
  const title = getRecordTitle(record);

  return (
    <article
      className="legislation-record-card"
      data-testid={`legislation-card-${record.id}`}
    >
      <div className="legislation-record-card__header">
        <div>
          <p className="legislation-record-card__label">
            {t(`legislation.types.${record.type}`)} · {record.year}
          </p>
          <h2>
            <Link to={`/legislation/${record.id}`}>{title}</Link>
          </h2>
        </div>
        <ProvenanceStatusBadge provenance={record.provenance} />
      </div>

      <dl className="legislation-record-card__details">
        <div>
          <dt>{t("legislation.status")}</dt>
          <dd>{record.status}</dd>
        </div>
        {record.committee ? (
          <div>
            <dt>{t("legislation.committee")}</dt>
            <dd>{record.committee}</dd>
          </div>
        ) : null}
        {record.dateEnacted ? (
          <div>
            <dt>{t("legislation.dateEnacted")}</dt>
            <dd>{record.dateEnacted}</dd>
          </div>
        ) : null}
      </dl>

      <div className="legislation-record-card__summary">
        <p className="legislation-record-card__summary-label">
          {t("legislation.summaryLabel")}
        </p>
        {record.summary ? (
          <p>{record.summary}</p>
        ) : (
          <p>{t("legislation.summaryNotAvailable")}</p>
        )}
        <p className="legislation-record-card__summary-status">
          {t(`legislation.summaryStatus.${record.summaryStatus}`)}
        </p>
      </div>

      <a className="text-link" href={record.documentUrl} target="_blank" rel="noreferrer">
        {t("legislation.openDocument")}
      </a>
      <ProvenanceDetails provenance={record.provenance} />
    </article>
  );
}

function LegislationFilters({
  filters,
  onChange,
}: {
  filters: LegislationFilters;
  onChange: (key: keyof LegislationFilters, value: string) => void;
}) {
  const { t } = useTranslation("common");

  return (
    <form
      className="legislation-filter"
      role="search"
      onSubmit={(event) => event.preventDefault()}
    >
      <div className="legislation-filter__field legislation-filter__field--query">
        <label htmlFor="legislation-search">{t("legislation.searchLabel")}</label>
        <input
          id="legislation-search"
          type="search"
          value={filters.query ?? ""}
          placeholder={t("legislation.searchPlaceholder")}
          onChange={(event) => onChange("query", event.target.value)}
        />
      </div>
      <div className="legislation-filter__field">
        <label htmlFor="legislation-type">{t("legislation.typeFilter")}</label>
        <select
          id="legislation-type"
          value={filters.type ?? "all"}
          onChange={(event) => onChange("type", event.target.value)}
        >
          <option value="all">{t("legislation.allTypes")}</option>
          {filterOptions.types.map((type) => (
            <option key={type} value={type}>
              {t(`legislation.types.${type}`)}
            </option>
          ))}
        </select>
      </div>
      <div className="legislation-filter__field">
        <label htmlFor="legislation-year">{t("legislation.yearFilter")}</label>
        <select
          id="legislation-year"
          value={filters.year ?? ""}
          onChange={(event) => onChange("year", event.target.value)}
        >
          <option value="">{t("legislation.allYears")}</option>
          {filterOptions.years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>
      <div className="legislation-filter__field">
        <label htmlFor="legislation-committee">{t("legislation.committeeFilter")}</label>
        <select
          id="legislation-committee"
          value={filters.committee ?? ""}
          onChange={(event) => onChange("committee", event.target.value)}
        >
          <option value="">{t("legislation.allCommittees")}</option>
          {filterOptions.committees.map((committee) => (
            <option key={committee} value={committee}>
              {committee}
            </option>
          ))}
        </select>
      </div>
      <div className="legislation-filter__field">
        <label htmlFor="legislation-author">{t("legislation.authorFilter")}</label>
        <select
          id="legislation-author"
          value={filters.author ?? ""}
          onChange={(event) => onChange("author", event.target.value)}
        >
          <option value="">{t("legislation.allAuthors")}</option>
          {filterOptions.authors.map((author) => (
            <option key={author} value={author}>
              {author}
            </option>
          ))}
        </select>
      </div>
      <div className="legislation-filter__field">
        <label htmlFor="legislation-status">{t("legislation.statusFilter")}</label>
        <select
          id="legislation-status"
          value={filters.status ?? ""}
          onChange={(event) => onChange("status", event.target.value)}
        >
          <option value="">{t("legislation.allStatuses")}</option>
          {filterOptions.statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>
    </form>
  );
}

export function LegislationPage() {
  const { t } = useTranslation("common");
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<LegislationFilters>(() =>
    getFilters(searchParams),
  );
  const filteredRecords = filterLegislation(legislation, filters);
  const title = t("pages.legislation.title");
  const description = t("pages.legislation.description");
  const activeFilters = hasActiveFilters(filters);

  function updateFilter(key: keyof LegislationFilters, value: string) {
    const nextFilters = { ...filters, [key]: value };
    const nextParams = new URLSearchParams();
    const parameterKeys: Array<[keyof LegislationFilters, string]> = [
      ["query", "q"],
      ["type", "type"],
      ["year", "year"],
      ["committee", "committee"],
      ["author", "author"],
      ["status", "status"],
    ];
    parameterKeys.forEach(([filterKey, parameterKey]) => {
      const nextValue = nextFilters[filterKey];
      if (nextValue && nextValue !== "all") nextParams.set(parameterKey, nextValue);
    });
    setFilters(nextFilters);
    setSearchParams(nextParams, { replace: true });
  }

  return (
    <section
      className="foundation-page foundation-page--wide legislation-page"
      data-testid="legislation-page"
    >
      <RouteMetadata
        config={config}
        title={title}
        description={description}
        path={location.pathname}
      />
      <p className="eyebrow">{t("legislation.eyebrow")}</p>
      <h1>{title}</h1>
      <p className="foundation-page__tagline">{description}</p>

      <LegislationFilters filters={filters} onChange={updateFilter} />

      <section
        className="legislation-results"
        aria-labelledby="legislation-results-title"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t("legislation.resultsEyebrow")}</p>
            <h2 id="legislation-results-title">{t("legislation.resultsTitle")}</h2>
          </div>
          <p className="legislation-results__count" role="status">
            {t("legislation.resultCount", { count: filteredRecords.length })}
          </p>
        </div>
        {filteredRecords.length > 0 ? (
          <div className="legislation-record-grid">
            {filteredRecords.map((record) => (
              <LegislationRecordCard key={record.id} record={record} />
            ))}
          </div>
        ) : (
          <div
            className="legislation-empty"
            data-testid="legislation-empty"
            role="status"
          >
            <span className="status-dot" aria-hidden="true" />
            <div>
              <h2>
                {activeFilters ? t("legislation.noResults") : t("legislation.empty")}
              </h2>
              <p>
                {activeFilters
                  ? t("legislation.noResultsDescription")
                  : t("legislation.emptyDescription")}
              </p>
            </div>
          </div>
        )}
      </section>
    </section>
  );
}

export function LegislationDetailPage() {
  const { t } = useTranslation("common");
  const location = useLocation();
  const { id } = useParams();
  const record = findLegislationById(legislation, id);

  if (!record) return <NotFoundPage />;

  const title = getRecordTitle(record);

  return (
    <article
      className="foundation-page foundation-page--wide legislation-detail"
      data-testid="legislation-detail-page"
    >
      <RouteMetadata
        config={config}
        title={title}
        description={record.summary ?? t("legislation.summaryNotAvailable")}
        path={location.pathname}
        type="article"
      />
      <Link className="text-link legislation-breadcrumb" to="/legislation">
        {t("legislation.backToIndex")}
      </Link>
      <p className="eyebrow">
        {t(`legislation.types.${record.type}`)} · {record.year}
      </p>
      <h1>{title}</h1>
      <div className="legislation-detail__status">
        <ProvenanceStatusBadge provenance={record.provenance} />
        <span>
          {t("legislation.status")}: {record.status}
        </span>
      </div>

      <section
        className="legislation-detail__summary"
        aria-labelledby="legislation-summary-title"
      >
        <p className="eyebrow">{t("legislation.summaryEyebrow")}</p>
        <h2 id="legislation-summary-title">{t("legislation.summaryLabel")}</h2>
        <p>{record.summary ?? t("legislation.summaryNotAvailable")}</p>
        <p className="legislation-record-card__summary-status">
          {t(`legislation.summaryStatus.${record.summaryStatus}`)}
        </p>
      </section>

      <dl className="legislation-detail__facts">
        <div>
          <dt>{t("legislation.number")}</dt>
          <dd>{record.number}</dd>
        </div>
        <div>
          <dt>{t("legislation.dateEnacted")}</dt>
          <dd>{record.dateEnacted ?? t("legislation.notAvailable")}</dd>
        </div>
        <div>
          <dt>{t("legislation.committee")}</dt>
          <dd>{record.committee ?? t("legislation.notAvailable")}</dd>
        </div>
      </dl>

      <p>
        <a
          className="button button--primary"
          href={record.documentUrl}
          target="_blank"
          rel="noreferrer"
        >
          {t("legislation.openDocument")}
        </a>
      </p>
      <ProvenancePanel
        provenance={record.provenance}
        className="legislation-source-panel"
      />
    </article>
  );
}
