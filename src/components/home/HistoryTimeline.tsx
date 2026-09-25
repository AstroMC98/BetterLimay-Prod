import { useTranslation } from "react-i18next";

import historyJson from "../../data/history.json";
import type { HistoryDocument } from "../../data/types";

const history = historyJson as HistoryDocument;

/**
 * Limay's history as a timeline in eras.
 *
 * Every event names the source it came from, and the section ends with a
 * credit line: the Provincial Government of Bataan, and Wikipedia under
 * CC BY-SA, whose facts are paraphrased here.
 */
export function HistoryTimeline() {
  const { t } = useTranslation("common");

  return (
    <section className="home-history" aria-labelledby="home-history-title">
      <div className="home-history__head">
        <p className="home-kicker">{t("home.history.eyebrow")}</p>
        <h2 id="home-history-title">{history.title}</h2>
        <p>{history.intro}</p>
      </div>

      <ol className="history-eras">
        {history.eras.map((era, index) => (
          <li key={era.id} className="history-era">
            <p className="history-era__label">
              {t("home.history.era", { number: index + 1 })}
            </p>
            <h3>{era.label}</h3>
            {era.summary ? <p className="history-era__summary">{era.summary}</p> : null}
            <ol className="history-events">
              {era.events.map((event) => (
                <li key={`${event.year}-${event.title}`} className="history-event">
                  <span className="history-event__year">{event.year}</span>
                  <div>
                    <h4>{event.title}</h4>
                    <p>{event.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ol>

      <ul className="history-highlights">
        {history.highlights.map((highlight) => (
          <li key={highlight.title}>
            <span className="history-highlights__label">{highlight.label}</span>
            <strong>{highlight.title}</strong>
            <span>{highlight.body}</span>
          </li>
        ))}
      </ul>

      <p className="history-credit">
        {t("home.history.sources")}{" "}
        <a href={history.sources.province.source_url} target="_blank" rel="noreferrer">
          {history.sources.province.source_name}
        </a>
        {"; "}
        <a href={history.sources.wikipedia.source_url} target="_blank" rel="noreferrer">
          {history.sources.wikipedia.source_name}
        </a>
        .
      </p>
    </section>
  );
}
