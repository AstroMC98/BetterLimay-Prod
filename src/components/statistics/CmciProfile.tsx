import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  latestPair,
  ordinal,
  placesGained,
  rankSeries,
  surveyedYears,
  type CmciProfile as Profile,
  type SurveyedYear,
} from "../../lib/ui/cmciProfile";
import {
  ACCENT_ACTIVE_DOT,
  ACCENT_DOT,
  AXIS_TICK,
  CATEGORY_TICK,
  GRID,
  VALUE_LABEL,
  X_AXIS_LINE,
} from "../../lib/ui/chartTheme";

const DATASET_URL = "/data/cmci-limay-profile.json";
const PROFILE_URL = "https://cmci.dti.gov.ph/lgu-profile.php?lgu=Limay";

type LoadState =
  { status: "loading" } | { status: "error" } | { status: "ready"; profile: Profile };

function useProfile(): LoadState {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  useEffect(() => {
    let cancelled = false;
    fetch(DATASET_URL)
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<Profile>;
      })
      .then((profile) => !cancelled && setState({ status: "ready", profile }))
      .catch(() => !cancelled && setState({ status: "error" }));
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}

/** "▲ 88 places" / "▼ 97 places" / nothing; the arrow is decorative, the words carry it. */
function RankChange({ gained, since }: { gained: number | null; since?: number }) {
  const { t } = useTranslation("common");
  if (gained === null || since === undefined) return null;
  if (gained === 0) {
    return (
      <span className="cmci-change">
        {t("statistics.cmciProfile.same", { year: since })}
      </span>
    );
  }
  const up = gained > 0;
  return (
    <span className={`cmci-change cmci-change--${up ? "up" : "down"}`}>
      <span aria-hidden="true">{up ? "▲" : "▼"} </span>
      {t(up ? "statistics.cmciProfile.up" : "statistics.cmciProfile.down", {
        count: Math.abs(gained),
        year: since,
      })}
    </span>
  );
}

function Headline({
  latest,
  previous,
}: {
  latest: SurveyedYear;
  previous?: SurveyedYear;
}) {
  const { t, i18n } = useTranslation("common");
  return (
    <div className="cmci-profile__headline" data-testid="cmci-profile-headline">
      <p className="cmci-profile__rank">
        {latest.overallRank !== null ? (
          <strong>{ordinal(latest.overallRank, i18n.language)}</strong>
        ) : null}
        <span>{t("statistics.cmciProfile.nationally", { year: latest.year })}</span>
      </p>
      <RankChange
        gained={placesGained(previous?.overallRank, latest.overallRank)}
        since={previous?.year}
      />
      <p className="cmci-profile__score">
        {t("statistics.cmciProfile.overallScore", {
          score: latest.overallScore.toFixed(2),
        })}
      </p>
    </div>
  );
}

function PillarTiles({
  latest,
  previous,
}: {
  latest: SurveyedYear;
  previous?: SurveyedYear;
}) {
  const { t, i18n } = useTranslation("common");
  return (
    <ul className="cmci-pillars" aria-label={t("statistics.cmciProfile.pillarsLabel")}>
      {latest.pillars.map((pillar) => {
        const before = previous?.pillars.find((p) => p.pillar === pillar.pillar);
        return (
          <li key={pillar.pillar} className="cmci-pillar">
            <span className="cmci-pillar__name">{pillar.pillar}</span>
            {pillar.rank !== null ? (
              <strong className="cmci-pillar__rank">
                {ordinal(pillar.rank, i18n.language)}
              </strong>
            ) : null}
            <span className="cmci-pillar__score">
              {t("statistics.cmciProfile.score", { score: pillar.score.toFixed(2) })}
            </span>
            <RankChange
              gained={placesGained(before?.rank, pillar.rank)}
              since={before ? previous?.year : undefined}
            />
          </li>
        );
      })}
    </ul>
  );
}

function RankOverTime({ profile }: { profile: Profile }) {
  const { t } = useTranslation("common");
  const series = rankSeries(profile);
  const ranks = series
    .map((point) => point.rank)
    .filter((rank): rank is number => rank !== null);
  const worst = Math.max(...ranks);
  const top = Math.ceil(worst / 100) * 100;
  const ticks = [
    1,
    ...Array.from({ length: top / 100 }, (_, index) => (index + 1) * 100),
  ];

  return (
    <figure className="cmci-profile__figure">
      <figcaption>
        <strong>{t("statistics.cmciProfile.rankTitle")}</strong>
        <span>{t("statistics.cmciProfile.rankAxis")}</span>
      </figcaption>
      <div
        className="data-chart cmci-profile__chart"
        role="img"
        aria-label={t("statistics.cmciProfile.rankChartLabel", {
          points: series
            .map((p) => `${p.year}: ${p.rank ?? t("statistics.cmci.notSurveyed")}`)
            .join(", "),
        })}
      >
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={series} margin={{ top: 20, right: 28, bottom: 8, left: 12 }}>
            <CartesianGrid {...GRID} />
            <XAxis
              dataKey="year"
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={X_AXIS_LINE}
            />
            {/* Reversed: rank 1 is best, so better sits higher, as a reader expects. */}
            <YAxis
              reversed
              tick={AXIS_TICK}
              domain={[1, top]}
              ticks={ticks}
              tickLine={false}
              axisLine={false}
              width={44}
              allowDecimals={false}
            />
            <Tooltip
              formatter={(value) => [
                String(value),
                t("statistics.cmciProfile.rankTooltip"),
              ]}
            />
            <Line
              /* Straight segments: a smoothed curve overshoots between years and
                 draws ranks Limay never held. */
              type="linear"
              dataKey="rank"
              connectNulls={false}
              stroke="var(--bl-chart-accent)"
              strokeWidth={2.5}
              dot={ACCENT_DOT}
              activeDot={ACCENT_ACTIVE_DOT}
              isAnimationActive={false}
            >
              <LabelList dataKey="rank" position="top" offset={10} style={VALUE_LABEL} />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="data-chart__note">{t("statistics.cmciProfile.rankCaveat")}</p>
    </figure>
  );
}

