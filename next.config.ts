import path from "node:path";
import type { NextConfig } from "next";

/**
 * Requests to /frappe/... are passed on to the Frappe site.
 * Set FRAPPE_URL (for example in .env.local) if your site is not at the default address.
 */
const FRAPPE_URL = process.env.FRAPPE_URL || "http://dent_clinic.localhost:8000";

const nextConfig: NextConfig = {
  // The dev-only "N" button sits bottom-left by default, on top of the user card in the sidebar.
  devIndicators: {
    position: "bottom-right",
  },
  // A package-lock.json in a parent folder can make Turbopack pick the wrong workspace root.
  turbopack: {
    root: path.resolve(__dirname),
  },
  async rewrites() {
    return [
      {
        source: "/frappe/:path*",
        destination: `${FRAPPE_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
