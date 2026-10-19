"use client";

import dynamic from "next/dynamic";
import type { ThreeSurfaceVariant } from "./ThreeScene";

const ThreeScene = dynamic(() => import("./ThreeScene"), {
  ssr: false,
  loading: () => <ThreeFallback />,
});

function ThreeFallback() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute left-[12%] top-[18%] h-24 w-24 rounded-full border border-emerald-300/20 bg-emerald-300/5 blur-[1px]" />
      <div className="absolute right-[14%] top-[32%] h-2 w-2 rounded-full bg-cyan-200/70 shadow-[0_0_22px_rgba(103,232,249,0.8)]" />
      <svg className="absolute right-[12%] top-[14%] h-20 w-20 opacity-50" viewBox="0 0 100 100" fill="none">
        <path d="M75 35.5C71.5 28.5 64.2 24 56 24C41.6 24 30 35.6 30 50C30 64.4 41.6 76 56 76C66.5 76 75.5 69.8 79.5 61M55 45L76 24M76 24H58M76 24V42" stroke="#6EE7C8" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export default function ThreeSurface({ variant = "ambient", className = "" }: { variant?: ThreeSurfaceVariant; className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden [&_*]:!pointer-events-none ${className}`} aria-hidden="true">
      <ThreeScene variant={variant} />
    </div>
  );
}