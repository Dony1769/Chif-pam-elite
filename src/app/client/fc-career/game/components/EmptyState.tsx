"use client";

import type { ReactNode } from "react";
import { Button } from "./Button";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const DefaultIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" opacity="0.4"/>
    <path d="M16 24h16M24 16v16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.4"/>
  </svg>
);

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="fc-empty">
      <div className="fc-empty__icon">
        {icon ?? <DefaultIcon />}
      </div>
      <p className="fc-empty__title">{title}</p>
      {description && <p className="fc-empty__desc">{description}</p>}
      {action && (
        <Button variant="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
