import type { MetadataRoute } from "next";

/**
 * The web app manifest (/manifest.webmanifest): with it, and the service worker in public/sw.js, DentClinic can be
 * installed on a computer, tablet or phone and opens in its own window, starting on the dashboard. The shortcuts
 * appear on the app icon's menu. Arabic first, like the app.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "DentClinic",
    short_name: "DentClinic",
    description: "إدارة عيادة الأسنان · Dental clinic management",
    lang: "ar",
    dir: "auto",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f8f7fa",
    theme_color: "#6a5fdd",
    categories: ["medical", "business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
    shortcuts: [
      { name: "اليوم · Today", short_name: "Today", url: "/today" },
      { name: "المواعيد · Appointments", short_name: "Appointments", url: "/appointments?view=day" },
      { name: "المرضى · Patients", short_name: "Patients", url: "/patients" },
    ],
  };
}
