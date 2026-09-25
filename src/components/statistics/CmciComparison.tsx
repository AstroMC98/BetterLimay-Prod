import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  CMCI_SUBJECT,
  buildComparison,
  isSubject,
  listIndicators,
  orderForDrawing,
  type CmciComparison as Comparison,
  type CmciDataset,
} from "../../lib/ui/cmciComparison";

const DATASET_URL = "/data/cmci-bataan.json";
const DEFAULT_INDICATOR = "Overall Score";

/** Indicators worth offering first; the rest stay available in the selector. */
const HEADLINE_INDICATORS = [
  "Overall Score",
  "Economic Dynamism",
  "Government Efficiency",
  "Infrastructure",
  "Resiliency",
  "Innovation",
];

type LoadState =
  { status: "loading" } | { status: "error" } | { status: "ready"; dataset: CmciDataset };

function useCmciDataset(): LoadState {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    // The full grid is ~3,600 records. Fetching it keeps it out of the entry
    // chunk, which is bounded by a CI-enforced script budget.
    fetch(DATASET_URL)
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<CmciDataset>;
      })
      .then((dataset) => {
        if (!cancelled) setState({ status: "ready", dataset });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

/**
 * The headline: where Limay sits, in words, before any chart is read.
 *
 * A rank is a single current value, which the form guidance calls a stat tile
 * rather than a chart. It also gives the comparison an answer a reader can carry
 * away without interpreting eight lines.
 */
function RankFigure({ comparison }: { comparison: Comparison }) {
  const { t } = useTranslation("common");
  const rank = comparison.subjectRank;
  if (!rank) return null;

  return (
    <figure className="cmci-rank" data-testid="cmci-rank">
      <figcaption>
        {t("statistics.cmci.rankCaption", {
          subject: CMCI_SUBJECT,
          indicator: comparison.indicator,
          year: rank.year,
        })}
      </figcaption>
      <p className="cmci-rank__value">
        <strong>{rank.position}</strong>
        <span>{t("statistics.cmci.rankOutOf", { total: rank.outOf })}</span>
      </p>
      <dl className="cmci-rank__detail">
        <div>
          <dt>{t("statistics.cmci.subjectScore", { subject: CMCI_SUBJECT })}</dt>
          <dd>{rank.value.toFixed(2)}</dd>
        </div>
        <div>
          <dt>{t("statistics.cmci.bestScore")}</dt>
          <dd>{rank.best.toFixed(2)}</dd>
        </div>
        <div>
          <dt>{t("statistics.cmci.medianScore")}</dt>
          <dd>{rank.median.toFixed(2)}</dd>
        </div>
      </dl>
    </figure>
  );
}

function ComparisonTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number | null }[];
  label?: number;
}) {
  if (!active || !payload?.length) return null;

  // Values lead, names follow; the subject is listed first whatever the order.
  const rows = [...payload]
    .filter((entry) => entry.value !== null && entry.value !== undefined)
    .sort((left, right) => {
      if (isSubject(left.name) !== isSubject(right.name))
        return isSubject(left.name) ? -1 : 1;
      return (right.value ?? 0) - (left.value ?? 0);
    });

  return (
    <div className="cmci-tooltip">
      <p className="cmci-tooltip__year">{label}</p>
      <ul>
        {rows.map((entry) => (
          <li key={entry.name} data-subject={isSubject(entry.name) || undefined}>
            <span className="cmci-tooltip__value">{entry.value?.toFixed(2)}</span>
            <span className="cmci-tooltip__name">{entry.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CmciComparison() {
  const { t } = useTranslation("common");
  const state = useCmciDataset();
  const [indicator, setIndicator] = useState(DEFAULT_INDICATOR);

  const comparison = useMemo(
    () => (state.status === "ready" ? buildComparison(state.dataset, indicator) : null),
    [state, indicator],
  );

  if (state.status === "loading") {
    return <p className="data-chart__note">{t("statistics.cmci.loading")}</p>;
  }
  if (state.status === "error" || !comparison) {
    return <p className="data-chart__note">{t("statistics.cmci.unavailable")}</p>;
  }

  const indicators = listIndicators(state.dataset);
  const offered = [
    ...HEADLINE_INDICATORS.filter((name) => indicators.includes(name)),
    ...indicators.filter((name) => !HEADLINE_INDICATORS.includes(name)),
  ];

  return (
    <div className="cmci">
      <div className="cmci__controls">
        <label htmlFor="cmci-indicator">{t("statistics.cmci.indicatorLabel")}</label>
        <select
          id="cmci-indicator"
          value={indicator}
          onChange={(event) => setIndicator(event.target.value)}
        >
          {offered.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <RankFigure comparison={comparison} />

      <div
        className="data-chart cmci__chart"
        role="img"
        aria-label={t("statistics.cmci.chartLabel", {
          subject: CMCI_SUBJECT,
          indicator: comparison.indicator,
        })}
      >
        <ResponsiveContainer width="100%" height={340}>
          <LineChart
            data={comparison.points}
            margin={{ top: 12, right: 24, bottom: 8, left: 0 }}
          >
            <CartesianGrid stroke="var(--better-border)" vertical={false} />
            <XAxis
              dataKey="year"
              tickLine={false}
              axisLine={{ stroke: "var(--better-border)" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={52}
              /* Fitted, not zero-anchored: these are index scores that never go
                 near zero, and anchoring there flattens the comparison. */
              domain={comparison.domain}
              allowDecimals={false}
              label={{ value: comparison.unit, angle: -90, position: "insideLeft" }}
            />
            <Tooltip
              content={<ComparisonTooltip />}
              cursor={{ stroke: "var(--better-border)", strokeWidth: 1 }}
            />
            {orderForDrawing(comparison.geographies).map((geography) => {
              const subject = isSubject(geography);
              return (
                <Line
                  key={geography}
                  type="monotone"
                  dataKey={geography}
                  name={geography}
                  /* A gap is a year not surveyed. Joining across it would draw a
                     trend through data that does not exist. */
                  connectNulls={false}
                  stroke={subject ? "var(--bl-chart-accent)" : "var(--bl-chart-context)"}
                  strokeWidth={subject ? 2.5 : 1.5}
                  strokeOpacity={subject ? 1 : 0.55}
                  dot={
                    subject
                      ? { r: 4, strokeWidth: 2, stroke: "var(--bl-surface)" }
                      : false
                  }
                  activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--bl-surface)" }}
                  isAnimationActive={false}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Identity is never colour alone: the accent is named here, and the table
          below carries every value the chart shows. */}
      <p className="cmci__legend">
        <span className="cmci__swatch" data-subject />
        {t("statistics.cmci.legendSubject", { subject: CMCI_SUBJECT })}
        <span className="cmci__swatch" />
        {t("statistics.cmci.legendContext")}
      </p>

      <details className="cmci__table">
        <summary>{t("statistics.cmci.tableToggle")}</summary>
        <table>
          <caption>
            {t("statistics.cmci.tableCaption", { indicator: comparison.indicator })}
          </caption>
          <thead>
            <tr>
              <th scope="col">{t("statistics.cmci.year")}</th>
              {comparison.geographies.map((geography) => (
                <th key={geography} scope="col">
                  {geography}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparison.points.map((point) => (
              <tr key={point.year}>
                <th scope="row">{point.year}</th>
                {comparison.geographies.map((geography) => {
                  const value = point[geography];
                  return (
                    <td key={geography} data-subject={isSubject(geography) || undefined}>
                      {typeof value === "number"
                        ? value.toFixed(2)
                        : t("statistics.cmci.notSurveyed")}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </details>

      <p className="data-chart__note">{state.dataset.howToRead}</p>
    </div>
  );
}
