import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import "../styles/tokens.css";
import { initializeI18n } from "../i18n";
import { loadLguConfig } from "./lguConfig";
import { registerPwaServiceWorker } from "../lib/ui/pwa";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("BetterLimay root element is missing.");
}

const mountNode = rootElement;

async function startApplication(): Promise<void> {
  try {
    await initializeI18n();
  } catch (error) {
    console.error("BetterLimay could not load the English locale.", error);
  }

  createRoot(mountNode).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );

  registerPwaServiceWorker(loadLguConfig());
}

void startApplication();
