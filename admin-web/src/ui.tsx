import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "dark" | "outline" | "danger";
  busy?: boolean;
};

export function Button({ variant = "primary", busy, disabled, children, className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={`btn btn-${variant} ${className ?? ""}`}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...props}
    >
      {busy ? <span className="spinner" aria-hidden /> : null}
      <span>{children}</span>
    </button>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  multiline?: boolean;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  maxLength?: number;
  autoFocus?: boolean;
};

export function Field({ label, value, onChange, error, multiline, ...input }: FieldProps) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} aria-invalid={!!error} {...input} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} {...input} />
      )}
      {error ? <span className="field-error">{error}</span> : null}
    </label>
  );
}

export function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`chip ${active ? "chip-active" : ""}`} aria-pressed={active} onClick={onClick}>
      {label}
    </button>
  );
}

export const Card = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={`card ${className ?? ""}`}>{children}</div>
);

export const Loading = () => (
  <div className="state" role="status">
    <span className="spinner spinner-dark" aria-hidden /> Loading…
  </div>
);

export const EmptyState = ({ title, body }: { title: string; body: string }) => (
  <div className="state">
    <strong>{title}</strong>
    <span>{body}</span>
  </div>
);

export const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="state state-error" role="alert">
    <strong>Couldn't load this</strong>
    <span>{message}</span>
    <Button variant="outline" onClick={onRetry}>Try again</Button>
  </div>
);

export const Stars = ({ value }: { value: number }) => (
  <span className="stars" aria-label={`${value} out of 5 stars`}>
    {"★".repeat(value)}
    <span className="stars-empty">{"★".repeat(5 - value)}</span>
  </span>
);

/** Shows a list section's loading / error / empty states, or its items. */
export function ListState<T>({
  list,
  empty,
  children,
}: {
  list: { data: T[] | null; error: string | null; reload: () => void };
  empty: { title: string; body: string };
  children: (items: T[]) => ReactNode;
}) {
  if (list.error) return <ErrorState message={list.error} onRetry={list.reload} />;
  if (!list.data) return <Loading />;
  if (list.data.length === 0) return <EmptyState {...empty} />;
  return <>{children(list.data)}</>;
}
