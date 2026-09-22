import { ErrorBoundary } from "../components/errors/ErrorBoundary";
import { AppRouter } from "../routes/router";

export function App() {
  return (
    <ErrorBoundary>
      <AppRouter />
    </ErrorBoundary>
  );
}
