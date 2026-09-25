import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";

import facebookPagesJson from "../../data/facebook-pages.json";
import type { FacebookPageRecord } from "../../data/types";
import { pagePluginUrl } from "../../lib/ui/facebookFeed";
import { IconExternal, IconNews } from "./icons";

const pages = [...(facebookPagesJson as FacebookPageRecord[])].sort(
  (a, b) => a.order - b.order,
);

/**
 * "Latest from Limay": the official Facebook pages as tabs over one live feed.
 *
 * Only the selected page is loaded, so a visitor downloads one Facebook
 * timeline, not one per page. The pages themselves are edited in /admin.
 */
export function FacebookFeed() {
  const { t } = useTranslation("common");
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const panel = useRef<HTMLDivElement>(null);
  // Facebook's plugin brings ~500 kB of script. Start it when the feed is about
  // to scroll into view rather than with the page: still automatic, but a
  // visitor who never scrolls this far never downloads it.
  const [nearView, setNearView] = useState(
    () => typeof IntersectionObserver === "undefined",
  );
  useEffect(() => {
    if (nearView || !panel.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNearView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px 0px" },
    );
    observer.observe(panel.current);
    return () => observer.disconnect();
  }, [nearView]);
  const page = pages[active];
  if (!page) return null;

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const next = (active + step + pages.length) % pages.length;
    setActive(next);
    tabs.current[next]?.focus();
  }

  return (
    <section className="home-feed" aria-labelledby="home-feed-title">
      <div className="home-feed__copy">
        <span className="home-feed__icon">
          <IconNews />
        </span>
        <p className="home-kicker">{t("home.feed.eyebrow")}</p>
        <h2 id="home-feed-title">{t("home.feed.title")}</h2>
        <p>{t("home.feed.description")}</p>

        <div
          className="home-feed__tabs"
          role="tablist"
          aria-label={t("home.feed.tabsLabel")}
          onKeyDown={onKeyDown}
        >
          {pages.map((candidate, index) => (
            <button
              key={candidate.id}
              ref={(element) => {
                tabs.current[index] = element;
              }}
              type="button"
              role="tab"
              id={`feed-tab-${candidate.id}`}
              aria-selected={index === active}
              aria-controls="home-feed-panel"
              tabIndex={index === active ? 0 : -1}
              className="home-feed__tab"
              onClick={() => setActive(index)}
            >
              {candidate.name}
            </button>
          ))}
        </div>
        {page.description ? <p className="home-feed__about">{page.description}</p> : null}

        <a
          className="button button--secondary"
          href={page.url}
          target="_blank"
          rel="noreferrer"
        >
          {t("home.feed.viewOnFacebook")} <IconExternal />
        </a>
      </div>

      <div
        className="home-feed__panel"
        id="home-feed-panel"
        ref={panel}
        role="tabpanel"
        aria-labelledby={`feed-tab-${page.id}`}
      >
        {nearView ? (
          <iframe
            key={page.id}
            title={t("home.feed.iframeTitle", { page: page.name })}
            src={pagePluginUrl(page.url)}
            width="500"
            height="640"
            loading="lazy"
            allow="encrypted-media; picture-in-picture; web-share"
          />
        ) : (
          <div className="home-feed__placeholder" aria-hidden="true" />
        )}
        <p className="home-feed__fallback">
          {t("home.feed.fallback")}{" "}
          <a href={page.url} target="_blank" rel="noreferrer">
            {t("home.feed.openDirectly")}
          </a>
        </p>
      </div>
    </section>
  );
}
