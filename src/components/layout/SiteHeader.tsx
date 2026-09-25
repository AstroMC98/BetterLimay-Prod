import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
} from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Link, NavLink, useLocation } from "react-router-dom";

import { loadLguConfig } from "@/app/lguConfig";
import { createPortalIdentity } from "@/app/portalIdentity";
import { Button } from "@/components/ui/button";
import { MenuToggleIcon } from "@/components/ui/menu-toggle-icon";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

import { LanguageSwitcher } from "./LanguageSwitcher";
import {
  NAV_GROUPS,
  NAV_HOME,
  NAV_NEWS,
  activeSection,
  type NavItem,
} from "./navigationItems";
import { ThemeToggle } from "./ThemeToggle";

const portalIdentity = createPortalIdentity(loadLguConfig());

/* The brand guide sets the wordmark in Montserrat with "Better" in Medium and the
   place name in ExtraBold. Every BetterGov chapter follows the same Better+place
   pattern, so a fork gets the correct lockup without extra configuration. */
const BRAND_PREFIX = "Better";
const portalNameParts = portalIdentity.portalName.startsWith(BRAND_PREFIX)
  ? [BRAND_PREFIX, portalIdentity.portalName.slice(BRAND_PREFIX.length)]
  : [portalIdentity.portalName, ""];

/** One menu entry: icon tile, title, one-line description (header-3's ListItem). */
function ItemLink({
  item,
  compact = false,
  ...linkProps
}: {
  item: NavItem;
  compact?: boolean;
} & Omit<ComponentPropsWithRef<"a">, "href" | "children">) {
  const { t } = useTranslation("common");
  const Icon = item.icon;
  // linkProps carries Radix's ref, focus handlers and onClick when this sits
  // inside NavigationMenuLink asChild, or the phone menu's close handler.
  return (
    <Link {...linkProps} to={item.to} className="nav-item">
      <span className="nav-item__icon">
        <Icon aria-hidden="true" />
      </span>
      <span className="nav-item__text">
        <span className="nav-item__title">{t(`nav.items.${item.key}.label`)}</span>
        {compact ? null : (
          <span className="nav-item__desc">{t(`nav.items.${item.key}.desc`)}</span>
        )}
      </span>
    </Link>
  );
}

