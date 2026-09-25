import type { ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { loadLguConfig } from "../../app/lguConfig";
import { createPortalIdentity } from "../../app/portalIdentity";
import {
  IconArrow,
  IconBolt,
  IconChat,
  IconExternal,
  IconGlobe,
  IconHeart,
  IconLightbulb,
  IconOffice,
  IconPeople,
  IconServer,
  IconShield,
  IconStar,
  IconTarget,
} from "../home/icons";

/* The About page follows the BetterGov chapter pattern (see bettermeycauayan.org/about):
   a recruitment page for the volunteer network, with BetterLimay's own independence
   and sourcing notes kept in the middle so they are not lost. */

const portalIdentity = createPortalIdentity(loadLguConfig());
const discordUrl = portalIdentity.socials.communityDiscord;

const PROVIDE_ITEMS: { key: string; icon: ReactNode }[] = [
  { key: "infra", icon: <IconServer /> },
  { key: "hackathons", icon: <IconPeople /> },
  { key: "data", icon: <IconGlobe /> },
  { key: "team", icon: <IconHeart /> },
  { key: "mentorship", icon: <IconStar /> },
  { key: "office", icon: <IconOffice /> },
];

const MANIFESTO_LINES = ["line1", "line2", "line3", "line4", "line5"] as const;

function DiscordLink({ className, label }: { className: string; label: string }) {
  const { t } = useTranslation("common");
  if (!discordUrl) return null;
  return (
    <a className={className} href={discordUrl} target="_blank" rel="noreferrer">
      <IconChat /> {label}
      <span className="sr-only"> {t("about.newTab")}</span>
    </a>
  );
}

export function AboutHero() {
  const { t } = useTranslation("common");
  return (
    <section className="about-band about-hero" aria-labelledby="about-hero-title">
      <span className="about-badge about-badge--glass">
        <IconPeople />
      </span>
      <p className="about-hero__eyebrow">{t("pages.independentEyebrow")}</p>
      <h1 id="about-hero-title">{t("about.hero.title")}</h1>
      <p className="about-hero__body">
        <Trans t={t} i18nKey="about.hero.body" components={{ b: <strong /> }} />
      </p>
      <div className="about-actions">
        <DiscordLink
          className="about-btn about-btn--light"
          label={t("about.hero.discord")}
        />
        <a className="about-btn about-btn--outline" href="#mission">
          {t("about.hero.learnMore")} <IconArrow />
        </a>
      </div>
    </section>
  );
}

export function AboutMission() {
  const { t } = useTranslation("common");
  return (
    <section className="about-section" id="mission" aria-labelledby="about-mission-title">
      <header className="about-section__head">
        <span className="about-badge">
          <IconTarget />
        </span>
        <h2 id="about-mission-title">{t("about.mission.title")}</h2>
        <p>{t("about.mission.subtitle")}</p>
      </header>
      <div className="about-callout">
        <p>
          <Trans
            t={t}
            i18nKey="about.mission.p1"
            components={{ b: <strong />, chip: <span className="about-chip" /> }}
          />
        </p>
        <p>
          <Trans t={t} i18nKey="about.mission.p2" components={{ b: <strong /> }} />
        </p>
      </div>
    </section>
  );
}

export function AboutTrust() {
  const { t } = useTranslation("common");
  return (
    <section className="about-section" aria-labelledby="about-trust-title">
      <header className="about-section__head">
        <span className="about-badge">
          <IconShield />
        </span>
        <h2 id="about-trust-title">{t("about.trustTitle")}</h2>
        <p>{t("about.missionBody")}</p>
      </header>
      <div className="about-trust">
        <article className="about-card">
          <h3>{t("about.independenceTitle")}</h3>
          <p>{t("about.independenceBody")}</p>
          <a
            className="text-link"
            href={portalIdentity.socials.officialWebsite}
            target="_blank"
            rel="noreferrer"
          >
            {t("footer.officialWebsite")} <IconExternal />
            <span className="sr-only"> {t("about.newTab")}</span>
          </a>
        </article>
        <article className="about-card">
          <h3>{t("about.sourcesTitle")}</h3>
          <p>{t("about.sourcesBody")}</p>
        </article>
      </div>
    </section>
  );
}

export function AboutProvide() {
  const { t } = useTranslation("common");
  return (
    <section className="about-section" aria-labelledby="about-provide-title">
      <header className="about-section__head">
        <h2 id="about-provide-title">{t("about.provide.title")}</h2>
        <p>{t("about.provide.subtitle")}</p>
      </header>
      <ul className="about-provide__grid">
        {PROVIDE_ITEMS.map(({ key, icon }) => (
          <li className="about-card" key={key}>
            <span className="about-card__icon">{icon}</span>
            <h3>{t(`about.provide.items.${key}.title`)}</h3>
            <p>{t(`about.provide.items.${key}.body`)}</p>
          </li>
        ))}
      </ul>
      <p className="about-provide__note">{t("about.provide.footnote")}</p>
    </section>
  );
}

export function AboutManifesto() {
  const { t } = useTranslation("common");
  return (
    <section
      className="about-band about-manifesto"
      aria-labelledby="about-manifesto-title"
    >
      <span className="about-badge about-badge--gold">
        <IconBolt />
      </span>
      <h2 id="about-manifesto-title">{t("about.manifesto.title")}</h2>
      <div className="about-manifesto__panel">
        <p className="about-manifesto__quote">{t("about.manifesto.quote")}</p>
        {MANIFESTO_LINES.map((line) => (
          <p key={line}>
            <Trans
              t={t}
              i18nKey={`about.manifesto.${line}`}
              components={{ b: <strong />, hl: <mark /> }}
            />
          </p>
        ))}
        <p className="about-manifesto__closing">{t("about.manifesto.closing")}</p>
      </div>
    </section>
  );
}

export function AboutCta() {
  const { t } = useTranslation("common");
  return (
    <section className="about-band about-cta" aria-labelledby="about-cta-title">
      <h2 id="about-cta-title">{t("about.cta.title")}</h2>
      <p>{t("about.cta.body")}</p>
      <div className="about-actions">
        <DiscordLink
          className="about-btn about-btn--light"
          label={t("about.cta.discord")}
        />
        {discordUrl ? (
          <span className="about-actions__or">{t("about.cta.or")}</span>
        ) : null}
        <Link className="about-btn about-btn--outline" to="/contribute">
          <IconLightbulb /> {t("about.cta.ideas")}
        </Link>
      </div>
      <p className="about-cta__footer">
        <Trans
          t={t}
          i18nKey="about.cta.footer"
          components={{
            // Trans fills the link text from the translation.
            src: (
              <a
                href={portalIdentity.socials.sourceCode}
                target="_blank"
                rel="noreferrer"
              />
            ),
          }}
        />
      </p>
    </section>
  );
}
