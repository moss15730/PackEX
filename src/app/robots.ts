import type { MetadataRoute } from "next";

/** Only the marketing and legal surfaces are crawlable. */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/signup", "/privacy", "/terms"],
        disallow: ["/t/", "/platform", "/share/", "/api/", "/login", "/suspended"],
      },
    ],
    ...(base ? { sitemap: `${base}/sitemap.xml` } : {}),
  };
}
