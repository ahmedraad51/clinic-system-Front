/**
 * Requests to /frappe/... are passed on to the Frappe site.
 * Set FRAPPE_URL (for example in .env.local) if your site is not at the default address.
 */
const FRAPPE_URL = process.env.FRAPPE_URL || "http://dent_clinic.localhost:8000";

/** @type {import('next').NextConfig} */
const nextConfig = {
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
