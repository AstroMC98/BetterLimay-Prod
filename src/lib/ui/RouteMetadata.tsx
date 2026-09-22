import { useEffect, useMemo } from "react";

import type { LguConfig } from "../../app/lguConfig";
import { createRouteMetadata } from "./metadata";

interface RouteMetadataProps {
  config: LguConfig;
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
}

function setMetaElement(
  attribute: "name" | "property",
  key: string,
  content: string,
): void {
  const selector = `meta[${attribute}="${key}"]`;
  let element = document.head.querySelector<HTMLMetaElement>(selector);

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }

  element.content = content;
}

function setCanonicalLink(href: string): void {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }

  link.href = href;
}

function setJsonLd(jsonLd: Record<string, unknown>): void {
  let script = document.head.querySelector<HTMLScriptElement>(
    "script#betterlimay-route-jsonld",
  );

  if (!script) {
    script = document.createElement("script");
    script.id = "betterlimay-route-jsonld";
    script.type = "application/ld+json";
    document.head.appendChild(script);
  }

  script.textContent = JSON.stringify(jsonLd);
}

export function RouteMetadata({
  config,
  title,
  description,
  path,
  type,
}: RouteMetadataProps) {
  const metadata = useMemo(
    () => createRouteMetadata(config, { title, description, path, type }),
    [config, description, path, title, type],
  );

  useEffect(() => {
    document.title = metadata.title;
    setMetaElement("name", "description", metadata.description);
    setMetaElement("property", "og:title", metadata.openGraph.title);
    setMetaElement("property", "og:description", metadata.openGraph.description);
    setMetaElement("property", "og:url", metadata.openGraph.url);
    setMetaElement("property", "og:site_name", metadata.openGraph.siteName);
    setMetaElement("property", "og:type", metadata.openGraph.type);
    setCanonicalLink(metadata.canonical);
    setJsonLd(metadata.jsonLd);
  }, [metadata]);

  return null;
}
