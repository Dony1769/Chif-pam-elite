import type { MetadataRoute } from "next";
import { FC_PRIVATE, PRIVATE_PREFIXES, SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Le robot de vérification des annonces Google doit pouvoir lire toutes les pages de destination
      { userAgent: ["AdsBot-Google", "AdsBot-Google-Mobile", "Mediapartners-Google"], allow: "/" },
      { userAgent: "*", allow: "/", disallow: [...PRIVATE_PREFIXES, ...FC_PRIVATE] },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
