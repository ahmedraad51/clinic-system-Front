import path from "node:path";
import type { NextConfig } from "next";

/**
 * Requests to /frappe/... are passed on to the Frappe site.
 * Set FRAPPE_URL (for example in .env.local) if your site is not at the default address.
 */
const FRAPPE_URL = process.env.FRAPPE_URL || "http://dent_clinic.localhost:8000";

/**
 * How this copy is installed (src/lib/deployment.ts explains each): cloud (the default), clinic-server or cloud-copy.
 * Set DEPLOYMENT_MODE before `npm run build`; it is built into the app. A wrong value stops the build.
 */
const MODES = ["cloud", "clinic-server", "cloud-copy"];
const DEPLOYMENT_MODE = process.env.DEPLOYMENT_MODE || "cloud";
if (!MODES.includes(DEPLOYMENT_MODE)) {
  throw new Error(`DEPLOYMENT_MODE must be one of ${MODES.join(", ")}, not "${DEPLOYMENT_MODE}".`);
}

const nextConfig: NextConfig = {
  // Built into the app, so the browser code knows how it is installed.
  env: {
    DEPLOYMENT_MODE,
  },
  // The dev-only "N" button sits bottom-left by default, on top of the user card in the sidebar.
  devIndicators: {
    position: "bottom-right",
  },
  // A package-lock.json in a parent folder can make Turbopack pick the wrong workspace root.
  turbopack: {
    root: path.resolve(__dirname),
  },
  // The /frappe rewrite gives up after 30 seconds by default. The app itself waits up to 10 minutes for an
  // upload (UPLOAD_TIMEOUT_MS in src/lib/frappe.ts), so the rewrite must wait a little longer.
  experimental: {
    proxyTimeout: 610_000,
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
