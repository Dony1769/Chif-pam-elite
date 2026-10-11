import * as React from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const buttonVariantMap: Record<Variant, string> = {
  primary:
    'bg-(--accent) text-(--accent-contrast) border border-(--accent-border) shadow-[0_10px_30px_var(--accent-glow)] hover:brightness-110 focus-visible:focus-ring',
  secondary:
    'bg-(--surface-2) text-(--fg-1) border border-(--border-subtle) hover:border-(--border-strong) focus-visible:focus-ring',
  ghost:
    'bg-transparent text-(--fg-2) border border-transparent hover:bg-(--surface-2) hover:text-(--fg-1) focus-visible:focus-ring',
  danger:
    'bg-(--danger) text-white border border-(--danger) hover:brightness-105 focus-visible:focus-ring',
  success:
    'bg-linear-to-br from-[#65eccf] to-[#37d3f7] text-[#06201d] border border-white/20 shadow-[0_16px_40px_rgba(54,218,201,0.28)] hover:brightness-110 focus-visible:focus-ring',
};

const buttonSizeMap: Record<Size, string> = {
  sm: 'h-9 rounded-[var(--radius-sm)] px-3.5 text-[11px] tracking-[0.08em]',
  md: 'h-11 rounded-[var(--radius-md)] px-5 text-xs tracking-[0.09em]',
  lg: 'h-12 rounded-[var(--radius-md)] px-6 text-sm tracking-[0.09em]',
  icon: 'h-10 w-10 rounded-[var(--radius-sm)] p-0',
};

export function DSButton({
  className,
  variant = 'primary',
  size = 'md',
  as = 'button',
  ...props
}: (React.ButtonHTMLAttributes<HTMLButtonElement> & React.AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant; size?: Size; as?: 'a' | 'button' }) ) {
  const classes = cn(
    'inline-flex items-center justify-center gap-2 font-semibold uppercase transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50',
    buttonVariantMap[variant],
    buttonSizeMap[size],
    className
  );

  if (as === 'a') {
    return (
      <a className={classes} {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)} />
    );
  }

  return (
    <button className={classes} {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)} />
  );
}

export function DSCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'glass rounded-lg border border-(--border-subtle) bg-(--surface-1)/95 shadow-(--shadow-1) transition-colors duration-200',
        className
      )}
      {...props}
    />
  );
}

export function DSCardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 pt-6 pb-4', className)} {...props} />;
}

export function DSCardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('ds-title text-base text-(--fg-1)', className)} {...props} />;
}

export function DSCardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('mt-1 text-sm text-(--fg-3)', className)} {...props} />;
}

export function DSCardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 pb-6', className)} {...props} />;
}

export function DSCardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 pb-6 pt-2', className)} {...props} />;
}

// Page and header primitives
export function DSPage({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return <main className={cn(className)} {...props} />;
}

export function DSHeader({ eyebrow, title, description, className, ...props }: { eyebrow?: string; title?: string; description?: string; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('space-y-1', className)} {...props}>
      {eyebrow ? <p className="text-sm text-(--fg-3) uppercase tracking-widest">{eyebrow}</p> : null}
      {title ? <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1> : null}
      {description ? <p className="text-sm text-(--fg-3)">{description}</p> : null}
    </div>
  );
}

export function DSPanel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4', className)} {...props} />;
}

export function DSInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-md border border-(--border-subtle) bg-(--surface-2) px-4 py-3 text-sm text-(--fg-1) outline-none transition-colors placeholder:text-(--fg-4) focus:border-(--accent) focus:ring-2 focus:ring-(--accent-ring)',
        className
      )}
      {...props}
    />
  );
}

export function DSTextarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full min-h-28 rounded-md border border-(--border-subtle) bg-(--surface-2) px-4 py-3 text-sm text-(--fg-1) outline-none transition-colors placeholder:text-(--fg-4) focus:border-(--accent) focus:ring-2 focus:ring-(--accent-ring)',
        className
      )}
      {...props}
    />
  );
}

export function DSSelect({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'w-full rounded-md border border-(--border-subtle) bg-(--surface-2) px-4 py-3 text-sm text-(--fg-1) outline-none transition-colors focus:border-(--accent) focus:ring-2 focus:ring-(--accent-ring)',
        className
      )}
      {...props}
    />
  );
}

export function DSBadge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-(--radius-pill) border border-(--border-subtle) bg-(--surface-3) px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-(--fg-3)',
        className
      )}
      {...props}
    />
  );
}

