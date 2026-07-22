import * as React from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const buttonVariantMap: Record<Variant, string> = {
  primary:
    'bg-(--accent) text-(--accent-contrast) border border-(--accent-border) shadow-[0_10px_30px_var(--accent-glow)] hover:brightness-110',
  secondary:
    'bg-(--surface-2) text-(--fg-1) border border-(--border-subtle) hover:border-(--border-strong)',
  ghost:
    'bg-transparent text-(--fg-2) border border-transparent hover:bg-(--surface-2) hover:text-(--fg-1)',
  danger:
    'bg-(--danger) text-white border border-(--danger) hover:brightness-105',
};

export function DSButton({
  className,
  variant = 'primary',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-xs font-semibold tracking-wide transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50',
        buttonVariantMap[variant],
        className
      )}
      {...props}
    />
  );
}

export function DSCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-3xl border border-(--border-subtle) bg-(--surface-1)/95 backdrop-blur-xl shadow-(--elevation-1)',
        className
      )}
      {...props}
    />
  );
}

export function DSInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-2xl border border-(--border-subtle) bg-(--surface-2) px-4 py-3 text-sm text-(--fg-1) outline-none transition-colors placeholder:text-(--fg-4) focus:border-(--accent) focus:ring-2 focus:ring-(--accent-ring)',
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
        'inline-flex items-center rounded-full border border-(--border-subtle) bg-(--surface-3) px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-(--fg-3)',
        className
      )}
      {...props}
    />
  );
}

export function DSSkeleton({ className }: { className?: string }) {
  return <div className={cn('ds-skeleton rounded-2xl', className)} aria-hidden="true" />;
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
