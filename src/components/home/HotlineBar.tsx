import { useTranslation } from "react-i18next";

import { loadLguConfig } from "../../app/lguConfig";

const officialWebsite = loadLguConfig().portal.socials.officialWebsite;

export function HotlineBar() {
  const { t } = useTranslation("common");

  return (
    <aside className="hotline-bar" data-testid="hotline-bar" role="status">
      <div className="hotline-bar__track">
        <span className="hotline-bar__label">{t("hotline.label")}</span>
        <span className="hotline-bar__message">{t("hotline.unavailable")}</span>
        <a href={officialWebsite} target="_blank" rel="noreferrer">
          {t("hotline.verifyOfficial")}
        </a>
      </div>
    </aside>
  );
}
