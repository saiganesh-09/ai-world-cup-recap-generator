import type { MetadataRoute } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: APP_URL, lastModified: new Date(), priority: 1 },
    { url: `${APP_URL}/engineering`, lastModified: new Date(), priority: 0.6 },
    { url: `${APP_URL}/login`, lastModified: new Date(), priority: 0.3 },
    { url: `${APP_URL}/signup`, lastModified: new Date(), priority: 0.3 },
  ];
}
