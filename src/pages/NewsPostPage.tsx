import { useTranslation } from "react-i18next";
import Markdown from "react-markdown";
import { Link, useLocation, useParams } from "react-router-dom";

import { loadLguConfig } from "../app/lguConfig";
import { FacebookEmbed } from "../components/news/FacebookEmbed";
import { ProvenanceDetails } from "../components/provenance/Provenance";
import announcementsJson from "../data/announcements.json";
import type { AnnouncementRecord } from "../data/types";
import { formatNewsDate } from "../lib/ui/newsDate";
import { RouteMetadata } from "../lib/ui/RouteMetadata";
import { NotFoundPage } from "./PortalStatusPages";

const config = loadLguConfig();
const announcements = announcementsJson as AnnouncementRecord[];

/**
 * One news post written in the content editor.
 *
 * Loaded as its own chunk: the Markdown renderer is only needed here, and the
 * entry bundle has a CI-enforced budget.
 *
 * react-markdown does not render raw HTML, so a post can format text and embed
 * images but cannot inject markup or scripts, whoever wrote it.
 */
export function NewsPostPage() {
  const { t } = useTranslation("common");
  const location = useLocation();
  const { id } = useParams();
  const post = announcements.find((announcement) => announcement.id === id);

  // A post page exists for anything readable here: written text or an embed.
  if (!post || !(post.body || post.facebookUrl)) {
    return <NotFoundPage />;
  }

  return (
    <article className="foundation-page news-post" data-testid="news-post-page">
      <RouteMetadata
        config={config}
        title={post.title}
        description={post.summary ?? post.title}
        path={location.pathname}
        type="article"
      />
      <Link className="text-link service-breadcrumb" to="/news">
        {t("news.backToNews")}
      </Link>
      <p className="news-card__date">
        {post.category === "project" ? (
          <span className="news-card__tag news-card__tag--project">
            {t("news.projectTag")}
          </span>
        ) : null}
        <time dateTime={post.publishedAt}>{formatNewsDate(post.publishedAt)}</time>
        {" · "}
        {post.sourceName}
      </p>
      <h1>{post.title}</h1>
      {post.image ? (
        <img className="news-post__image" src={post.image} alt={post.imageAlt ?? ""} />
      ) : null}
      {post.facebookUrl ? <FacebookEmbed url={post.facebookUrl} /> : null}
      {post.body ? (
        <div className="news-post__body">
          <Markdown
            components={{
              // Links in a post leave the site; images stay lazy so a long post
              // does not download every picture up front.
              // Links to this site stay in the app; everything else opens
              // in a new tab so the reader keeps their place in the post.
              a: ({ href, children }) =>
                href?.startsWith("/") ? (
                  <Link to={href}>{children}</Link>
                ) : (
                  <a href={href} target="_blank" rel="noreferrer">
                    {children}
                  </a>
                ),
              img: ({ src, alt }) => <img src={src} alt={alt ?? ""} loading="lazy" />,
            }}
          >
            {post.body}
          </Markdown>
        </div>
      ) : null}
      {post.url ? (
        <p>
          <a href={post.url} target="_blank" rel="noreferrer">
            {t("news.openSource")}
          </a>
        </p>
      ) : null}
      <ProvenanceDetails provenance={post.provenance} />
    </article>
  );
}
