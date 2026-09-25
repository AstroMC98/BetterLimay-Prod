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

export function ProvenanceDetails({ provenance }: { provenance: ProvenanceLike }) {
  const { t } = useTranslation("common");
  const model = getProvenanceViewModel(provenance);

  return (
    <details className="provenance-details">
      <summary>{t("provenance.showSource")}</summary>
      <ProvenanceStatusBadge provenance={provenance} />
      <ProvenanceFields model={model} />
      {model.sourceUrl ? (
        <a href={model.sourceUrl} target="_blank" rel="noreferrer">
          {t("provenance.verifyOfficialSource")}
        </a>
      ) : model.sourceCitation ? (
        <p className="provenance-citation">{t("provenance.requestDocument")}</p>
      ) : null}
    </details>
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
