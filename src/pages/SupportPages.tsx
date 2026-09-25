import { useState, type FormEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { loadLguConfig } from "../app/lguConfig";
import { createPortalIdentity } from "../app/portalIdentity";
import announcementsJson from "../data/announcements.json";
import type { AnnouncementRecord } from "../data/types";
import { submitReport, type ReportResult } from "../lib/ui/reportApi";
import { type ReportInput, validateReportInput } from "../lib/ui/reportValidation";
import { formatNewsDate } from "../lib/ui/newsDate";
import { RouteMetadata } from "../lib/ui/RouteMetadata";

const config = loadLguConfig();
const portalIdentity = createPortalIdentity(config);
const announcements = announcementsJson as AnnouncementRecord[];

function SupportPageShell({
  title,
  description,
  path,
  testId,
  eyebrow,
  children,
  className = "",
}: {
  title: string;
  description: string;
  path: string;
  testId: string;
  eyebrow: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={["foundation-page", "foundation-page--wide", "support-page", className]
        .filter(Boolean)
        .join(" ")}
      data-testid={testId}
    >
      <RouteMetadata
        config={config}
        title={title}
        description={description}
        path={path}
      />
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="foundation-page__tagline">{description}</p>
      {children}
    </section>
  );
}

function ExternalSourceLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

export function AboutPage() {
  const { t } = useTranslation("common");

  return (
    <SupportPageShell
      eyebrow={t("pages.independentEyebrow")}
      title={t("pages.about.title")}
      description={t("pages.about.description")}
      path="/about"
      testId="about-page"
    >
      <div className="support-page__document">
        <section>
          <h2>{t("about.missionTitle")}</h2>
          <p>{t("about.missionBody")}</p>
        </section>
        <section>
          <h2>{t("about.independenceTitle")}</h2>
          <p>{t("about.independenceBody")}</p>
        </section>
        <section>
          <h2>{t("about.sourcesTitle")}</h2>
          <p>{t("about.sourcesBody")}</p>
          <ExternalSourceLink href={portalIdentity.socials.officialWebsite}>
            {t("footer.officialWebsite")}
          </ExternalSourceLink>
        </section>
      </div>
    </SupportPageShell>
  );
}

export function NewsPage() {
  const { t } = useTranslation("common");

  return (
    <SupportPageShell
      eyebrow={t("news.eyebrow")}
      title={t("pages.news.title")}
      description={t("pages.news.description")}
      path="/news"
      testId="news-page"
    >
      {announcements.length > 0 ? (
        <div className="news-grid">
          {announcements.map((announcement) => (
            <article
              className="news-card"
              key={announcement.id}
              data-testid={`news-card-${announcement.id}`}
            >
              {announcement.image ? (
                <img
                  className="news-card__image"
                  src={announcement.image}
                  alt={announcement.imageAlt ?? ""}
                  loading="lazy"
                />
              ) : null}
              <div className="news-card__content">
                <p className="news-card__date">
                  <time dateTime={announcement.publishedAt}>
                    {formatNewsDate(announcement.publishedAt)}
                  </time>
                  {" · "}
                  {announcement.sourceName}
                </p>
                <h2>
                  {announcement.body ? (
                    <Link to={`/news/${announcement.id}`}>{announcement.title}</Link>
                  ) : (
                    announcement.title
                  )}
                </h2>
                {announcement.summary ? <p>{announcement.summary}</p> : null}
                <div className="news-card__links">
                  {announcement.body ? (
                    <Link to={`/news/${announcement.id}`}>{t("news.readMore")}</Link>
                  ) : null}
                  {announcement.url ? (
                    <ExternalSourceLink href={announcement.url}>
                      {t("news.openSource")}
                    </ExternalSourceLink>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="support-page__notice" data-testid="news-empty" role="status">
          <span className="status-dot" aria-hidden="true" />
          <div>
            <h2>{t("news.empty")}</h2>
            <p>{t("news.emptyDescription")}</p>
            <div className="support-page__links">
              <ExternalSourceLink href={portalIdentity.socials.officialWebsite}>
                {t("footer.officialWebsite")}
              </ExternalSourceLink>
              <ExternalSourceLink href={portalIdentity.socials.officialFacebook}>
                {t("news.officialFacebook")}
              </ExternalSourceLink>
            </div>
          </div>
        </div>
      )}
    </SupportPageShell>
  );
}

const INITIAL_REPORT_INPUT: ReportInput = {
  name: "",
  email: "",
  message: "",
  consent: false,
  honeypot: "",
};

function reportStatusKey(result: ReportResult | "idle"): string {
  if (result === "idle") return "report.status.idle";
  return `report.status.${result.status}`;
}

export function ReportPage() {
  const { t } = useTranslation("common");
  const [input, setInput] = useState<ReportInput>(INITIAL_REPORT_INPUT);
  const [result, setResult] = useState<ReportResult | "idle">("idle");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "";

  function updateField<K extends keyof ReportInput>(field: K, value: ReportInput[K]) {
    setInput((current) => ({ ...current, [field]: value }));
    setValidationErrors([]);
    setResult("idle");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateReportInput(input);
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      return;
    }

    const nextResult = await submitReport(input, {
      turnstileSiteKey,
      turnstileToken: "",
    });
    setResult(nextResult);
  }

  return (
    <SupportPageShell
      eyebrow={t("report.eyebrow")}
      title={t("pages.report.title")}
      description={t("pages.report.description")}
      path="/report"
      testId="report-page"
      className="report-page"
    >
      <div className="support-page__notice" role="note">
        <span className="status-dot" aria-hidden="true" />
        <p>{t("report.privacyNotice")}</p>
      </div>

      <form className="report-form" data-testid="report-form" onSubmit={handleSubmit}>
        <div className="report-form__field">
          <label htmlFor="report-name">{t("report.name")}</label>
          <input
            id="report-name"
            name="name"
            autoComplete="name"
            value={input.name}
            onChange={(event) => updateField("name", event.target.value)}
          />
          {validationErrors.includes("name") ? (
            <p className="form-error">{t("report.errors.name")}</p>
          ) : null}
        </div>
        <div className="report-form__field">
          <label htmlFor="report-email">{t("report.email")}</label>
          <input
            id="report-email"
            name="email"
            type="email"
            autoComplete="email"
            value={input.email}
            onChange={(event) => updateField("email", event.target.value)}
          />
          {validationErrors.includes("email") ? (
            <p className="form-error">{t("report.errors.email")}</p>
          ) : null}
        </div>
        <div className="report-form__field report-form__field--wide">
          <label htmlFor="report-message">{t("report.message")}</label>
          <textarea
            id="report-message"
            name="message"
            maxLength={5000}
            rows={7}
            value={input.message}
            onChange={(event) => updateField("message", event.target.value)}
          />
          {validationErrors.includes("message") ||
          validationErrors.includes("messageLength") ? (
            <p className="form-error">{t("report.errors.message")}</p>
          ) : null}
        </div>
        <div className="report-form__honeypot" aria-hidden="true">
          <label htmlFor="report-website">{t("report.honeypotLabel")}</label>
          <input
            id="report-website"
            data-testid="report-honeypot"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={input.honeypot}
            onChange={(event) => updateField("honeypot", event.target.value)}
          />
        </div>
        <label className="report-form__consent">
          <input
            type="checkbox"
            name="consent"
            checked={input.consent}
            onChange={(event) => updateField("consent", event.target.checked)}
          />
          <span>{t("report.consentLabel")}</span>
        </label>
        {validationErrors.includes("consent") ? (
          <p className="form-error">{t("report.errors.consent")}</p>
        ) : null}
        <p className="report-form__turnstile">{t("report.turnstileLabel")}</p>
        <p className="report-form__delivery-note">{t("report.deliveryDisabled")}</p>
        <button className="button button--primary" type="submit">
          {t("report.submit")}
        </button>
        <p className="report-form__status" data-testid="report-status" aria-live="polite">
          {validationErrors.length > 0
            ? t("report.validationSummary")
            : t(reportStatusKey(result))}
        </p>
      </form>
    </SupportPageShell>
  );
}

export function ContributePage() {
  const { t } = useTranslation("common");

  return (
    <SupportPageShell
      eyebrow={t("contribute.eyebrow")}
      title={t("pages.contribute.title")}
      description={t("pages.contribute.description")}
      path="/contribute"
      testId="contribute-page"
    >
      <div className="support-page__document support-page__document--split">
        <section>
          <p className="eyebrow">{t("contribute.correctionEyebrow")}</p>
          <h2>{t("contribute.correctionTitle")}</h2>
          <p>{t("contribute.correctionBody")}</p>
          <ol>
            <li>{t("contribute.correctionStep1")}</li>
            <li>{t("contribute.correctionStep2")}</li>
            <li>{t("contribute.correctionStep3")}</li>
          </ol>
          <ExternalSourceLink href={`${portalIdentity.socials.sourceCode}/issues/new`}>
            {t("contribute.issueAction")}
          </ExternalSourceLink>
        </section>
        <section>
          <p className="eyebrow">{t("contribute.developerEyebrow")}</p>
          <h2>{t("contribute.developerTitle")}</h2>
          <p>{t("contribute.developerBody")}</p>
          <ExternalSourceLink href={portalIdentity.socials.sourceCode}>
            {t("contribute.sourceAction")}
          </ExternalSourceLink>
        </section>
      </div>
    </SupportPageShell>
  );
}

export function LegalPage() {
  return (
    <SupportDocumentPage
      path="/legal"
      testId="legal-page"
      eyebrowKey="pages.legal.eyebrow"
      titleKey="pages.legal.title"
      descriptionKey="pages.legal.description"
      sectionKeys={["legal.portal", "legal.sources", "legal.contact"]}
    />
  );
}

interface DocumentPageProps {
  path: string;
  testId: string;
  titleKey: string;
  descriptionKey: string;
  sectionKeys: string[];
  eyebrowKey?: string;
}

function SupportDocumentPage({
  path,
  testId,
  titleKey,
  descriptionKey,
  sectionKeys,
  eyebrowKey = "pages.independentEyebrow",
}: DocumentPageProps) {
  const { t } = useTranslation("common");
  const title = t(titleKey);
  const description = t(descriptionKey);

  return (
    <SupportPageShell
      eyebrow={t(eyebrowKey)}
      title={title}
      description={description}
      path={path}
      testId={testId}
      className="support-document-page"
    >
      <div className="support-page__document">
        {sectionKeys.map((sectionKey) => (
          <section key={sectionKey}>
            <h2>{t(`${sectionKey}.title`)}</h2>
            <p>{t(`${sectionKey}.body`)}</p>
          </section>
        ))}
      </div>
    </SupportPageShell>
  );
}

export function PrivacyPage({ path = "/privacy" }: { path?: string } = {}) {
  return (
    <SupportDocumentPage
      path={path}
      testId="privacy.page"
      eyebrowKey="pages.privacy.eyebrow"
      titleKey="pages.privacy.title"
      descriptionKey="pages.privacy.description"
      sectionKeys={[
        "privacy.collection",
        "privacy.use",
        "privacy.retention",
        "privacy.rights",
      ]}
    />
  );
}

export function TermsPage({ path = "/terms" }: { path?: string } = {}) {
  return (
    <SupportDocumentPage
      path={path}
      testId="terms.page"
      eyebrowKey="pages.terms.eyebrow"
      titleKey="pages.terms.title"
      descriptionKey="pages.terms.description"
      sectionKeys={[
        "terms.independence",
        "terms.verification",
        "terms.links",
        "terms.changes",
      ]}
    />
  );
}

export function AccessibilityPage() {
  return (
    <SupportDocumentPage
      path="/accessibility"
      testId="accessibility.page"
      eyebrowKey="pages.accessibility.eyebrow"
      titleKey="pages.accessibility.title"
      descriptionKey="pages.accessibility.description"
      sectionKeys={[
        "accessibilityPage.commitment",
        "accessibilityPage.features",
        "accessibilityPage.feedback",
      ]}
    />
  );
}

export function FaqPage() {
  return (
    <SupportDocumentPage
      path="/faq"
      testId="faq.page"
      eyebrowKey="pages.faq.eyebrow"
      titleKey="pages.faq.title"
      descriptionKey="pages.faq.description"
      sectionKeys={["faq.independent", "faq.sources", "faq.unverified", "faq.report"]}
    />
  );
}

export function SitemapPage() {
  const { t } = useTranslation("common");
  const links = [
    ["/", "navigation.home"],
    ["/services", "navigation.services"],
    ["/government", "navigation.government"],
    ["/legislation", "navigation.legislation"],
    ["/transparency", "navigation.transparency"],
    ["/statistics", "navigation.statistics"],
    ["/news", "navigation.news"],
    ["/report", "navigation.report"],
    ["/contribute", "navigation.contribute"],
    ["/about", "navigation.about"],
    ["/faq", "pages.faq.title"],
    ["/accessibility", "pages.accessibility.title"],
    ["/privacy", "pages.privacy.title"],
    ["/terms", "pages.terms.title"],
  ] as const;

  return (
    <SupportPageShell
      eyebrow={t("pages.independentEyebrow")}
      title={t("pages.sitemap.title")}
      description={t("pages.sitemap.description")}
      path="/sitemap"
      testId="sitemap.page"
      className="sitemap-page"
    >
      <nav aria-label={t("pages.sitemap.navigationLabel")} className="sitemap-links">
        {links.map(([path, labelKey]) => (
          <Link key={path} to={path}>
            {t(labelKey)}
          </Link>
        ))}
      </nav>
    </SupportPageShell>
  );
}
