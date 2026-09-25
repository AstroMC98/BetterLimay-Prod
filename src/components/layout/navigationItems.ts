import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpenCheck,
  Building2,
  FileSignature,
  FileText,
  HandHeart,
  HardHat,
  HeartPulse,
  Home,
  Info,
  LandPlot,
  Landmark,
  LayoutGrid,
  MapPin,
  MessageSquareWarning,
  Newspaper,
  Receipt,
  Scale,
  Store,
  Upload,
  Users,
  Vote,
  Waves,
} from "lucide-react";

/**
 * The top navigation, as data.
 *
 * Each item names an i18n key under `nav.items` (with `.label` and `.desc`), a
 * route and an icon. `sections` decides which trigger is highlighted for the
 * current URL. A unit test checks every `to` resolves to a real route.
 */

export interface NavItem {
  key: string;
  to: string;
  icon: LucideIcon;
}

export interface NavGroup {
  key: string;
  /** Path prefixes that mark this group as the current section. */
  sections: string[];
  items: NavItem[];
  /** Plain links shown beside the main items. */
  more?: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    key: "services",
    sections: ["/services"],
    items: [
      { key: "allServices", to: "/services", icon: LayoutGrid },
      { key: "civilRegistry", to: "/services/civil-registry", icon: FileText },
      { key: "businessPermits", to: "/services/business-permits", icon: Store },
      { key: "realProperty", to: "/services/real-property-tax", icon: LandPlot },
      { key: "health", to: "/services/health", icon: HeartPulse },
      { key: "socialWelfare", to: "/services/social-welfare", icon: HandHeart },
    ],
  },
  {
    key: "government",
    sections: [
      "/government",
      "/elected-officials",
      "/executive",
      "/departments",
      "/barangays",
      "/legislation",
    ],
    items: [
      { key: "governmentOverview", to: "/government", icon: Landmark },
      { key: "electedOfficials", to: "/elected-officials", icon: Users },
      { key: "offices", to: "/departments", icon: Building2 },
      { key: "barangays", to: "/barangays", icon: MapPin },
      { key: "legislation", to: "/legislation", icon: Scale },
    ],
    more: [
      {
        key: "electionResults",
        to: "/elected-officials#election-results-title",
        icon: Vote,
      },
      {
        key: "contactMunicipality",
        to: "/government#municipal-contact-title",
        icon: Building2,
      },
    ],
  },
  {
    key: "data",
    sections: ["/transparency", "/statistics"],
    items: [
      { key: "transparency", to: "/transparency", icon: Receipt },
      {
        key: "auditedFinances",
        to: "/transparency#transparency-chart-financial-statement",
        icon: BookOpenCheck,
      },
      {
        key: "procurement",
        to: "/transparency#transparency-chart-procurement",
        icon: FileSignature,
      },
      {
        key: "infrastructure",
        to: "/transparency#transparency-chart-infrastructure",
        icon: HardHat,
      },
      { key: "statistics", to: "/statistics", icon: BarChart3 },
      { key: "floodMap", to: "/statistics#hazards", icon: Waves },
    ],
  },
  {
    key: "about",
    sections: [
      "/about",
      "/contribute",
      "/report",
      "/privacy",
      "/terms",
      "/accessibility",
      "/faq",
      "/sitemap",
      "/legal",
    ],
    items: [
      { key: "about", to: "/about", icon: Info },
      { key: "submitData", to: "/contribute#submit-data", icon: Upload },
      { key: "report", to: "/report", icon: MessageSquareWarning },
    ],
    more: [
      { key: "privacy", to: "/privacy", icon: FileText },
      { key: "terms", to: "/terms", icon: FileText },
      { key: "accessibility", to: "/accessibility", icon: FileText },
      { key: "faq", to: "/faq", icon: FileText },
      { key: "sitemap", to: "/sitemap", icon: FileText },
    ],
  },
];

/** News has no panel: it is a plain link in the bar. */
export const NAV_NEWS = {
  key: "news",
  to: "/news",
  icon: Newspaper,
  sections: ["/news"],
} as const;

/** Home is the logo on desktop; the phone menu lists it explicitly. */
export const NAV_HOME: NavItem = { key: "home", to: "/", icon: Home };

/** Which top-level entry the current path belongs to, if any. */
export function activeSection(pathname: string): string | null {
  const matches = (prefix: string) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`);
  if (NAV_NEWS.sections.some(matches)) return NAV_NEWS.key;
  return NAV_GROUPS.find((group) => group.sections.some(matches))?.key ?? null;
}
