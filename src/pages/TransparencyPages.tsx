import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { loadLguConfig } from "../app/lguConfig";
import {
  ProvenanceDetails,
  ProvenanceStatusBadge,
} from "../components/provenance/Provenance";
import statisticsJson from "../data/statistics.json";
import transparencyJson from "../data/transparency.json";
import type { StatisticRecord, TransparencyRecord } from "../data/types";
import { RouteMetadata } from "../lib/ui/RouteMetadata";
import {
  getTransparencyChartData,
  getTransparencyGroups,
} from "../lib/ui/transparencyCatalog";
import {
  getStatisticMetricGroups,
  getStatisticsChartData,
} from "../lib/ui/statisticsCatalog";

const config = loadLguConfig();
const transparency = transparencyJson as TransparencyRecord[];
const statistics = statisticsJson as StatisticRecord[];

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-PH").format(value);
}

function formatAmount(value: number | null, unit: string, notAvailable: string): string {
  if (value === null) return notAvailable;
  if (unit === "PHP") return `₱${formatNumber(value)}`;
  return `${formatNumber(value)} ${unit}`;
}

function pageClassName(page: string): string {
  return `foundation-page foundation-page--wide data-page ${page}`;
}

function DataGapNotice({ children }: { children: ReactNode }) {
  return (
    <div className="data-gap-notice" role="note">
      <span className="status-dot" aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}

function TransparencyTable({
  records,
  testId,
}: {
  records: TransparencyRecord[];
  testId?: string;
}) {
  const { t } = useTranslation("common");

  return (
    <div className="data-table-wrapper" data-testid={testId}>
      <table className="data-table">
        <caption>{t("transparency.tableCaption")}</caption>
        <thead>
          <tr>
            <th scope="col">{t("transparency.fields.record")}</th>
            <th scope="col">{t("transparency.fields.year")}</th>
            <th scope="col">{t("transparency.fields.amount")}</th>
            <th scope="col">{t("transparency.fields.status")}</th>
            <th scope="col">{t("transparency.fields.agency")}</th>
            <th scope="col">{t("transparency.fields.location")}</th>
            <th scope="col">{t("transparency.fields.source")}</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id}>
              <th scope="row">
                <span className="data-table__title">{record.title}</span>
                <span className="data-table__meta">
                  {t(`transparency.kinds.${record.kind}`)}
                </span>
                <details className="data-table__explanation">
                  <summary>{t("transparency.howToRead")}</summary>
                  <p>{record.howToRead}</p>
                </details>
              </th>
              <td>{record.year}</td>
              <td>
                {formatAmount(record.amount, record.unit, t("transparency.notAvailable"))}
              </td>
              <td>{record.status}</td>
              <td>{record.sourceAgency}</td>
              <td>{record.location ?? t("transparency.notAvailable")}</td>
              <td>
                <ProvenanceStatusBadge provenance={record.provenance} />
                <ProvenanceDetails provenance={record.provenance} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TransparencyChart({
  records,
  unit,
}: {
  records: TransparencyRecord[];
  unit: string;
}) {
  const { t } = useTranslation("common");
  const chartData = getTransparencyChartData(records, unit).records.map((record) => ({
    label: record.title,
    value: record.amount ?? 0,
    year: record.year,
  }));

  if (chartData.length === 0) return null;

  return (
    <div
      className="data-chart"
      role="img"
      aria-label={t("transparency.chartLabel", { unit })}
    >
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 12, right: 12, bottom: 64, left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--better-border)" />
          <XAxis dataKey="label" angle={-25} textAnchor="end" height={80} interval={0} />
          <YAxis tickFormatter={(value: number) => formatNumber(value)} />
          <Tooltip
            formatter={(value: unknown) => [
              formatAmount(typeof value === "number" ? value : null, unit, "—"),
              unit,
            ]}
          />
          <Bar
            dataKey="value"
            fill="var(--better-brand-primary)"
            name={t("transparency.amount")}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function StatisticsTable({ records }: { records: StatisticRecord[] }) {
  const { t } = useTranslation("common");

  return (
    <div className="data-table-wrapper" data-testid="statistics-chart-table">
      <table className="data-table">
        <caption>{t("statistics.tableCaption")}</caption>
        <thead>
          <tr>
            <th scope="col">{t("statistics.fields.year")}</th>
            <th scope="col">{t("statistics.fields.value")}</th>
            <th scope="col">{t("statistics.fields.geography")}</th>
            <th scope="col">{t("statistics.fields.source")}</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id}>
              <th scope="row">{record.year}</th>
              <td>
                <span className="data-table__title">
                  {formatNumber(record.value)} {record.unit}
                </span>
                <details className="data-table__explanation">
                  <summary>{t("statistics.howToRead")}</summary>
                  <p>{record.howToRead}</p>
                </details>
              </td>
              <td>{record.geography}</td>
              <td>
                <ProvenanceStatusBadge provenance={record.provenance} />
                <ProvenanceDetails provenance={record.provenance} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TransparencyPage() {
  const { t } = useTranslation("common");
  const groups = getTransparencyGroups(transparency);
  const chartUnit = transparency.find((record) => record.amount !== null)?.unit ?? "";
  const chartRecords = getTransparencyChartData(transparency, chartUnit).records;

  return (
    <section
      className={pageClassName("transparency-page")}
      data-testid="transparency-page"
    >
      <RouteMetadata
        config={config}
        title={t("pages.transparency.title")}
        description={t("pages.transparency.description")}
        path="/transparency"
      />
      <p className="eyebrow">{t("transparency.eyebrow")}</p>
      <h1>{t("pages.transparency.title")}</h1>
      <p className="foundation-page__tagline">{t("pages.transparency.description")}</p>

      <div className="data-explainer">
        <p className="eyebrow">{t("transparency.explainerEyebrow")}</p>
        <h2>{t("transparency.explainerTitle")}</h2>
        <p>{t("transparency.explainerBody")}</p>
      </div>

      <DataGapNotice>{t("transparency.gaps.financial")}</DataGapNotice>

      <section className="data-section" aria-labelledby="transparency-chart-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t("transparency.chartEyebrow")}</p>
            <h2 id="transparency-chart-title">{t("transparency.chartTitle")}</h2>
          </div>
          <p>{t("transparency.chartUnit", { unit: chartUnit })}</p>
        </div>
        <TransparencyChart records={chartRecords} unit={chartUnit} />
        <TransparencyTable records={chartRecords} testId="transparency-chart-table" />
      </section>

      <section className="data-section" aria-labelledby="transparency-records-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t("transparency.recordsEyebrow")}</p>
            <h2 id="transparency-records-title">{t("transparency.recordsTitle")}</h2>
          </div>
          <p>{t("transparency.recordCount", { count: transparency.length })}</p>
        </div>
        <div className="data-group-list">
          {groups.map((group) => (
            <section className="data-group" key={`${group.kind}:${group.unit}`}>
              <h3>
                {t(`transparency.kinds.${group.kind}`)} · {group.unit}
              </h3>
              <TransparencyTable records={group.records} />
            </section>
          ))}
        </div>
      </section>
    </section>
  );
}

function StatisticsChart({
  records,
  unit,
}: {
  records: StatisticRecord[];
  unit: string;
}) {
  const { t } = useTranslation("common");
  const data = records.map((record) => ({ year: record.year, value: record.value }));

  return (
    <div
      className="data-chart"
      role="img"
      aria-label={t("statistics.chartLabel", { unit })}
    >
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 12, right: 12, bottom: 24, left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--better-border)" />
          <XAxis dataKey="year" />
          <YAxis tickFormatter={(value: number) => formatNumber(value)} />
          <Tooltip
            formatter={(value: unknown) => [
              formatNumber(typeof value === "number" ? value : 0),
              unit,
            ]}
          />
          <Bar
            dataKey="value"
            fill="var(--better-brand-primary)"
            name={t("statistics.value")}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StatisticsPage() {
  const { t } = useTranslation("common");
  const groups = useMemo(() => getStatisticMetricGroups(statistics), []);
  const [selectedKey, setSelectedKey] = useState(() =>
    groups[0] ? `${groups[0].metric}:${groups[0].unit}` : "",
  );
  const selectedGroup =
    groups.find((group) => `${group.metric}:${group.unit}` === selectedKey) ?? groups[0];
  const selectedRecords = selectedGroup?.records ?? [];
  const chartData = selectedGroup
    ? getStatisticsChartData(statistics, selectedGroup.metric, selectedGroup.unit)
    : [];

  return (
    <section className={pageClassName("statistics-page")} data-testid="statistics-page">
      <RouteMetadata
        config={config}
        title={t("pages.statistics.title")}
        description={t("pages.statistics.description")}
        path="/statistics"
      />
      <p className="eyebrow">{t("statistics.eyebrow")}</p>
      <h1>{t("pages.statistics.title")}</h1>
      <p className="foundation-page__tagline">{t("pages.statistics.description")}</p>

      <div className="data-explainer">
        <p className="eyebrow">{t("statistics.explainerEyebrow")}</p>
        <h2>{t("statistics.explainerTitle")}</h2>
        <p>{t("statistics.explainerBody")}</p>
      </div>

      <DataGapNotice>{t("statistics.gaps.barangayDemographics")}</DataGapNotice>
      <DataGapNotice>{t("statistics.gaps.cmci")}</DataGapNotice>

      {selectedGroup ? (
        <section className="data-section" aria-labelledby="statistics-chart-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t("statistics.chartEyebrow")}</p>
              <h2 id="statistics-chart-title">{t("statistics.chartTitle")}</h2>
            </div>
            <p>{t("statistics.chartUnit", { unit: selectedGroup.unit })}</p>
          </div>
          <div className="metric-picker">
            <label htmlFor="statistics-metric">{t("statistics.metricPicker")}</label>
            <select
              id="statistics-metric"
              value={selectedKey}
              onChange={(event) => setSelectedKey(event.target.value)}
            >
              {groups.map((group) => {
                const key = `${group.metric}:${group.unit}`;
                return (
                  <option key={key} value={key}>
                    {group.metric} · {group.unit}
                  </option>
                );
              })}
            </select>
          </div>
          <StatisticsChart records={selectedRecords} unit={selectedGroup.unit} />
          <StatisticsTable records={selectedRecords} />
          <p className="data-table__chart-note">
            {t("statistics.chartRows", { count: chartData.length })}
          </p>
        </section>
      ) : (
        <DataGapNotice>{t("statistics.empty")}</DataGapNotice>
      )}
    </section>
  );
}
