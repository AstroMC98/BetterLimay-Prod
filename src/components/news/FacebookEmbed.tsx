import { useState } from "react";
import { useTranslation } from "react-i18next";

import { facebookEmbedKind, facebookEmbedUrl } from "../../lib/ui/facebook";

/**
 * A Facebook post or live video, loaded only when the reader asks for it.
 *
 * Until the button is pressed nothing is requested from Facebook, so a reader
 * who never presses it is never tracked by it. The plain link beside it works
 * whether or not the embed does.
 */
export function FacebookEmbed({ url }: { url: string }) {
  const { t } = useTranslation("common");
  const [loaded, setLoaded] = useState(false);
  const src = facebookEmbedUrl(url);
  if (!src) return null;
  const kind = facebookEmbedKind(url);

  return (
    <figure
      className={`facebook-embed facebook-embed--${kind}`}
      data-testid="facebook-embed"
    >
      {loaded ? (
        <iframe
          src={src}
          title={t(
            kind === "video" ? "news.facebook.videoTitle" : "news.facebook.postTitle",
          )}
          loading="lazy"
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : (
        <div className="facebook-embed__placeholder">
          <button
            type="button"
            className="button button--primary"
            onClick={() => setLoaded(true)}
          >
            {t(kind === "video" ? "news.facebook.watch" : "news.facebook.show")}
          </button>
          <p>{t("news.facebook.privacy")}</p>
        </div>
      )}
      <figcaption>
        <a href={url} target="_blank" rel="noreferrer">
          {t("news.facebook.open")}
        </a>
      </figcaption>
    </figure>
  );
}
