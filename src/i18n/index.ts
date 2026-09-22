import i18next, { type i18n as I18nInstance } from "i18next";
import { initReactI18next } from "react-i18next";

export const SUPPORTED_LOCALES = ["en", "fil"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

const DEFAULT_LOCALE: Locale = "en";
const LOCALE_STORAGE_KEY = "betterlimay.locale";

type LocaleResource = Record<string, unknown>;

export function resolveLocale(language: string | null | undefined): Locale {
  const baseLanguage = language?.toLowerCase().split("-")[0];
  return SUPPORTED_LOCALES.includes(baseLanguage as Locale)
    ? (baseLanguage as Locale)
    : DEFAULT_LOCALE;
}

export function getInitialLocale(): Locale {
  if (typeof window === "undefined") {
    return DEFAULT_LOCALE;
  }

  const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  return resolveLocale(storedLocale ?? window.navigator.language);
}

async function fetchLocale(locale: Locale): Promise<LocaleResource> {
  const response = await fetch(`/locales/${locale}/common.json`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Could not load the ${locale} locale resource.`);
  }

  return (await response.json()) as LocaleResource;
}

function syncDocumentLanguage(locale: Locale): void {
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale;
  }
}

export async function initializeI18n(
  instance: I18nInstance = i18next,
): Promise<I18nInstance> {
  const english = await fetchLocale("en");
  let filipino = english;

  try {
    filipino = await fetchLocale("fil");
  } catch (error) {
    console.warn("Filipino locale unavailable; using English fallback.", error);
  }

  await instance.use(initReactI18next).init({
    defaultNS: "common",
    fallbackLng: DEFAULT_LOCALE,
    interpolation: { escapeValue: false },
    lng: getInitialLocale(),
    ns: ["common"],
    resources: {
      en: { common: english },
      fil: { common: filipino },
    },
    returnNull: false,
  });

  syncDocumentLanguage(resolveLocale(instance.language));
  return instance;
}

export async function setLocale(
  locale: Locale,
  instance: I18nInstance = i18next,
): Promise<void> {
  await instance.changeLanguage(locale);
  window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  syncDocumentLanguage(locale);
}

export { i18next as i18n };
