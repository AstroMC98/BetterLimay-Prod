import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import officesJson from "../../data/offices.json";
import officialsJson from "../../data/officials.json";
import legislationJson from "../../data/legislation.json";
import servicesJson from "../../data/services.json";
import type {
  LegislationRecord,
  OfficeRecord,
  OfficialRecord,
  ServiceRecord,
} from "../../data/types";
import { ProvenanceStatusBadge } from "../provenance/Provenance";
import { createSearchProvider, type SearchDocument } from "../../lib/ui/search";

const searchProvider = createSearchProvider({
  services: servicesJson as ServiceRecord[],
  offices: officesJson as OfficeRecord[],
  officials: officialsJson as OfficialRecord[],
  legislation: legislationJson as LegislationRecord[],
});

interface GlobalSearchProps {
  initialQuery?: string;
  autoFocus?: boolean;
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  const normalizedText = text.toLocaleLowerCase();
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const start = normalizedText.indexOf(normalizedQuery);

  if (start < 0 || !normalizedQuery) return <>{text}</>;

  return (
    <>
      {text.slice(0, start)}
      <mark>{text.slice(start, start + normalizedQuery.length)}</mark>
      {text.slice(start + normalizedQuery.length)}
    </>
  );
}

function ResultItem({
  result,
  query,
  index,
  active,
  onSelect,
}: {
  result: { item: SearchDocument };
  query: string;
  index: number;
  active: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation("common");
  const item = result.item;

  return (
    <button
      id={`search-result-${index}`}
      className={`search-result${active ? "search-result--active" : ""}`}
      type="button"
      role="option"
      aria-selected={active}
      onClick={onSelect}
    >
      <span className="search-result__type">{t(`search.resultTypes.${item.kind}`)}</span>
      <strong>
        <HighlightedText text={item.title} query={query} />
      </strong>
      {item.summary ? <span>{item.summary}</span> : null}
      <ProvenanceStatusBadge
        provenance={{
          source_url: item.sourceUrl,
          source_name: item.sourceName,
          retrieved_at: item.retrievedAt,
          verified: item.verified,
        }}
      />
    </button>
  );
}

export function GlobalSearch({
  initialQuery = "",
  autoFocus = false,
}: GlobalSearchProps) {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const inputId = useId();
  const resultsId = useId();
  const [query, setQuery] = useState(initialQuery);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(Boolean(initialQuery));
  const results = query.trim().length >= 2 ? searchProvider.search(query) : [];

  useEffect(() => {
    setQuery(initialQuery);
    setOpen(Boolean(initialQuery));
  }, [initialQuery]);

  function goToResult(item: SearchDocument) {
    setOpen(false);
    navigate(item.path);
  }

  function submitSearch() {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return;

    navigate(`/search?q=${encodeURIComponent(normalizedQuery)}`);
    setOpen(true);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && results.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp" && results.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index <= 0 ? results.length - 1 : index - 1));
    } else if (event.key === "Enter") {
      if (open && activeIndex >= 0 && results[activeIndex]) {
        event.preventDefault();
        goToResult(results[activeIndex].item);
      } else {
        event.preventDefault();
        submitSearch();
      }
    } else if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div className="global-search" data-testid="global-search">
      <form
        className="global-search__form"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          submitSearch();
        }}
      >
        <label htmlFor={inputId}>{t("search.label")}</label>
        <div className="global-search__controls">
          <input
            id={inputId}
            type="search"
            value={query}
            placeholder={t("search.placeholder")}
            autoFocus={autoFocus}
            role="combobox"
            aria-autocomplete="list"
            aria-controls={resultsId}
            aria-expanded={open && results.length > 0}
            aria-activedescendant={
              activeIndex >= 0 ? `search-result-${activeIndex}` : undefined
            }
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
              setActiveIndex(-1);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
          />
          <button className="button button--primary" type="submit">
            {t("search.submit")}
          </button>
        </div>
      </form>

      {query.trim().length === 1 ? (
        <p className="global-search__hint" role="status">
          {t("search.minChars")}
        </p>
      ) : null}
      {open && query.trim().length >= 2 ? (
        <div
          id={resultsId}
          className="search-results"
          role="listbox"
          aria-label={t("search.results")}
          data-testid="global-search-results"
        >
          <p className="eyebrow">{t("search.results")}</p>
          {results.length > 0 ? (
            results.map((result, index) => (
              <ResultItem
                key={`${result.item.kind}-${result.item.id}`}
                result={result}
                query={query}
                index={index}
                active={index === activeIndex}
                onSelect={() => goToResult(result.item)}
              />
            ))
          ) : (
            <p className="global-search__empty" role="status">
              {t("search.noResults")}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
