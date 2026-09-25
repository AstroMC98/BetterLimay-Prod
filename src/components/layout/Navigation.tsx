import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";

const NAVIGATION_ITEMS = [
  { key: "home", to: "/" },
  { key: "services", to: "/services" },
  { key: "government", to: "/government" },
  { key: "legislation", to: "/legislation" },
  { key: "transparency", to: "/transparency" },
  { key: "statistics", to: "/statistics" },
  { key: "news", to: "/news" },
  { key: "report", to: "/report" },
  { key: "contribute", to: "/contribute" },
  { key: "about", to: "/about" },
] as const;

export function Navigation() {
  const { t } = useTranslation("common");
  const [isOpen, setIsOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const navigationRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const navigation = navigationRef.current;
    const firstLink = navigation?.querySelector<HTMLAnchorElement>("a");
    firstLink?.focus();

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setIsOpen(false);
        menuButtonRef.current?.focus();
        return;
      }

      if (event.key !== "Tab" || !navigation) return;

      const focusable = Array.from(
        navigation.querySelectorAll<HTMLElement>("a, button, select"),
      ).filter((element) => !element.hasAttribute("disabled"));
      const first = focusable[0];
      const last = focusable.at(-1);

      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function handlePointerDown(event: PointerEvent): void {
      if (!navigation) return;
      if (event.target instanceof Node && navigation.contains(event.target)) return;
      setIsOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  function closeMenu(): void {
    setIsOpen(false);
  }

  return (
    <nav
      ref={navigationRef}
      className={["primary-navigation", isOpen && "primary-navigation--open"]
        .filter(Boolean)
        .join(" ")}
      aria-label={t("accessibility.mainNavigation")}
    >
      <button
        ref={menuButtonRef}
        className="primary-navigation__toggle"
        data-testid="navigation-menu-toggle"
        type="button"
        aria-controls="primary-navigation-links"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? t("navigation.closeMenu") : t("navigation.openMenu")}
      </button>
      <div id="primary-navigation-links" className="primary-navigation__links">
        {NAVIGATION_ITEMS.map((item) => (
          <NavLink
            key={item.key}
            className={({ isActive }) =>
              isActive
                ? "primary-navigation__link primary-navigation__link--active"
                : "primary-navigation__link"
            }
            to={item.to}
            onClick={closeMenu}
          >
            {t(`navigation.${item.key}`)}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
