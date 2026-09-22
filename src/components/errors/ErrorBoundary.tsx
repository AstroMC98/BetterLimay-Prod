import { Component, type ErrorInfo, type ReactNode } from "react";

import { i18n } from "../../i18n";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("BetterLimay application error", error, errorInfo);
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main className="error-state" role="alert">
          <p className="eyebrow">{i18n.t("errors.eyebrow")}</p>
          <h1>{i18n.t("errors.title")}</h1>
          <p>{i18n.t("errors.description")}</p>
          <button type="button" onClick={() => window.location.reload()}>
            {i18n.t("errors.reload")}
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}
