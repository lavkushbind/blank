import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/studio/", "/classroom/"],
    },
    sitemap: "https://blanklearn.com/sitemap.xml",
  };
}