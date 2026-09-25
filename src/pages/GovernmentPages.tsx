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
import { ElectionResults } from "../components/government/ElectionResults";
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

/** Role written by pipeline/transforms/elections.py for councilors. */
const COUNCIL_ROLE = "Sangguniang Bayan Member";

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

/** "(047) 633-0302 / 0919 002 9061" -> one tel: link per number. */
function PhoneLinks({ value }: { value: string }) {
  const numbers = value
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
  return (
    <>
      {numbers.map((number, index) => (
        <span key={number}>
          {index > 0 ? " / " : null}
          <a href={`tel:${number.replace(/[^\d+]/g, "")}`}>{number}</a>
        </span>
      ))}
    </>
  );
}

function OfficeCards({ records }: { records: OfficeRecord[] }) {
  const { t } = useTranslation("common");

  return (
    <div className="government-record-grid">
      {records.map((office) => (
        <article
          className="government-record-card"
          key={office.id}
          data-testid={`office-${office.id}`}
        >
          <div className="government-record-card__header">
            <div>
              <p className="government-record-card__label">{office.officeType}</p>
              <h2>{office.name}</h2>
            </div>
          </div>
          {office.description ? (
            <p className="government-record-card__meta">{office.description}</p>
          ) : null}
          <dl className="government-record-card__details">
            {office.head ? (
              <div>
                <dt>{t("pages.government.officeHead")}</dt>
                <dd>{office.head}</dd>
              </div>
            ) : null}
            {office.contact?.phone ? (
              <div>
                <dt>{t("pages.government.phone")}</dt>
                <dd>
                  <PhoneLinks value={office.contact.phone} />
                </dd>
              </div>
            ) : null}
            {office.contact?.email ? (
              <div>
                <dt>{t("pages.government.email")}</dt>
                <dd>
                  <a href={`mailto:${office.contact.email}`}>{office.contact.email}</a>
                </dd>
              </div>
            ) : null}
            {office.location?.address ? (
              <div>
                <dt>{t("pages.government.location")}</dt>
                <dd>{office.location.address}</dd>
              </div>
            ) : null}
          </dl>
          <ProvenanceDetails provenance={office.provenance} />
        </article>
      ))}
    </div>
  );
}

const SK_PREFIX = "SK ";

function BarangayList({ records }: { records: BarangayRecord[] }) {
  const { t } = useTranslation("common");

  if (records.length === 0) {
    return (
      <div className="government-map__fallback">
        <p>{t("pages.government.noBarangays")}</p>
      </div>
    );
  }

  return (
    <ol className="barangay-grid" aria-label={t("pages.government.listAlternative")}>
      {records.map((barangay) => (
        <li key={barangay.id}>
          <Link
            className="barangay-card"
            to={`/barangays/${barangay.id}`}
            data-testid={`barangay-card-${barangay.id}`}
          >
            <span className="barangay-card__class">
              {barangay.classification
                ? t(`pages.government.classification.${barangay.classification}`)
                : null}
            </span>
            <strong className="barangay-card__name">{barangay.name}</strong>
            <span className="barangay-card__captain">
              {t("pages.government.punongBarangay")}:{" "}
              {barangay.punongBarangay ?? t("pages.government.notAvailable")}
            </span>
            {barangay.population2024 !== undefined ? (
              <span className="barangay-card__population">
                {t("pages.government.population", {
                  count: barangay.population2024,
                  formatted: barangay.population2024.toLocaleString("en-PH"),
                })}
              </span>
            ) : null}
          </Link>
        </li>
      ))}
    </ol>
  );
}

