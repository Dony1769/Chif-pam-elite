"use client";

import { useReportWebVitals } from "next/web-vitals";

type VitalName = "CLS" | "INP" | "LCP" | "TTFB" | "FCP";

type VitalEntry = {
  name: VitalName;
  value: number;
  id: string;
  rating: "good" | "needs-improvement" | "poor";
  navigationType: string;
  ts: number;
};

declare global {
  interface Window {
    __CHIFPAM_WEB_VITALS__?: VitalEntry[];
  }
}

export default function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    if (typeof window === "undefined") return;

    const name = metric.name as VitalName;
    if (!["CLS", "INP", "LCP", "TTFB", "FCP"].includes(name)) return;

    const entry: VitalEntry = {
      name,
      value: Number(metric.value.toFixed(2)),
      id: metric.id,
      rating: metric.rating,
      navigationType: metric.navigationType,
      ts: Date.now(),
    };

    const queue = window.__CHIFPAM_WEB_VITALS__ || [];
    queue.push(entry);
    window.__CHIFPAM_WEB_VITALS__ = queue.slice(-100);

    if (process.env.NODE_ENV !== "production") {
      console.info("[WebVital]", entry.name, entry.value, entry.rating, entry.navigationType);
    }
  });

  return null;
}
