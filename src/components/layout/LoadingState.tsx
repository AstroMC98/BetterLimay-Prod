interface LoadingStateProps {
  label: string;
}

export function LoadingState({ label }: LoadingStateProps) {
  return (
    <div className="loading-state" aria-live="polite" aria-busy="true">
      <span className="loading-mark" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
