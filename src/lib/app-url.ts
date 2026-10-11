const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

if (!configuredSiteUrl) {
  throw new Error('Missing required environment variable: NEXT_PUBLIC_SITE_URL');
}

export const appUrl = configuredSiteUrl.replace(/\/+$/, '');