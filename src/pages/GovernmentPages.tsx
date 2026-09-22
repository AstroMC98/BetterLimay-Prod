import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useParams } from "react-router-dom";

import { loadLguConfig } from "../app/lguConfig";
import barangaysJson from "../data/barangays.json";
import type {
  BarangayRecord,
  OfficeRecord,
  OfficialBranch,
  OfficialRecord,
} from "../data/types";
import officesJson from "../data/offices.json";
import officialsJson from "../data/officials.json";
import {
  ProvenanceDetails,
  ProvenanceStatusBadge,
} from "../components/provenance/Provenance";
import { getVerifiedBarangayMapPoints } from "../lib/ui/governmentCatalog";
import { RouteMetadata } from "../lib/ui/RouteMetadata";
import { NotFoundPage } from "./PortalStatusPages";

const config = loadLguConfig();
const offices = officesJson as OfficeRecord[];
const officials = officialsJson as OfficialRecord[];
const barangays = barangaysJson as BarangayRecord[];

const BRANCHES = [
  "executive",
  "legislative",
  "ex-officio",
  "departments",
  "barangays",
] as const;

type GovernmentBranch = (typeof BRANCHES)[number];

const BRANCH_PATHS: Record<GovernmentBranch, string> = {
  executive: "/executive",
  legislative: "/government/legislative",
  "ex-officio": "/government/ex-officio",
  departments: "/departments",
  barangays: "/barangays",
};

const VerifiedBarangayMap = lazy(
  () => import("../components/government/VerifiedBarangayMap"),
);

function isGovernmentBranch(value: string | undefined): value is GovernmentBranch {
  return BRANCHES.includes(value as GovernmentBranch);
}

function GovernmentRecordNotice() {
  const { t } = useTranslation("common");

  return (
    <div className="foundation-page__notice">
      <span className="status-dot" aria-hidden="true" />
      <p>{t("pages.government.recordNotice")}</p>
    </div>
  );
}

function OfficialCards({ records }: { records: OfficialRecord[] }) {
  const { t } = useTranslation("common");

  return (
    <div className="government-record-grid">
      {records.map((official) => (
        <article className="government-record-card" key={official.id}>
          <div className="government-record-card__header">
            <div>
              <p className="government-record-card__label">{official.role}</p>
              <h2>{official.name}</h2>
            </div>
            <ProvenanceStatusBadge provenance={official.provenance} />
          </div>
          {official.term ? (
            <p className="government-record-card__meta">
              {t("pages.government.term")}: {official.term}
            </p>
          ) : null}
          <ProvenanceDetails provenance={official.provenance} />
        </article>
      ))}
    </div>
  );
}

function OfficeCards({ records }: { records: OfficeRecord[] }) {
  const { t } = useTranslation("common");

  return (
    <div className="government-record-grid">
      {records.map((office) => (
        <article className="government-record-card" key={office.id}>
          <div className="government-record-card__header">
            <div>
              <p className="government-record-card__label">{office.officeType}</p>
              <h2>{office.name}</h2>
            </div>
            <ProvenanceStatusBadge provenance={office.provenance} />
          </div>
          <dl className="government-record-card__details">
            <div>
              <dt>{t("pages.government.officeHead")}</dt>
              <dd>{office.head ?? t("pages.government.notAvailable")}</dd>
            </div>
            <div>
              <dt>{t("pages.government.contact")}</dt>
              <dd>
                {office.contact?.phone ??
                  office.contact?.email ??
                  t("pages.government.notAvailable")}
              </dd>
            </div>
            <div>
              <dt>{t("pages.government.location")}</dt>
              <dd>
                {office.location?.address ?? t("pages.government.locationNotVerified")}
              </dd>
            </div>
          </dl>
          <ProvenanceDetails provenance={office.provenance} />
        </article>
      ))}
    </div>
  );
}

function BarangayList({ records }: { records: BarangayRecord[] }) {
  const { t } = useTranslation("common");

  if (records.length === 0) {
    return (
      <div className="government-map__fallback">
        <p>{t("pages.government.noBarangays")}</p>
        <p>
          {t("pages.government.expectedBarangays", { count: config.lgu.barangayCount })}
        </p>
      </div>
    );
  }

  return (
    <ol
      className="government-barangay-list"
      aria-label={t("pages.government.listAlternative")}
    >
      {records.map((barangay) => (
        <li className="government-record-card" key={barangay.id}>
          <div className="government-record-card__header">
            <div>
              <h2>{barangay.name}</h2>
              <p className="government-record-card__meta">
                {t("pages.government.punongBarangay")}:{" "}
                {barangay.punongBarangay ?? t("pages.government.notAvailable")}
              </p>
            </div>
            <ProvenanceStatusBadge provenance={barangay.provenance} />
          </div>
          <p className="government-record-card__meta">
            {barangay.coordinates
              ? barangay.provenance.verified
                ? t("pages.government.locationAvailable")
                : t("pages.government.locationNotVerified")
              : t("pages.government.locationMissing")}
          </p>
          <ProvenanceDetails provenance={barangay.provenance} />
        </li>
      ))}
    </ol>
  );
}

