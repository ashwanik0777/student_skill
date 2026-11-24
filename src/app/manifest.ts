import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${SITE.name} — ${SITE.tagline}`,
    short_name: SITE.name,
    description: SITE.description,
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fafafa",
    theme_color: "#4f46e5",
    categories: ["education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Today’s tests", url: "/tests", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "AI Tutor", url: "/tutor", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Offline tests", url: "/offline", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
