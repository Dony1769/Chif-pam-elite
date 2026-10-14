"use client";

import { motion } from "framer-motion";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size    = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "secondary",
  size = "md",
  fullWidth = false,
  loading = false,
  disabled,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const classes = [
    "fc-btn",
    `fc-btn--${variant}`,
    size === "sm" ? "fc-btn--sm" : size === "lg" ? "fc-btn--lg" : "",
    fullWidth ? "fc-btn--full" : "",
    className,
  ].filter(Boolean).join(" ");

  return (
    <motion.button
      className={classes}
      disabled={disabled || loading}
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.1 }}
      {...(rest as object)}
    >
      {loading ? <Spinner /> : children}
    </motion.button>
  );
}

function Spinner() {
  return (
    <svg
      width="16" height="16" viewBox="0 0 16 16"
      fill="none" aria-hidden="true"
      style={{ animation: "fc-spin 0.7s linear infinite" }}
    >
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
        strokeDasharray="28" strokeDashoffset="10" />
      <style>{`@keyframes fc-spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}
