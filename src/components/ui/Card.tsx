import clsx from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

export function Card({ children, className, padding = 'md' }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-slate-200 bg-white shadow-sm',
        'dark:border-dark-border dark:bg-dark-card dark:shadow-none',
        paddingClasses[padding],
        className,
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  label?: string;
  title: string;
  action?: React.ReactNode;
}

export function CardHeader({ label, title, action }: CardHeaderProps) {
  return (
    <div className="mb-3 flex items-start justify-between">
      <div>
        {label && (
          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-dark-muted">
            {label}
          </p>
        )}
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {title}
        </h3>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