function BarangayDirectory() {
  const { t } = useTranslation("common");
  const mapPoints = getVerifiedBarangayMapPoints(barangays);

  return (
    <div className="government-barangays">
      <section className="government-map-panel" aria-labelledby="barangay-map-title">
        <div>
          <p className="government-record-card__label">
            {t("pages.government.mapEyebrow")}
          </p>
          <h2 id="barangay-map-title">{t("pages.government.mapTitle")}</h2>
        </div>
        {mapPoints.length > 0 ? (
          <Suspense
            fallback={
              <p className="government-map__fallback">
                {t("pages.government.mapLoading")}
              </p>
            }
          >
            <VerifiedBarangayMap points={mapPoints} />
          </Suspense>
        ) : (
          <div className="government-map__fallback">
            <p>{t("pages.government.mapUnavailable")}</p>
            <p>{t("pages.government.listAlternative")}</p>
          </div>
        )}
      </section>
      <section aria-labelledby="barangay-list-title">
        <div className="government-section-heading">
          <p className="government-record-card__label">
            {t("pages.government.listEyebrow")}
          </p>
          <h2 id="barangay-list-title">{t("pages.government.listAlternative")}</h2>
        </div>
        <BarangayList records={barangays} />
      </section>
    </div>
  );
}

export function GovernmentPage() {
  const { t } = useTranslation("common");
  const location = useLocation();
  const title = t("pages.government.title");
  const description = t("pages.government.description");

  return (
    <section className="foundation-page" data-testid="government-page">
      <RouteMetadata
        config={config}
        title={title}
        description={description}
        path={location.pathname}
      />
      <p className="eyebrow">{t("pages.independentEyebrow")}</p>
      <h1>{title}</h1>
      <p className="foundation-page__tagline">{description}</p>
      <nav className="route-list" aria-label={title}>
        {BRANCHES.map((knownBranch) => (
          <Link className="route-card" key={knownBranch} to={BRANCH_PATHS[knownBranch]}>
            {t(`pages.government.branches.${knownBranch}`)}
          </Link>
        ))}
        <Link className="route-card" to="/elected-officials">
          {t("pages.government.electedOfficialsTitle")}
        </Link>
      </nav>
      <GovernmentRecordNotice />
    </section>
  );
}

export function GovernmentBranchPage({ branch }: { branch: GovernmentBranch }) {
  const { t } = useTranslation("common");
  const location = useLocation();
  const title = t(`pages.government.branches.${branch}`);
  const description = t("pages.government.branchDescription", { branch: title });
  const branchRecords = officials.filter(
    (official) => official.branch === (branch as OfficialBranch),
  );

  return (
    <section
      className="foundation-page foundation-page--wide"
      data-testid="government-branch-page"
    >
      <RouteMetadata
        config={config}
        title={title}
        description={description}
        path={location.pathname}
      />
      <p className="eyebrow">{t("pages.government.eyebrow")}</p>
      <h1>{title}</h1>
      <p className="foundation-page__tagline">{description}</p>
      {branch === "barangays" ? (
        <BarangayDirectory />
      ) : branch === "departments" ? (
        <>
          <OfficeCards records={offices} />
          <GovernmentRecordNotice />
        </>
      ) : (
        <>
          {branchRecords.length > 0 ? (
            <OfficialCards records={branchRecords} />
          ) : (
            <GovernmentRecordNotice />
          )}
          {branchRecords.length > 0 ? <GovernmentRecordNotice /> : null}
        </>
      )}
    </section>
  );
}

export function ElectedOfficialsPage() {
  const { t } = useTranslation("common");
  const location = useLocation();
  const title = t("pages.government.electedOfficialsTitle");
  const description = t("pages.government.electedOfficialsDescription");
  const electedRecords = officials.filter(
    (official) => official.branch === "legislative" || official.branch === "ex-officio",
  );

  return (
    <section
      className="foundation-page foundation-page--wide"
      data-testid="elected-officials-page"
    >
      <RouteMetadata
        config={config}
        title={title}
        description={description}
        path={location.pathname}
      />
      <p className="eyebrow">{t("pages.government.eyebrow")}</p>
      <h1>{title}</h1>
      <p className="foundation-page__tagline">{description}</p>
      <p className="government-inline-note">{t("pages.government.exOfficioNote")}</p>
      {electedRecords.length > 0 ? (
        <OfficialCards records={electedRecords} />
      ) : (
        <GovernmentRecordNotice />
      )}
      {electedRecords.length > 0 ? <GovernmentRecordNotice /> : null}
    </section>
  );
}

export function GovernmentBranchRoute() {
  const { branch } = useParams();

  if (branch === "elected-officials") {
    return <ElectedOfficialsPage />;
  }

  if (!isGovernmentBranch(branch)) {
    return <NotFoundPage />;
  }

  return <GovernmentBranchPage branch={branch} />;
}