function BarangayDirectory() {
  const { t } = useTranslation("common");
  const mapPoints = getVerifiedBarangayMapPoints(barangays);
  const totalPopulation = barangays.reduce((sum, b) => sum + (b.population2024 ?? 0), 0);

  return (
    <div className="government-barangays">
      {/* Shown once any barangay has verified coordinates. Until then an empty
          map frame would only say "nothing here" in a larger font. */}
      {mapPoints.length > 0 ? (
        <section className="government-map-panel" aria-labelledby="barangay-map-title">
          <div>
            <p className="government-record-card__label">
              {t("pages.government.mapEyebrow")}
            </p>
            <h2 id="barangay-map-title">{t("pages.government.mapTitle")}</h2>
          </div>
          <Suspense
            fallback={
              <p className="government-map__fallback">
                {t("pages.government.mapLoading")}
              </p>
            }
          >
            <VerifiedBarangayMap points={mapPoints} />
          </Suspense>
        </section>
      ) : null}
      <section aria-labelledby="barangay-list-title">
        <div className="government-section-heading">
          <h2 id="barangay-list-title">{t("pages.government.listAlternative")}</h2>
          {totalPopulation > 0 ? (
            <p className="barangay-total">
              {t("pages.government.totalPopulation", {
                count: barangays.length,
                formatted: totalPopulation.toLocaleString("en-PH"),
              })}
            </p>
          ) : null}
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
  const current = officials.filter((official) => official.status === "current");
  const leaders = current.filter((official) => official.role !== COUNCIL_ROLE);
  const council = current.filter((official) => official.role === COUNCIL_ROLE);
  const totalPopulation = barangays.reduce((sum, b) => sum + (b.population2024 ?? 0), 0);

  return (
    <section
      className="foundation-page foundation-page--wide"
      data-testid="government-page"
    >
      <RouteMetadata
        config={config}
        title={title}
        description={description}
        path={location.pathname}
      />
      <p className="eyebrow">{t("pages.independentEyebrow")}</p>
      <h1>{title}</h1>
      <p className="foundation-page__tagline">{description}</p>

      {/* The page leads with the people and places, not with a menu: a
          resident arriving here wants to know who runs Limay and how to reach
          them, and the detail pages are one click from each section. */}
      {leaders.length > 0 ? (
        <section className="gov-section" aria-labelledby="gov-leaders-title">
          <div className="gov-section__head">
            <h2 id="gov-leaders-title">{t("pages.government.leadershipTitle")}</h2>
            <Link className="text-link" to="/elected-officials">
              {t("pages.government.seeResults")}
            </Link>
          </div>
          <ul className="gov-leaders">
            {leaders.map((official) => (
              <li key={official.id} className="gov-leader">
                <span className="gov-leader__role">{official.role}</span>
                <strong className="gov-leader__name">{official.name}</strong>
                {official.term ? (
                  <span className="gov-leader__term">
                    {t("pages.government.term")} {official.term}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {council.length > 0 ? (
        <section className="gov-section" aria-labelledby="gov-council-title">
          <div className="gov-section__head">
            <h2 id="gov-council-title">{t("pages.government.councilTitle")}</h2>
            <Link className="text-link" to="/elected-officials">
              {t("pages.government.seeAllOfficials")}
            </Link>
          </div>
          <ul className="gov-names">
            {council.map((official) => (
              <li key={official.id}>{official.name}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {barangays.length > 0 ? (
        <section className="gov-section" aria-labelledby="gov-barangays-title">
          <div className="gov-section__head">
            <h2 id="gov-barangays-title">{t("pages.government.branches.barangays")}</h2>
            <Link className="text-link" to="/barangays">
              {t("pages.government.seeAllBarangays")}
            </Link>
          </div>
          {totalPopulation > 0 ? (
            <p className="barangay-total">
              {t("pages.government.totalPopulation", {
                count: barangays.length,
                formatted: totalPopulation.toLocaleString("en-PH"),
              })}
            </p>
          ) : null}
          <ul className="gov-barangays">
            {barangays.map((barangay) => (
              <li key={barangay.id}>
                <Link className="gov-barangay" to={`/barangays/${barangay.id}`}>
                  <strong>{barangay.name}</strong>
                  <span>
                    {barangay.punongBarangay ?? t("pages.government.notAvailable")}
                  </span>
                  {barangay.population2024 !== undefined ? (
                    <span className="gov-barangay__population">
                      {t("pages.government.population", {
                        count: barangay.population2024,
                        formatted: barangay.population2024.toLocaleString("en-PH"),
                      })}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <MunicipalContact />

      <nav className="gov-more" aria-label={t("pages.government.moreTitle")}>
        <h2>{t("pages.government.moreTitle")}</h2>
        <Link className="text-link" to="/departments">
          {t("pages.government.branches.departments")}
        </Link>
        <Link className="text-link" to="/elected-officials">
          {t("pages.government.electedOfficialsTitle")}
        </Link>
        <Link className="text-link" to="/barangays">
          {t("pages.government.branches.barangays")}
        </Link>
      </nav>
    </section>
  );
}

function MunicipalContact() {
  const { t } = useTranslation("common");
  const hall = offices.find((office) => office.id === "municipal-hall");
  if (!hall) return null;

  return (
    <section className="municipal-contact" aria-labelledby="municipal-contact-title">
      <h2 id="municipal-contact-title">{t("pages.government.contactTitle")}</h2>
      <dl>
        {hall.contact?.phone ? (
          <div>
            <dt>{t("pages.government.phone")}</dt>
            <dd>
              <PhoneLinks value={hall.contact.phone} />
            </dd>
          </div>
        ) : null}
        {hall.contact?.email ? (
          <div>
            <dt>{t("pages.government.email")}</dt>
            <dd>
              <a href={`mailto:${hall.contact.email}`}>{hall.contact.email}</a>
            </dd>
          </div>
        ) : null}
        {hall.location?.address ? (
          <div>
            <dt>{t("pages.government.location")}</dt>
            <dd>{hall.location.address}</dd>
          </div>
        ) : null}
      </dl>
      <Link className="text-link" to="/departments">
        {t("pages.government.moreContacts")}
      </Link>
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
        offices.length > 0 ? (
          <OfficeCards records={offices} />
        ) : (
          <GovernmentRecordNotice />
        )
      ) : (
        <>
          {branchRecords.length > 0 ? (
            <OfficialCards records={branchRecords} />
          ) : (
            <GovernmentRecordNotice />
          )}
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
  // Everyone who holds office by election, Mayor first: the data is ordered
  // Mayor, Vice Mayor, then councilors by votes.
  const electedRecords = officials.filter((official) => official.status === "current");

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
      <ElectionResults />
    </section>
  );
}

function RosterGroup({
  title,
  officials,
}: {
  title: string;
  officials: NonNullable<BarangayRecord["officials"]>;
}) {
  if (officials.length === 0) return null;
  return (
    <section className="barangay-roster__group">
      <h2>{title}</h2>
      <table className="barangay-roster">
        <tbody>
          {officials.map((official, index) => (
            <tr key={`${official.position}-${official.name}-${index}`}>
              <th scope="row">{official.name}</th>
              <td>{official.position}</td>
              <td className="barangay-roster__term">{official.termInPosition ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function BarangayDetailPage() {
  const { t } = useTranslation("common");
  const location = useLocation();
  const { id } = useParams();
  const barangay = barangays.find((record) => record.id === id);

  if (!barangay) {
    return <NotFoundPage />;
  }

  const officials = barangay.officials ?? [];
  const council = officials.filter((o) => !o.position.startsWith(SK_PREFIX));
  const youth = officials.filter((o) => o.position.startsWith(SK_PREFIX));
  const title = t("pages.government.barangayTitle", { name: barangay.name });

  return (
    <article
      className="foundation-page barangay-detail"
      data-testid="barangay-detail-page"
    >
      <RouteMetadata
        config={config}
        title={title}
        description={t("pages.government.barangayDescription", { name: barangay.name })}
        path={location.pathname}
        type="article"
      />
      <Link className="text-link service-breadcrumb" to="/barangays">
        {t("pages.government.backToBarangays")}
      </Link>
      <p className="eyebrow">{t("pages.government.branches.barangays")}</p>
      <h1>{title}</h1>
      <dl className="barangay-facts">
        <div>
          <dt>{t("pages.government.punongBarangay")}</dt>
          <dd>{barangay.punongBarangay ?? t("pages.government.notAvailable")}</dd>
        </div>
        {barangay.population2024 !== undefined ? (
          <div>
            <dt>{t("pages.government.population2024")}</dt>
            <dd>{barangay.population2024.toLocaleString("en-PH")}</dd>
          </div>
        ) : null}
        {barangay.classification ? (
          <div>
            <dt>{t("pages.government.classificationLabel")}</dt>
            <dd>{t(`pages.government.classification.${barangay.classification}`)}</dd>
          </div>
        ) : null}
        <div>
          <dt>{t("pages.government.contact")}</dt>
          <dd>
            {barangay.contactPhone ? (
              <a href={`tel:${barangay.contactPhone.replace(/[^\d+]/g, "")}`}>
                {barangay.contactPhone}
              </a>
            ) : (
              t("pages.government.notAvailable")
            )}
          </dd>
        </div>
        {barangay.term ? (
          <div>
            <dt>{t("pages.government.term")}</dt>
            <dd>{barangay.term}</dd>
          </div>
        ) : null}
      </dl>
      <RosterGroup title={t("pages.government.barangayCouncil")} officials={council} />
      <RosterGroup title={t("pages.government.sangguniangKabataan")} officials={youth} />
      <ProvenanceDetails provenance={barangay.provenance} />
    </article>
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
