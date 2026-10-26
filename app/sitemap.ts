import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/demo`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/teams`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/players`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/tournaments`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/engineering`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/login`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/signup`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
