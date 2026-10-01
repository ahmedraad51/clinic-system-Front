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

/**
 * The cloud with many clinics: CLOUD_DOMAIN is the main web address ("dentclinic.example"). Each clinic is
 * <name>.CLOUD_DOMAIN ("alnoor.dentclinic.example"), and its requests go to its own Frappe site: CLINIC_SITE_URL with
 * {clinic} replaced by the name. The main address (and www.) shows the public website; its requests go to
 * PLATFORM_SITE_URL, the platform's own Frappe site (trial requests, clinics, subscriptions).
 * Without CLOUD_DOMAIN the cloud serves the one clinic at FRAPPE_URL, like the other two modes.
 */
const CLOUD_DOMAIN = DEPLOYMENT_MODE === "cloud" ? (process.env.CLOUD_DOMAIN || "").toLowerCase() : "";
const CLINIC_SITE_URL = process.env.CLINIC_SITE_URL || "http://{clinic}.localhost:8000";
const PLATFORM_SITE_URL = process.env.PLATFORM_SITE_URL || FRAPPE_URL;
if (CLOUD_DOMAIN && !CLINIC_SITE_URL.includes("{clinic}")) {
  throw new Error(`CLINIC_SITE_URL must contain {clinic}, for example https://{clinic}.sites.example.`);
}
/** A clinic's web address: the same rule as CLINIC_ADDRESS_PATTERN and RESERVED_ADDRESSES in src/lib/deployment.ts. */
const CLINIC_SLUG = "(?!(?:www|admin|api|app|mail)\\.)[a-z][a-z0-9-]{1,28}[a-z0-9]";

/** The /frappe rewrites: by the clinic in the web address in the cloud, else the one site. */
function frappeRewrites() {
  const to = (site: string) => `${site.replace(/\/$/, "")}/:path*`;
  if (!CLOUD_DOMAIN) return [{ source: "/frappe/:path*", destination: to(FRAPPE_URL) }];
  const domain = CLOUD_DOMAIN.replace(/\./g, "\\.");
  return [
    {
      source: "/frappe/:path*",
      has: [{ type: "host" as const, value: `(?<clinic>${CLINIC_SLUG})\\.${domain}` }],
      destination: to(CLINIC_SITE_URL.replace("{clinic}", ":clinic")),
    },
    // The main address, www. and anything else: the platform's site.
    { source: "/frappe/:path*", destination: to(PLATFORM_SITE_URL) },
  ];
}

const nextConfig: NextConfig = {
  // Built into the app, so the browser code knows how it is installed and where the clinics are.
  env: {
    DEPLOYMENT_MODE,
    CLOUD_DOMAIN,
  },
  // In development, clinic addresses such as alnoor.localhost:3000 (CLOUD_DOMAIN=localhost) may load the dev server.
  allowedDevOrigins: CLOUD_DOMAIN ? [CLOUD_DOMAIN, `*.${CLOUD_DOMAIN}`] : undefined,
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
    return frappeRewrites();
  },
};

export default nextConfig;
