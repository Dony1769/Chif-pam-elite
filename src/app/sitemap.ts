import type { MetadataRoute } from "next";
import { PUBLIC_ROUTES, SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PUBLIC_ROUTES.map(r => ({ url: `${SITE_URL}${r.path === "/" ? "" : r.path}`, lastModified: now, changeFrequency: r.freq, priority: r.priority }));
}
