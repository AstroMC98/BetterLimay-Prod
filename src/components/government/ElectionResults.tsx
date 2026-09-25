import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import electionsJson from "../../data/elections.json";
import type { ElectionContestRecord } from "../../data/types";
import { CATEGORY_TICK, VALUE_LABEL } from "../../lib/ui/chartTheme";
import { ProvenanceDetails } from "../provenance/Provenance";

const contests = electionsJson as ElectionContestRecord[];

/** Pixels per candidate row: enough for a two-word name at the tick size. */
const ROW_HEIGHT = 34;

function formatVotes(value: number): string {
  return value.toLocaleString("en-PH");
}

/**
 * One contest as a ranked bar chart.
 *
 * Emphasis, not categories: winners take the accent colour and everyone else a
 * recessive grey, so the question the chart answers — who won, and by how much —
 * reads before any label does. Party colours would be the obvious encoding and
 * the wrong one here; they invite reading the chart as a party scoreboard.
 */
function ContestChart({ contest }: { contest: ElectionContestRecord }) {
  const { t } = useTranslation("common");
  const rows = [...contest.candidates].sort((a, b) => a.rank - b.rank);
  const winners = rows.filter((row) => row.won).map((row) => row.displayName);

  return (
    <section
      className="election-contest"
      aria-labelledby={`${contest.id}-title`}
      data-testid={`election-${contest.id}`}
    >
      <h3 id={`${contest.id}-title`}>
        {contest.contest}
        <span className="election-contest__seats">
          {t("elections.seats", { count: contest.seats })}
        </span>
      </h3>
      <div
        className="data-chart"
        role="img"
        aria-label={t("elections.chartLabel", {
          contest: contest.contest,
          winners: winners.join(", "),
        })}
      >
        <ResponsiveContainer width="100%" height={rows.length * ROW_HEIGHT + 16}>
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 4, right: 72, bottom: 4, left: 8 }}
          >
            <XAxis type="number" hide domain={[0, "dataMax"]} />
            <YAxis
              type="category"
              dataKey="displayName"
              width={170}
              tickLine={false}
              axisLine={false}
              tick={CATEGORY_TICK}
            />
            <Bar dataKey="votes" radius={[0, 3, 3, 0]} isAnimationActive={false}>
              {rows.map((row) => (
                <Cell
                  key={row.ballotName}
                  fill={row.won ? "var(--bl-chart-accent)" : "var(--bl-chart-context)"}
                  fillOpacity={row.won ? 1 : 0.55}
                />
              ))}
              <LabelList
                dataKey="votes"
                position="right"
                formatter={(value: unknown) => formatVotes(Number(value))}
                style={VALUE_LABEL}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="election-contest__table">
        <summary>{t("elections.showTable")}</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">{t("elections.rank")}</th>
              <th scope="col">{t("elections.candidate")}</th>
              <th scope="col">{t("elections.party")}</th>
              <th scope="col">{t("elections.votes")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.ballotName} data-won={row.won || undefined}>
                <td>{row.rank}</td>
                <th scope="row">
                  {row.displayName}
                  {row.won ? (
                    <span className="election-contest__won">
                      {t("elections.elected")}
                    </span>
                  ) : null}
                </th>
                <td>{row.party}</td>
                <td>{formatVotes(row.votes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}

export function ElectionResults() {
  const { t } = useTranslation("common");
  if (contests.length === 0) return null;
  const first = contests[0];
  const asOf = new Date(first.asOf).toLocaleString("en-PH", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  });

  return (
    <section className="election-results" aria-labelledby="election-results-title">
      <h2 id="election-results-title">{t("elections.title")}</h2>
      <p className="election-results__caption">
        {t("elections.caption", { asOf, returns: first.electionReturns ?? "" })}
      </p>
      {contests.map((contest) => (
        <ContestChart key={contest.id} contest={contest} />
      ))}
      <ProvenanceDetails provenance={first.provenance} />
    </section>
  );
}
