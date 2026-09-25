import { useId } from "react";
import { useTranslation } from "react-i18next";

import {
  getProvenanceViewModel,
  type ProvenanceLike,
  type ProvenanceViewModel,
} from "../../lib/ui/provenance";

const STATE_ICONS = {
  verified: "✓",
  unverified: "!",
  stale: "◷",
  unavailable: "?",
} as const;

export function ProvenanceStatusBadge({
  provenance,
  dataTestId,
}: {
  provenance: ProvenanceLike;
  dataTestId?: string;
}) {
  const { t } = useTranslation("common");
  const model = getProvenanceViewModel(provenance);

  /* A badge on every record tells the reader nothing. Records publish as
     sourced and verified, so the normal state is silent and the badge is
     reserved for the exceptions worth interrupting for: a record whose source
     has gone past the freshness threshold, or one we cannot point at. The
     source and date remain one click away in the details panel either way. */
  if (model.state === "verified") return null;

  const label = t(`provenance.status.${model.state}`);
  const description = t(`provenance.statusDescriptions.${model.state}`);

  return (
    <span
      className={`status-badge status-badge--${model.state}`}
      data-provenance-state={model.state}
      data-testid={dataTestId}
      aria-label={`${label}: ${description}`}
    >
      <span aria-hidden="true">{STATE_ICONS[model.state]}</span> {label}
    </span>
  );
}

function ProvenanceFields({ model }: { model: ProvenanceViewModel }) {
  const { t } = useTranslation("common");

  return (
    <dl className="provenance-details__fields">
      <div>
        <dt>{t("provenance.sourceName")}</dt>
        <dd>
          {model.sourceUrl ? (
            <a href={model.sourceUrl} target="_blank" rel="noreferrer">
              {model.sourceName ?? t("provenance.sourceUnavailable")}
            </a>
          ) : model.sourceCitation ? (
            // An official document the maintainers hold is a real source. Saying
            // "unavailable" here would understate the evidence behind the figure,
            // so render the citation a reader could act on instead.
            <span className="provenance-citation">{model.sourceCitation}</span>
          ) : (
            t("provenance.sourceUnavailable")
          )}
        </dd>
      </div>
      <div>
        <dt>{t("provenance.lastRetrieved")}</dt>
        <dd>{model.retrievedAt ?? t("provenance.missingValue")}</dd>
      </div>
      <div>
        <dt>{t("provenance.verificationNote")}</dt>
        <dd>{model.verificationNote ?? t("provenance.missingValue")}</dd>
      </div>
    </dl>
  );
}

/** The publisher, trimmed for a one-line citation. */
function shortSource(name: string | undefined, fallback: string): string {
  if (!name) return fallback;
  return name.length > 48 ? `${name.slice(0, 45).trimEnd()}…` : name;
}

/**
 * Where a record comes from, as one quiet line that opens to the full details.
 *
 * The source is context for a figure, not the figure: a card's most prominent
 * line should not be "Show source and verification". So the summary is the
 * citation itself, "Source: DILG · 2026-09-25", and everything else is inside.
 */
export function ProvenanceDetails({ provenance }: { provenance: ProvenanceLike }) {
  const { t } = useTranslation("common");
  const model = getProvenanceViewModel(provenance);

  return (
    <details className="provenance-details">
      <summary>
        {t("provenance.sourceSummary", {
          source: shortSource(model.sourceName, t("provenance.sourceUnavailable")),
          date: model.retrievedAt ?? t("provenance.missingValue"),
        })}
      </summary>
      <ProvenanceBlock provenance={provenance} />
    </details>
  );
}

/** The full source record, for a details panel or a table's detail row. */
export function ProvenanceBlock({ provenance }: { provenance: ProvenanceLike }) {
  const { t } = useTranslation("common");
  const model = getProvenanceViewModel(provenance);

  return (
    <div className="provenance-block">
      <ProvenanceStatusBadge provenance={provenance} />
      <ProvenanceFields model={model} />
      {model.sourceUrl ? (
        <a href={model.sourceUrl} target="_blank" rel="noreferrer">
          {t("provenance.verifyOfficialSource")}
        </a>
      ) : model.sourceCitation ? (
        <p className="provenance-citation">{t("provenance.requestDocument")}</p>
      ) : null}
    </div>
  );
}

/** Just the publisher, linked when there is a URL: the Source column of a table. */
export function SourceLink({ provenance }: { provenance: ProvenanceLike }) {
  const { t } = useTranslation("common");
  const model = getProvenanceViewModel(provenance);
  const label = shortSource(model.sourceName, t("provenance.sourceUnavailable"));

  return (
    <span className="source-link">
      <ProvenanceStatusBadge provenance={provenance} />
      {model.sourceUrl ? (
        <a href={model.sourceUrl} target="_blank" rel="noreferrer">
          {label}
        </a>
      ) : (
        label
      )}
    </span>
  );
}

export function ProvenancePanel({
  provenance,
  className = "provenance-panel",
}: {
  provenance: ProvenanceLike;
  className?: string;
}) {
  const { t } = useTranslation("common");
  const headingId = useId();
  const model = getProvenanceViewModel(provenance);

  return (
    <section className={className} aria-labelledby={headingId}>
      <h2 id={headingId}>{t("provenance.sourceInformation")}</h2>
      <ProvenanceStatusBadge provenance={provenance} />
      <ProvenanceFields model={model} />
      {model.sourceUrl ? (
        <p>
          <a href={model.sourceUrl} target="_blank" rel="noreferrer">
            {t("provenance.verifyOfficialSource")}
          </a>
        </p>
      ) : model.sourceCitation ? (
        <p className="provenance-citation">{t("provenance.requestDocument")}</p>
      ) : null}
    </section>
  );
}
