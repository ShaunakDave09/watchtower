export default function LoadError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="p-8">
      <div className="max-w-md rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-soft)] px-5 py-4">
        <div className="text-[13px] font-semibold text-[var(--color-danger)]">Couldn't load this page</div>
        <div className="mt-1 break-words font-mono text-[12px] text-[var(--color-ink-soft)]">{message}</div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-3 rounded-[9px] border border-[var(--color-border-strong)] bg-[var(--color-card)] px-[14px] py-[7px] text-[12px] font-medium text-[var(--color-ink)] hover:bg-[var(--color-accent-soft)]"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