export function DSBadgeStatus({
  className,
  tone = 'default',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: 'default' | 'success' | 'warning' | 'danger' | 'info' }) {
  const toneMap: Record<NonNullable<typeof tone>, string> = {
    default: 'bg-(--surface-3) text-(--fg-3) border-(--border-subtle)',
    success: 'bg-[#63ebca1f] text-[#98f8e2] border-[#63ebca4f]',
    warning: 'bg-[#f59e0b20] text-[#ffd27a] border-[#f59e0b4d]',
    danger: 'bg-[#f43f5e20] text-[#ff98aa] border-[#f43f5e4f]',
    info: 'bg-[#37c9f71f] text-[#9ce8ff] border-[#37c9f74f]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-(--radius-pill) border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]',
        toneMap[tone],
        className
      )}
      {...props}
    />
  );
}

export function DSLabel({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('mb-1.5 inline-block text-xs font-semibold uppercase tracking-[0.12em] text-(--fg-3)', className)} {...props} />;
}

export function DSSkeleton({ className }: { className?: string }) {
  return <div className={cn('ds-skeleton rounded-md', className)} aria-hidden="true" />;
}

export function DSLoader({ className, label }: { className?: string; label?: string }) {
  return (
    <div className={cn('inline-flex items-center gap-2 text-xs text-(--fg-3)', className)} role="status" aria-live="polite">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-(--accent)" aria-hidden="true" />
      {label ? <span>{label}</span> : null}
    </div>
  );
}

export function DSDotsLoader({ className }: { className?: string }) {
  return (
    <div className={cn('inline-flex items-center gap-1.5', className)} role="status" aria-live="polite">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-(--accent) [animation-delay:-0.2s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-(--accent) [animation-delay:-0.1s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-(--accent)" />
    </div>
  );
}

export function DSTable({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-(--border-subtle) bg-(--surface-1)">
      <table className={cn('w-full border-collapse text-left text-sm', className)} {...props} />
    </div>
  );
}

export function DSTableHead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('bg-white/3', className)} {...props} />;
}

export function DSTableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('divide-y divide-white/6', className)} {...props} />;
}

export function DSTableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('transition-colors hover:bg-white/2', className)} {...props} />;
}

export function DSTableHeaderCell({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn('px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-(--fg-3)', className)}
      {...props}
    />
  );
}

export function DSTableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-3 text-sm text-(--fg-2)', className)} {...props} />;
}

export function DSModal({
  open,
  title,
  description,
  children,
  footer,
  onClose,
}: {
  open: boolean;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  onClose?: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-70 ds-fade-up" role="dialog" aria-modal="true" aria-label={title ?? 'Modal'}>
      <button
        type="button"
        aria-label="Fermer"
        onClick={onClose}
        className="absolute inset-0 bg-[#03060bcc] backdrop-blur-sm"
      />
      <div className="relative mx-auto mt-[10vh] w-[min(94vw,640px)] overflow-hidden rounded-xl border border-(--border-subtle) bg-(--surface-0) shadow-(--shadow-3)">
        {(title || description) && (
          <div className="border-b border-white/8 px-6 py-5">
            {title ? <h3 className="text-lg font-semibold tracking-tight text-(--fg-1)">{title}</h3> : null}
            {description ? <p className="mt-1 text-sm text-(--fg-3)">{description}</p> : null}
          </div>
        )}
        <div className="px-6 py-5">{children}</div>
        {footer ? <div className="border-t border-white/8 px-6 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}

export function DSToast({
  className,
  title,
  description,
  tone = 'default',
  action,
}: {
  className?: string;
  title: string;
  description?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  action?: React.ReactNode;
}) {
  const toneMap: Record<NonNullable<typeof tone>, string> = {
    default: 'border-(--border-subtle) bg-(--surface-1)',
    success: 'border-[#63ebca66] bg-[#0f231fdb]',
    warning: 'border-[#f59e0b66] bg-[#2a1d09de]',
    danger: 'border-[#f43f5e66] bg-[#2a0d14df]',
    info: 'border-[#37c9f766] bg-[#0e1f2bde]',
  };

  return (
    <div className={cn('ds-toast-in w-full rounded-md border px-4 py-3 shadow-(--shadow-2)', toneMap[tone], className)}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-(--fg-1)">{title}</p>
          {description ? <p className="mt-1 text-xs text-(--fg-3)">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

export function DSToastViewport({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('pointer-events-none fixed bottom-4 right-4 z-80 grid w-[min(92vw,420px)] gap-2', className)}
      {...props}
    />
  );
}

export function DSEmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <DSCard className={cn('p-8 text-center', className)}>
      <p className="text-sm font-semibold tracking-tight text-(--fg-1)">{title}</p>
      <p className="mt-2 text-xs text-(--fg-3)">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </DSCard>
  );
}
