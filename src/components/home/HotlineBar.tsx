import { useTranslation } from "react-i18next";

import hotlinesJson from "../../data/hotlines.json";
import type { HotlineRecord } from "../../data/types";
import { loadLguConfig } from "../../app/lguConfig";

const officialWebsite = loadLguConfig().portal.socials.officialWebsite;
const hotlines = hotlinesJson as HotlineRecord[];

/**
 * The order someone reaches for in an emergency, not alphabetical order.
 * Disaster response and police first, utilities last.
 */
const CATEGORY_ORDER: Record<string, number> = {
  disaster: 0,
  police: 1,
  fire: 2,
  medical: 3,
  coastguard: 4,
  utility: 5,
  other: 6,
};

/** Seconds per full pass. Slow enough to read a number as it goes by. */
const SECONDS_PER_ENTRY = 4;

function byUrgency(left: HotlineRecord, right: HotlineRecord): number {
  const leftRank = CATEGORY_ORDER[left.category ?? "other"] ?? 9;
  const rightRank = CATEGORY_ORDER[right.category ?? "other"] ?? 9;
  return leftRank - rightRank || left.service.localeCompare(right.service);
}

function dialable(number: string): string {
  return number.replace(/[^\d+]/g, "");
}

function HotlineEntry({ hotline }: { hotline: HotlineRecord }) {
  return (
    <li>
      <span className="hotline-bar__service">{hotline.service}</span>
      {hotline.numbers.map((number) => (
        // tel: works on the device most likely to be in someone's hand.
        <a key={number} className="hotline-bar__number" href={`tel:${dialable(number)}`}>
          {number}
        </a>
      ))}
    </li>
  );
}

export function HotlineBar() {
  const { t } = useTranslation("common");
  const ordered = [...hotlines].sort(byUrgency);

  if (ordered.length === 0) {
    return (
      <aside className="hotline-bar" data-testid="hotline-bar" role="status">
        <div className="hotline-bar__track">
          <span className="hotline-bar__label">{t("hotline.label")}</span>
          <span className="hotline-bar__message">{t("hotline.unavailable")}</span>
          <a href={officialWebsite} target="_blank" rel="noreferrer">
            {t("hotline.verifyOfficial")}
          </a>
        </div>
      </aside>
    );
  }

  const duration = `${ordered.length * SECONDS_PER_ENTRY}s`;

  return (
    <aside className="hotline-bar" data-testid="hotline-bar" role="status">
      <div className="hotline-bar__track">
        <span className="hotline-bar__label">{t("hotline.label")}</span>

        <div className="hotline-bar__viewport">
          <div className="hotline-bar__marquee" style={{ animationDuration: duration }}>
            <ul className="hotline-bar__list">
              {ordered.map((hotline) => (
                <HotlineEntry key={hotline.id} hotline={hotline} />
              ))}
            </ul>
            {/*
              A second copy makes the loop seamless: the animation translates by
              exactly half the track, so the duplicate is mid-screen at the moment
              the first copy runs out and there is never a visible gap.

              It is hidden from assistive technology and removed from the tab
              order — a screen reader announcing thirteen numbers twice, or a
              keyboard user tabbing through them twice, would be worse than the
              seam it exists to hide.
            */}
            <ul className="hotline-bar__list" aria-hidden="true">
              {ordered.map((hotline) => (
                <li key={`${hotline.id}-repeat`}>
                  <span className="hotline-bar__service">{hotline.service}</span>
                  {hotline.numbers.map((number) => (
                    <span key={number} className="hotline-bar__number" tabIndex={-1}>
                      {number}
                    </span>
                  ))}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </aside>
  );
}
