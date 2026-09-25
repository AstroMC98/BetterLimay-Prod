/**
 * The handful of line icons the home page and footer use. Inline SVG rather
 * than an icon package: the package in node_modules has no usable types here,
 * and these few paths cost less than an import.
 */

const base = {
  "aria-hidden": true,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  width: 22,
  height: 22,
} as const;

export function IconPeople() {
  return (
    <svg {...base}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6" />
    </svg>
  );
}

export function IconBuilding() {
  return (
    <svg {...base}>
      <path d="M3 21h18M5 21V7l7-4 7 4v14" />
      <path d="M9 21v-5h6v5M9 10h.01M15 10h.01" />
    </svg>
  );
}

export function IconMapPin() {
  return (
    <svg {...base}>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

export function IconLedger() {
  return (
    <svg {...base}>
      <path d="M4 20h16M6 20V10M10 20V10M14 20V10M18 20V10M3 8l9-5 9 5" />
    </svg>
  );
}

export function IconDocument() {
  return (
    <svg {...base}>
      <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8Z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </svg>
  );
}

export function IconRoad() {
  return (
    <svg {...base}>
      <path d="M8 3 4 21M16 3l4 18M12 5v2M12 11v2M12 17v2" />
    </svg>
  );
}

export function IconChart() {
  return (
    <svg {...base}>
      <path d="M3 3v18h18" />
      <path d="m7 15 4-4 3 3 6-7" />
    </svg>
  );
}

export function IconNews() {
  return (
    <svg {...base}>
      <path d="M4 5h13v14H6a2 2 0 0 1-2-2Z" />
      <path d="M17 9h3v8a2 2 0 0 1-2 2M8 9h5M8 13h5M8 16h3" />
    </svg>
  );
}

export function IconShield() {
  return (
    <svg {...base}>
      <path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function IconArrow() {
  return (
    <svg {...base} width={16} height={16}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function IconExternal() {
  return (
    <svg {...base} width={15} height={15}>
      <path d="M14 4h6v6M20 4 10 14M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  );
}

export function IconFacebook() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="currentColor"
    >
      <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H8v3h2.5V21Z" />
    </svg>
  );
}

export function IconGitHub() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="currentColor"
    >
      <path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.4 1.1 2.9.8.1-.7.4-1.1.6-1.3-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.8 1a9.5 9.5 0 0 1 5 0c1.9-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9V21c0 .3.2.6.7.5A10 10 0 0 0 12 2Z" />
    </svg>
  );
}
