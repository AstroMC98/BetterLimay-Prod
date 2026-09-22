import type { LguConfig } from "../../app/lguConfig";

export interface RouteMetadataInput {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
}

export interface RouteMetadata {
  title: string;
  description: string;
  canonical: string;
  openGraph: {
    title: string;
    description: string;
    url: string;
    siteName: string;
    type: "website" | "article";
  };
  jsonLd: Record<string, unknown>;
}

function normalizePath(path: string): string {
  if (!path || path === "/") return "/";

  return `/${path.replace(/^\/+/, "").replace(/\/+$/, "")}`;
}

function getCanonicalUrl(baseUrl: string, path: string): string {
  return new URL(normalizePath(path), baseUrl).toString();
}

export function createRouteMetadata(
  config: LguConfig,
  input: RouteMetadataInput,
): RouteMetadata {
  const title = `${input.title} | ${config.portal.name}`;
  const canonical = getCanonicalUrl(config.portal.baseUrl, input.path);
  const type = input.type ?? "website";

  return {
    title,
    description: input.description,
    canonical,
    openGraph: {
      title,
      description: input.description,
      url: canonical,
      siteName: config.portal.name,
      type,
    },
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: title,
      description: input.description,
      url: canonical,
      isPartOf: {
        "@type": "WebSite",
        name: config.portal.name,
        url: config.portal.baseUrl,
      },
    },
  };
}
