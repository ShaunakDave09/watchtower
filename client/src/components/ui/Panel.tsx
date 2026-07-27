import type { HTMLAttributes } from "react";

export default function Panel({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] ${className}`}
      {...rest}
    />
  );
}