function DesktopNavigation({ current }: { current: string | null }) {
  const { t } = useTranslation("common");

  // Visibility is set with utilities because the Radix root carries `flex`, which
  // outranks the components layer. The breakpoint matches the 64rem phone rules.
  return (
    <NavigationMenu
      className="nav-desktop hidden min-[64.0625rem]:flex"
      aria-label={t("accessibility.mainNavigation")}
    >
      <NavigationMenuList>
        {NAV_GROUPS.map((group) => (
          <NavigationMenuItem key={group.key}>
            <NavigationMenuTrigger
              className="nav-trigger"
              data-current={current === group.key || undefined}
            >
              {t(`nav.groups.${group.key}`)}
            </NavigationMenuTrigger>
            {/* w-max: Radix sizes the viewport from the panel, so the panel must set its own width. */}
            <NavigationMenuContent className="nav-panel md:w-max">
              <div
                className={cn(
                  "nav-panel__grid",
                  group.more && "nav-panel__grid--with-more",
                )}
              >
                <ul className="nav-panel__main">
                  {group.items.map((item) => (
                    <li key={item.key}>
                      {/* Radix's Link closes the panel on selection and joins its arrow-key group. */}
                      <NavigationMenuLink asChild>
                        <ItemLink item={item} />
                      </NavigationMenuLink>
                    </li>
                  ))}
                </ul>
                {group.more ? (
                  <ul className="nav-panel__more">
                    {group.more.map((item) => {
                      const Icon = item.icon;
                      return (
                        <li key={item.key}>
                          <NavigationMenuLink asChild>
                            <Link to={item.to} className="nav-more-link">
                              <Icon aria-hidden="true" />
                              {t(`nav.items.${item.key}.label`)}
                            </Link>
                          </NavigationMenuLink>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
              {group.key === "services" ? (
                <p className="nav-panel__footnote">
                  {t("nav.servicesFootnote")}{" "}
                  <NavigationMenuLink asChild>
                    <Link to="/report">{t("nav.items.report.label")}</Link>
                  </NavigationMenuLink>
                </p>
              ) : null}
            </NavigationMenuContent>
          </NavigationMenuItem>
        ))}
        <NavigationMenuItem>
          <NavigationMenuLink asChild>
            <NavLink
              to={NAV_NEWS.to}
              className="nav-trigger nav-trigger--link"
              data-current={current === NAV_NEWS.key || undefined}
            >
              {t(`nav.groups.${NAV_NEWS.key}`)}
            </NavLink>
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

/**
 * The phone menu: fills the screen below the navy bar (header-3's MobileMenu).
 *
 * Keeps the behaviour the old menu had: the page behind cannot scroll, Tab
 * cycles through the menu and its close button, Escape closes it and returns
 * focus to the button, and following a link closes it. It is a disclosure
 * rather than a modal dialog, so the close button outside it stays reachable
 * for screen readers.
 */
function MobileMenu({
  open,
  onClose,
  toggleRef,
}: {
  open: boolean;
  onClose: () => void;
  toggleRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const { t } = useTranslation("common");
  const panel = useRef<HTMLElement>(null);
  const [top, setTop] = useState(0);

  useEffect(() => {
    if (!open) return;
    // Only the hotline bar is sticky, so the navy bar can sit anywhere on
    // screen. The page is locked while the menu is open, so one measurement holds.
    const bar = toggleRef.current?.closest(".portal-nav");
    setTop(Math.max(0, bar?.getBoundingClientRect().bottom ?? 0));

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLElement>("a")?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        toggleRef.current?.focus();
        return;
      }
      if (event.key !== "Tab" || !panel.current) return;
      const cycle = [
        toggleRef.current,
        ...panel.current.querySelectorAll<HTMLElement>("a"),
      ].filter((element): element is HTMLElement => element !== null);
      const index = cycle.indexOf(document.activeElement as HTMLElement);
      const step = event.shiftKey ? -1 : 1;
      event.preventDefault();
      cycle[(index + step + cycle.length) % cycle.length]?.focus();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, toggleRef]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      id="mobile-menu"
      className="mobile-menu"
      data-testid="mobile-menu"
      style={{ top }}
    >
      <nav
        ref={panel}
        className="mobile-menu__panel"
        aria-label={t("accessibility.mainNavigation")}
      >
        <ul className="mobile-menu__list mobile-menu__list--compact">
          <li>
            <ItemLink item={NAV_HOME} onClick={onClose} compact />
          </li>
          <li>
            <ItemLink item={NAV_NEWS} onClick={onClose} compact />
          </li>
        </ul>
        {NAV_GROUPS.map((group) => (
          <section
            key={group.key}
            className="mobile-menu__group"
            aria-labelledby={`mobile-group-${group.key}`}
          >
            <h2 id={`mobile-group-${group.key}`}>{t(`nav.groups.${group.key}`)}</h2>
            <ul className="mobile-menu__list">
              {group.items.map((item) => (
                <li key={item.key}>
                  <ItemLink item={item} onClick={onClose} />
                </li>
              ))}
            </ul>
          </section>
        ))}
        <div className="mobile-menu__actions">
          <Button asChild variant="outline" size="lg">
            <Link to="/contribute#submit-data" onClick={onClose}>
              {t("nav.actions.submitData")}
            </Link>
          </Button>
          <Button asChild size="lg">
            <Link to="/report" onClick={onClose}>
              {t("nav.actions.report")}
            </Link>
          </Button>
        </div>
      </nav>
    </div>,
    document.body,
  );
}

/**
 * Site header: the white brand row with the main actions, over the navy bar of
 * dropdown menus (adapted from shadcn's header-3). On phones the bar becomes a
 * single menu button that opens a full-screen menu.
 */
export function SiteHeader() {
  const { t } = useTranslation("common");
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const current = activeSection(pathname);

  // Stable, so the menu's focus and scroll-lock effect does not re-run on
  // every render and pull focus back to the first link.
  const closeMenu = useCallback(() => setOpen(false), []);

  // Any navigation closes the phone menu, including the browser's back button.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="portal-header">
      <div className="portal-header__inner">
        <Link className="portal-mark" to="/" aria-label={portalIdentity.portalName}>
          <img
            className="portal-mark__emblem"
            src="/brand/emblem-full-colour.svg"
            alt=""
            width="54"
            height="52"
          />
          <span className="portal-mark__text">
            <span className="portal-mark__name">
              {portalNameParts[0]}
              <b>{portalNameParts[1]}</b>
            </span>
            <span className="portal-mark__place">
              {t("header.placeLine", { lgu: portalIdentity.lguFullName })}
            </span>
          </span>
        </Link>
        <div className="portal-header__actions">
          <div className="portal-header__cta">
            {/* h-12 matches the 3rem touch target of the theme and language controls. */}
            <Button asChild variant="outline" className="h-12">
              <Link to="/contribute#submit-data">{t("nav.actions.submitData")}</Link>
            </Button>
            <Button asChild className="h-12">
              <Link to="/report">{t("nav.actions.report")}</Link>
            </Button>
          </div>
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
      </div>
      <div className="portal-nav">
        <div className="portal-nav__inner">
          <DesktopNavigation current={current} />
          <button
            ref={toggleRef}
            type="button"
            className="nav-mobile-toggle"
            data-testid="navigation-menu-toggle"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((value) => !value)}
          >
            <MenuToggleIcon open={open} className="size-5" duration={300} />
            <span>{open ? t("navigation.closeMenu") : t("navigation.openMenu")}</span>
          </button>
        </div>
      </div>
      <MobileMenu open={open} onClose={closeMenu} toggleRef={toggleRef} />
    </header>
  );
}
