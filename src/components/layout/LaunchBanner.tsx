import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

import { IconArrow, IconClose, IconLightbulb } from "../home/icons";
import {
  browserStorage,
  dismissLaunchBanner,
  shouldShowLaunchBanner,
} from "./launchBannerStorage";

/**
 * First-visit welcome: what BetterLimay is, that it grows as we go, and where to help.
 *
 * A native <dialog> opened with showModal() supplies the focus trap, Esc to close,
 * the backdrop and top-layer stacking without a dialog library.
 */
export function LaunchBanner() {
  const { t } = useTranslation("common");
  const { pathname } = useLocation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const initialPath = useRef(pathname);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || typeof dialog.showModal !== "function") return;
    if (shouldShowLaunchBanner(browserStorage(), initialPath.current)) dialog.showModal();
  }, []);

  function handleClose() {
    if (dontShowAgain) dismissLaunchBanner(browserStorage());
  }

  // Following a link to Contribute counts as having seen the banner.
  function leaveForContribute() {
    dismissLaunchBanner(browserStorage());
    dialogRef.current?.close();
  }

  // The panel fills the dialog, so a click whose target is the dialog itself hit the backdrop.
  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) dialogRef.current.close();
  }

  return (
    <dialog
      ref={dialogRef}
      className="launch-modal"
      aria-labelledby="launch-title"
      aria-describedby="launch-description"
      data-testid="launch-banner"
      onClose={handleClose}
      onClick={handleBackdropClick}
    >
      <div className="launch-modal__panel">
        <button
          type="button"
          className="launch-modal__close"
          aria-label={t("launch.close")}
          onClick={() => dialogRef.current?.close()}
        >
          <IconClose />
        </button>

        <header className="launch-modal__header">
          <img src="/brand/emblem-full-colour.svg" alt="" width="44" height="42" />
          <div>
            <h2 id="launch-title">{t("launch.title")}</h2>
            <p id="launch-description">{t("launch.description")}</p>
          </div>
        </header>

        <div className="launch-modal__body">
          <section>
            <h3>{t("launch.findTitle")}</h3>
            <p>{t("launch.findBody")}</p>
          </section>
          <section>
            <h3>
              {t("launch.buildingTitle")}{" "}
              <span className="launch-modal__pill">{t("launch.beta")}</span>
            </h3>
            <p>{t("launch.buildingBody")}</p>
          </section>
        </div>

        <div className="launch-modal__help">
          <span className="launch-modal__help-icon">
            <IconLightbulb />
          </span>
          <div>
            <p className="launch-modal__help-title">{t("launch.helpTitle")}</p>
            <p>{t("launch.helpBody")}</p>
            <Link
              className="text-link"
              to="/contribute#submit-data"
              onClick={leaveForContribute}
            >
              {t("launch.helpLink")} <IconArrow />
            </Link>
          </div>
        </div>

        <div className="launch-modal__actions">
          <label className="launch-modal__check">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(event) => setDontShowAgain(event.target.checked)}
            />
            {t("launch.dontShow")}
          </label>
          <span className="launch-modal__spacer" />
          <button
            type="button"
            className="button button--secondary"
            onClick={() => dialogRef.current?.close()}
          >
            {t("launch.explore")}
          </button>
          <Link
            className="button button--primary"
            to="/contribute"
            onClick={leaveForContribute}
          >
            {t("launch.contribute")} <IconArrow />
          </Link>
        </div>
      </div>
    </dialog>
  );
}
