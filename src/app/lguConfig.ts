import configJson from "../../config/lgu.config.json";

export interface LguConfig {
  lgu: {
    name: string;
    fullName: string;
    type: string;
    province: string;
    region: string;
    regionCode: string;
    officialWebsite: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    barangayCount: number;
  };
  portal: {
    name: string;
    baseUrl: string;
    tagline: string;
    socials: {
      officialWebsite: string;
      officialFacebook: string;
      sourceCode: string;
      betterGovDirectory: string;
      /** Optional volunteer chat invite. The About page hides its Discord buttons without it. */
      communityDiscord?: string;
    };
    contactEmail: string | null;
    brandColor: string;
  };
  features: {
    legislation: boolean;
    transparency: boolean;
    statistics: boolean;
    weather: boolean;
    reports: boolean;
    pwa: boolean;
    exchangeRate: boolean;
  };
}

const validatedConfig = configJson satisfies LguConfig;

export function loadLguConfig(): LguConfig {
  return validatedConfig;
}
