/**
 * Footer link columns. Internal links are routes; external ones open in a new
 * tab. Labels are i18n keys so the footer follows the language switch.
 */

export interface FooterLink {
  /** i18n key under `footer.links`. */
  label: string;
  href: string;
  external?: boolean;
}

export interface FooterColumn {
  /** i18n key under `footer.columns`. */
  title: string;
  links: FooterLink[];
}

export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: "services",
    links: [
      { label: "allServices", href: "/services" },
      { label: "civilRegistry", href: "/services/civil-registry" },
      { label: "businessPermits", href: "/services/business-permits" },
      { label: "health", href: "/services/health" },
      { label: "socialWelfare", href: "/services/social-welfare" },
    ],
  },
  {
    title: "government",
    links: [
      { label: "electedOfficials", href: "/elected-officials" },
      { label: "offices", href: "/departments" },
      { label: "barangays", href: "/barangays" },
      { label: "transparency", href: "/transparency" },
      { label: "statistics", href: "/statistics" },
    ],
  },
  {
    title: "network",
    links: [
      {
        label: "transparencyPortal",
        href: "https://transparency.bettergov.ph/",
        external: true,
      },
      { label: "openData", href: "https://data.bettergov.ph/", external: true },
      { label: "petitions", href: "https://petition.ph/", external: true },
      { label: "saln", href: "https://saln.bettergov.ph/", external: true },
      { label: "budget", href: "https://budget.bettergov.ph/", external: true },
      { label: "philgeps", href: "https://philgeps.bettergov.ph/", external: true },
    ],
  },
  {
    title: "resources",
    links: [
      { label: "officialWebsite", href: "https://limaybataan.ph/", external: true },
      { label: "province", href: "https://bataan.gov.ph/", external: true },
      { label: "foi", href: "https://www.foi.gov.ph/", external: true },
      { label: "report", href: "/report" },
      { label: "submitData", href: "/contribute#submit-data" },
      { label: "editor", href: "/admin", external: true },
    ],
  },
];
