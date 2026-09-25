import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
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
import { CmciComparison } from "../components/statistics/CmciComparison";
import { CmciProfile } from "../components/statistics/CmciProfile";

// Leaflet and the hazard layer load only when the Statistics page is opened.
const FloodHazardMap = lazy(() => import("../components/statistics/FloodHazardMap"));
import statisticsJson from "../data/statistics.json";
import transparencyJson from "../data/transparency.json";
import type { StatisticRecord, TransparencyRecord } from "../data/types";
import { RouteMetadata } from "../lib/ui/RouteMetadata";
import {
  getTransparencyChartSeries,
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

/* Axis ticks only. Full grouping ("10,000,000") overran the default 60px Y axis and
   the leading digits were cropped, so ticks use compact notation instead. */
function formatAxisTick(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/* Record titles run long; the full value stays in the tooltip and in the table
   below every chart.

   Takes exactly one argument on purpose. Recharts calls a tickFormatter as
   (value, index), so a second parameter with a default - `max = 22` - was being
   overwritten by the tick index: tick 1 got max=1 and rendered "…", tick 2 got
   max=2 and rendered "R…". */
const TICK_MAX_CHARS = 34;

function truncateTick(value: string): string {
  return value.length > TICK_MAX_CHARS ? `${value.slice(0, TICK_MAX_CHARS - 1)}…` : value;
}

const AXIS_TICK = { fill: "var(--better-text-muted)", fontSize: 12 };
/* Without a cap a single-datapoint series renders as one bar filling the plot area. */
const MAX_BAR_WIDTH = 24;

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
      <table className="data-table data-table--fixed">
        {/* Explicit widths so the several tables stacked on one page share a
            column grid instead of each auto-sizing to its own content. */}
        <colgroup>
          <col style={{ width: "26%" }} />
          <col style={{ width: "7%" }} />
          <col style={{ width: "13%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "18%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "14%" }} />
        </colgroup>
        <caption>{t("transparency.tableCaption")}</caption>
        <thead>
          <tr>
            <th scope="col">{t("transparency.fields.record")}</th>
            <th scope="col" className="data-table__num">
              {t("transparency.fields.year")}
            </th>
            <th scope="col" className="data-table__num">
              {t("transparency.fields.amount")}
            </th>
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
              <td className="data-table__num">{record.year}</td>
              <td className="data-table__num">
                {formatAmount(record.amount, record.unit, t("transparency.notAvailable"))}
              </td>
              <td>
                <span className="data-chip">{record.status}</span>
              </td>
              <td>{record.sourceAgency}</td>
              <td>
                {record.location ??
                  t(
                    record.kind === "financial-statement"
                      ? "transparency.notApplicable"
                      : "transparency.notAvailable",
                  )}
              </td>
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
  /* Records arrive already grouped by kind and filtered to plottable amounts.
     A missing amount is not zero: plotting `amount ?? 0` would draw a real bar at
     the baseline, making "we don't know" look identical to "nothing was spent". */
  const chartData = records
    .filter((record) => record.amount !== null)
    .map((record) => ({
      label: record.title,
      value: record.amount as number,
      year: record.year,
    }));
  const omittedCount = records.length - chartData.length;

  /* One value is a stat tile, not a chart; the table below carries it either way. */
  if (chartData.length < 2) return null;

  return (
    <>
      <div
        className="data-chart"
        role="img"
        aria-label={t("transparency.chartLabel", { unit })}
      >
        <ResponsiveContainer
          width="100%"
          height={Math.max(200, chartData.length * 56 + 64)}
        >
          {/* Horizontal bars: category labels sit flat on the left, so they need no
              rotation and never truncate into "..." the way rotated ticks did. */}
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 8, right: 24, bottom: 8, left: 8 }}
          >
            <CartesianGrid
              horizontal={false}
              stroke="var(--better-border)"
              strokeDasharray="0"
            />
            <XAxis
              type="number"
              tick={AXIS_TICK}
              tickFormatter={formatAxisTick}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={220}
              tick={AXIS_TICK}
              tickFormatter={truncateTick}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "var(--better-surface-tint)" }}
              formatter={(value: unknown) => [
                formatAmount(typeof value === "number" ? value : null, unit, "—"),
                t("transparency.amount"),
              ]}
            />
            <Bar
              dataKey="value"
              fill="var(--better-brand-primary)"
              maxBarSize={MAX_BAR_WIDTH}
              radius={[0, 4, 4, 0]}
              name={t("transparency.amount")}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {omittedCount > 0 ? (
        <p className="data-table__chart-note">
          {t("transparency.chartOmitted", { count: omittedCount })}
        </p>
      ) : null}
    </>
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
            <th scope="col" className="data-table__num">
              {t("statistics.fields.year")}
            </th>
            <th scope="col" className="data-table__num">
              {t("statistics.fields.value")}
            </th>
            <th scope="col">{t("statistics.fields.geography")}</th>
            <th scope="col">{t("statistics.fields.source")}</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id}>
              <th scope="row" className="data-table__num">
                {record.year}
              </th>
              <td className="data-table__num">
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
  /* One chart per kind. A balance-sheet total and a road appropriation are both
     in pesos but are not the same quantity; sharing an axis would flatten the
     smaller one and invite a comparison that was never valid. */
  const chartSeries = getTransparencyChartSeries(transparency);

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

      {chartSeries.map((series) => (
        <section
          key={series.kind}
          className="data-section"
          aria-labelledby={`transparency-chart-${series.kind}`}
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t("transparency.chartEyebrow")}</p>
              <h2 id={`transparency-chart-${series.kind}`}>
                {t(`transparency.kinds.${series.kind}`)}
              </h2>
            </div>
            <p>{t("transparency.chartUnit", { unit: series.unit })}</p>
          </div>
          <TransparencyChart records={series.records} unit={series.unit} />
          <TransparencyTable
            records={series.records}
            testId={`transparency-chart-table-${series.kind}`}
          />
        </section>
      ))}

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
        <BarChart data={data} margin={{ top: 12, right: 16, bottom: 24, left: 8 }}>
          <CartesianGrid
            strokeDasharray="0"
            stroke="var(--better-border)"
            vertical={false}
          />
          <XAxis dataKey="year" tick={AXIS_TICK} />
          <YAxis width={68} tick={AXIS_TICK} tickFormatter={formatAxisTick} />
          <Tooltip
            formatter={(value: unknown) => [
              formatNumber(typeof value === "number" ? value : 0),
              unit,
            ]}
          />
          <Bar
            dataKey="value"
            fill="var(--better-brand-primary)"
            maxBarSize={MAX_BAR_WIDTH}
            radius={[4, 4, 0, 0]}
            name={t("statistics.value")}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* A single value is a stat tile, not a one-bar bar chart. Every metric in this
   dataset currently has exactly one reading, so the whole page was rendering a
   lone bar against an axis scaled to that same bar. */
