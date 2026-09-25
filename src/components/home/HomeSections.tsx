import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { homeFacts } from "../../lib/ui/homeFacts";
import {
  IconArrow,
  IconBuilding,
  IconChart,
  IconDocument,
  IconLedger,
  IconMapPin,
  IconPeople,
  IconRoad,
  IconShield,
} from "./icons";

export function PopularServices() {
  const { t } = useTranslation("common");
  const { popularCategories } = homeFacts();
  if (popularCategories.length === 0) return null;

  return (
    <nav className="home-popular" aria-label={t("home.popular.label")}>
      <p className="home-popular__label">{t("home.popular.label")}</p>
      <ul>
        {popularCategories.map((category) => (
          <li key={category}>
            <Link className="home-chip" to={`/services/${category}`}>
              {t(`services.categories.${category}`)}
            </Link>
          </li>
        ))}
      </ul>
      <Link className="text-link home-popular__all" to="/services">
        {t("home.popular.all")} <IconArrow />
      </Link>
    </nav>
  );
}

function RowLink({
  to,
  icon,
  title,
  body,
}: {
  to: string;
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li>
      <Link className="home-row" to={to}>
        <span className="home-row__icon">{icon}</span>
        <span className="home-row__text">
          <strong>{title}</strong>
          <span>{body}</span>
        </span>
        <span className="home-row__arrow">
          <IconArrow />
        </span>
      </Link>
    </li>
  );
}

export function WhoServes() {
  const { t } = useTranslation("common");
  const facts = homeFacts();

  return (
    <section className="home-block home-block--split" aria-labelledby="home-who-title">
      <div className="home-block__copy">
        <p className="home-kicker">{t("home.who.eyebrow")}</p>
        <h2 id="home-who-title">{t("home.who.title")}</h2>
        <p>{t("home.who.description")}</p>
        <Link className="text-link" to="/government">
          {t("home.who.overview")} <IconArrow />
        </Link>
      </div>
      <ul className="home-rows">
        <RowLink
          to="/elected-officials"
          icon={<IconPeople />}
          title={t("home.who.officials")}
          body={
            facts.mayorName
              ? t("home.who.officialsBody", {
                  mayor: facts.mayorName,
                  count: facts.otherOfficials,
                })
              : t("home.who.officialsFallback")
          }
        />
        <RowLink
          to="/departments"
          icon={<IconBuilding />}
          title={t("home.who.offices")}
          body={t("home.who.officesBody", { count: facts.officeCount })}
        />
        <RowLink
          to="/barangays"
          icon={<IconMapPin />}
          title={t("home.who.barangays")}
          body={t("home.who.barangaysBody", {
            count: facts.barangayCount,
            population: facts.population.toLocaleString("en-PH"),
          })}
        />
      </ul>
    </section>
  );
}

function SpendingCard({
  to,
  icon,
  title,
  body,
}: {
  to: string;
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li>
      <Link className="home-card" to={to}>
        <span className="home-card__icon">{icon}</span>
        <strong>{title}</strong>
        <span>{body}</span>
        <span className="home-card__arrow">
          <IconArrow />
        </span>
      </Link>
    </li>
  );
}

export function SpendingCards() {
  const { t } = useTranslation("common");
  const { transparencyCounts } = homeFacts();

  return (
    <section className="home-block" aria-labelledby="home-spending-title">
      <div className="home-block__head">
        <div>
          <p className="home-kicker">{t("home.spending.eyebrow")}</p>
          <h2 id="home-spending-title">{t("home.spending.title")}</h2>
          <p>{t("home.spending.description")}</p>
        </div>
        <Link className="text-link" to="/transparency">
          {t("home.spending.overview")} <IconArrow />
        </Link>
      </div>
      <ul className="home-cards">
        <SpendingCard
          to="/transparency#transparency-chart-financial-statement"
          icon={<IconLedger />}
          title={t("home.spending.finance")}
          body={t("home.spending.financeBody", { count: transparencyCounts.finance })}
        />
        <SpendingCard
          to="/transparency#transparency-chart-procurement"
          icon={<IconDocument />}
          title={t("home.spending.procurement")}
          body={t("home.spending.procurementBody")}
        />
        <SpendingCard
          to="/transparency#transparency-chart-infrastructure"
          icon={<IconRoad />}
          title={t("home.spending.infrastructure")}
          body={t("home.spending.infrastructureBody")}
        />
        <SpendingCard
          to="/statistics"
          icon={<IconChart />}
          title={t("home.spending.numbers")}
          body={t("home.spending.numbersBody")}
        />
      </ul>
    </section>
  );
}

export function AboutStrip() {
  const { t } = useTranslation("common");
  return (
    <section className="home-about" aria-labelledby="home-about-title">
      <span className="home-about__icon">
        <IconShield />
      </span>
      <div>
        <h2 id="home-about-title">{t("home.about.title")}</h2>
        <p>{t("home.about.body")}</p>
      </div>
      <div className="home-about__actions">
        <Link className="button button--secondary" to="/about">
          {t("home.about.project")} <IconArrow />
        </Link>
        <Link className="text-link" to="/contribute#submit-data">
          {t("home.about.help")}
        </Link>
      </div>
    </section>
  );
}
