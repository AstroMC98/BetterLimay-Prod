import type { LguConfig } from "./lguConfig";

export interface PortalIdentity {
  portalName: string;
  lguFullName: string;
  tagline: string;
  brandColor: string;
  baseUrl: string;
  socials: LguConfig["portal"]["socials"];
  featureFlags: LguConfig["features"];
}

export function createPortalIdentity(config: LguConfig): PortalIdentity {
  return {
    portalName: config.portal.name,
    lguFullName: config.lgu.fullName,
    tagline: config.portal.tagline,
    brandColor: config.portal.brandColor,
    baseUrl: config.portal.baseUrl,
    socials: config.portal.socials,
    featureFlags: config.features,
  };
}
