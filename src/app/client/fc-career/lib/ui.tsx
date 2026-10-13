"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { cloneElement, isValidElement, useEffect, type ButtonHTMLAttributes, type ReactElement, type ReactNode } from "react";

export const CAREER_BASE = "/client/fc-career";

type Variant = "career" | "action" | "ghost" | "outline";
type Size = "default" | "sm" | "icon";
const variantClass: Record<Variant, string> = { career: "career-button", action: "action-button", ghost: "fcl-ghost", outline: "fcl-outline" };

export function buttonClass(variant: Variant = "ghost", size: Size = "default", extra = "") {
  return ["fcl-btn", variantClass[variant], `fcl-size-${size}`, extra].filter(Boolean).join(" ");
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; asChild?: boolean };

export function Button({ variant, size, asChild, className, children, type, ...props }: ButtonProps) {
  const classes = buttonClass(variant, size, className ?? "");
  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ className?: string }>;
    return cloneElement(child, { className: [classes, child.props.className].filter(Boolean).join(" ") });
  }
  return <button type={type ?? "button"} className={classes} {...props}>{children}</button>;
}

/** Lien relatif a la zone carriere : `to="/dashboard"` -> /client/fc-career/dashboard */
export function Link({ to, className, children, ...props }: { to: string; className?: string; children?: ReactNode; "aria-label"?: string; title?: string }) {
  return <NextLink href={to === "/" ? CAREER_BASE + "/dashboard" : `${CAREER_BASE}${to}`} className={className} {...props}>{children}</NextLink>;
}

/** Chemin courant relatif a la zone carriere ("/", "/dashboard", ...). */
export function useCareerPath() {
  const pathname = usePathname() ?? CAREER_BASE;
  const rest = pathname.startsWith(CAREER_BASE) ? pathname.slice(CAREER_BASE.length) : pathname;
  return rest.replace(/\/$/, "") || "/";
}

export function Dialog({ open, onOpenChange, children }: { open: boolean; onOpenChange: (open: boolean) => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onOpenChange(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);
  if (!open) return null;
  return (
    <div className="fcl-dialog-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onOpenChange(false); }}>
      <div className="fcl-dialog" role="dialog" aria-modal="true">
        <Button variant="ghost" size="icon" className="fcl-dialog-close" aria-label="Fermer" onClick={() => onOpenChange(false)}><X /></Button>
        {children}
      </div>
    </div>
  );
}
export function DialogContent({ children }: { children: ReactNode }) { return <>{children}</>; }
export function DialogTitle({ children }: { children: ReactNode }) { return <h2 className="fcl-dialog-title">{children}</h2>; }
export function DialogDescription({ children }: { children: ReactNode }) { return <p className="fcl-dialog-desc">{children}</p>; }