function StatTile({ record }: { record: StatisticRecord }) {
  const { t } = useTranslation("common");

  return (
    <li className="border-border-default bg-surface-raised rounded-card shadow-low flex flex-col gap-2 border p-5">
      <p className="text-ink-muted text-caption m-0">{record.metric}</p>
      {/* Proportional figures, not tabular: tabular-nums makes a large standalone
          number look loose. Tabular is for columns that align vertically. */}
      <p className="text-brand-deep font-display m-0 text-4xl leading-none font-extrabold">
        {formatNumber(record.value)}
      </p>
      <p className="text-ink-subtle text-caption m-0">{record.unit}</p>
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
        <span className="text-ink-subtle text-caption">
          {t("statistics.fields.year")} {record.year}
        </span>
        <ProvenanceStatusBadge provenance={record.provenance} />
      </div>
    </li>
  );
}

export function StatisticsPage() {
  const { hash } = useLocation();
  // React Router does not scroll to #fragments; the home page links to #hazards.
  useEffect(() => {
    if (!hash) return;
    document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);
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
  /* Only a metric with a real series is worth plotting. */
  const chartableGroups = groups.filter((group) => group.records.length > 1);
  const headlineRecords = groups
    .map((group) => [...group.records].sort((a, b) => b.year - a.year)[0])
    .filter((record): record is StatisticRecord => Boolean(record));

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

      <section className="data-section" id="hazards" aria-labelledby="hazards-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t("hazards.eyebrow")}</p>
            <h2 id="hazards-title">{t("hazards.title")}</h2>
          </div>
        </div>
        <p>{t("hazards.intro")}</p>
        <Suspense fallback={<p className="data-chart__note">{t("hazards.loading")}</p>}>
          <FloodHazardMap />
        </Suspense>
        <p className="data-chart__note">{t("hazards.disclaimer")}</p>
        <p className="data-chart__note">
          {t("hazards.coverage")}{" "}
          <a
            href="https://noah.up.edu.ph/know-your-hazards"
            target="_blank"
            rel="noreferrer"
          >
            {t("hazards.noahLink")}
          </a>
        </p>
      </section>

      <section className="data-section" aria-labelledby="cmci-profile-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t("statistics.cmciProfile.eyebrow")}</p>
            <h2 id="cmci-profile-title">{t("statistics.cmciProfile.title")}</h2>
          </div>
        </div>
        <CmciProfile />
      </section>

      <section className="data-section" aria-labelledby="cmci-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t("statistics.cmci.indicatorLabel")}</p>
            <h2 id="cmci-title">
              {t("statistics.cmci.legendSubject", { subject: "Limay" })} vs Bataan
            </h2>
          </div>
        </div>
        <CmciComparison />
      </section>

      {headlineRecords.length > 0 ? (
        <section className="data-section" aria-labelledby="statistics-headline-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t("statistics.headlineEyebrow")}</p>
              <h2 id="statistics-headline-title">{t("statistics.headlineTitle")}</h2>
            </div>
          </div>
          <ul className="m-0 mt-6 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {headlineRecords.map((record) => (
              <StatTile key={record.id} record={record} />
            ))}
          </ul>
        </section>
      ) : null}

      {chartableGroups.length > 0 && selectedGroup ? (
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
              {chartableGroups.map((group) => {
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
          <p className="data-table__chart-note">
            {t("statistics.chartRows", { count: chartData.length })}
          </p>
        </section>
      ) : null}

      {statistics.length > 0 ? (
        <section className="data-section" aria-labelledby="statistics-records-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t("statistics.recordsEyebrow")}</p>
              <h2 id="statistics-records-title">{t("statistics.recordsTitle")}</h2>
            </div>
          </div>
          <StatisticsTable records={statistics} />
        </section>
      ) : (
        <DataGapNotice>{t("statistics.empty")}</DataGapNotice>
      )}
    </section>
  );
}
