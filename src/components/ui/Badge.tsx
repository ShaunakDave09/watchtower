import clsx from 'clsx';

type Variant = 'success' | 'error' | 'warning' | 'info' | 'neutral' | 'live';

interface BadgeProps {
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const variantClasses: Record<Variant, string> = {
  success:
    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  warning:
    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  neutral:
    'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300',
  live: 'bg-red-500 text-white',
};

const dotClasses: Record<Variant, string> = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
  neutral: 'bg-slate-400',
  live: 'bg-white',
};

export function Badge({
  variant = 'neutral',
  children,
  className,
  dot,
}: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide',
        variantClasses[variant],
        className,
      )}
    >
      {dot && (
        <span
          className={clsx('h-1.5 w-1.5 rounded-full', dotClasses[variant])}
        />
      )}
      {children}
    </span>
  );
}