function PillarDetail({ years }: { years: SurveyedYear[] }) {
  const { t } = useTranslation("common");
  const [year, setYear] = useState(years.at(-1)?.year ?? 0);
  const selectedYear = years.find((entry) => entry.year === year) ?? years.at(-1);
  const [pillarName, setPillarName] = useState(selectedYear?.pillars[0]?.pillar ?? "");
  const pillar =
    selectedYear?.pillars.find((p) => p.pillar === pillarName) ??
    selectedYear?.pillars[0];

  const rows = useMemo(
    () => [...(pillar?.indicators ?? [])].sort((a, b) => b.score - a.score),
    [pillar],
  );
  if (!selectedYear || !pillar) return null;

  return (
    <figure className="cmci-profile__figure">
      <figcaption>
        <strong>{t("statistics.cmciProfile.detailTitle")}</strong>
      </figcaption>
      <div className="cmci__controls">
        <label htmlFor="cmci-profile-pillar">
          {t("statistics.cmciProfile.pillarLabel")}
        </label>
        <select
          id="cmci-profile-pillar"
          value={pillar.pillar}
          onChange={(event) => setPillarName(event.target.value)}
        >
          {selectedYear.pillars.map((p) => (
            <option key={p.pillar} value={p.pillar}>
              {p.pillar}
            </option>
          ))}
        </select>
        <label htmlFor="cmci-profile-year">{t("statistics.cmciProfile.yearLabel")}</label>
        <select
          id="cmci-profile-year"
          value={selectedYear.year}
          onChange={(event) => setYear(Number(event.target.value))}
        >
          {[...years].reverse().map((entry) => (
            <option key={entry.year} value={entry.year}>
              {entry.year}
            </option>
          ))}
        </select>
      </div>
      <div
        className="data-chart cmci-profile__chart"
        role="img"
        aria-label={t("statistics.cmciProfile.detailChartLabel", {
          pillar: pillar.pillar,
          year: selectedYear.year,
        })}
      >
        <ResponsiveContainer width="100%" height={rows.length * 30 + 16}>
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 4, right: 88, bottom: 4, left: 8 }}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="indicator"
              width={230}
              tickLine={false}
              axisLine={false}
              tick={CATEGORY_TICK}
            />
            <Bar
              dataKey="score"
              fill="var(--bl-chart-accent)"
              radius={[0, 3, 3, 0]}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="score"
                position="right"
                formatter={(value: unknown) => Number(value).toFixed(4)}
                style={VALUE_LABEL}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="election-contest__table">
        <summary>{t("statistics.cmciProfile.detailTable")}</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">{t("statistics.cmciProfile.indicator")}</th>
              <th scope="col">{t("statistics.cmciProfile.rankColumn")}</th>
              <th scope="col">{t("statistics.cmciProfile.scoreColumn")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.indicator}>
                <th scope="row">{row.indicator}</th>
                <td>{row.rank ?? "–"}</td>
                <td>{row.score.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

/**
 * Limay nationally: the headline rank, the five pillars, rank over time, and
 * any pillar's sub-indicators. Sits above the Bataan comparison, which answers
 * the neighbouring question — how Limay compares with the towns around it.
 */
export function CmciProfile() {
  const { t } = useTranslation("common");
  const state = useProfile();

  if (state.status === "loading") {
    return <p className="data-chart__note">{t("statistics.cmciProfile.loading")}</p>;
  }
  if (state.status === "error") {
    return <p className="data-chart__note">{t("statistics.cmciProfile.unavailable")}</p>;
  }

  const { latest, previous } = latestPair(state.profile);
  if (!latest) return null;

  return (
    <div className="cmci-profile" data-testid="cmci-profile">
      <p className="cmci-profile__category">
        {state.profile.category} · {t("statistics.cmciProfile.region")}
      </p>
      <Headline latest={latest} previous={previous} />
      <PillarTiles latest={latest} previous={previous} />
      <RankOverTime profile={state.profile} />
      <PillarDetail years={surveyedYears(state.profile)} />
      <p className="data-chart__note">
        <a href={PROFILE_URL} target="_blank" rel="noreferrer">
          {t("statistics.cmciProfile.source")}
        </a>
      </p>
    </div>
  );
}
