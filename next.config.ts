/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/frappe/:path*",
        destination: "http://dent_clinic.localhost:8000/:path*",
      },
    ];
  },
};

export default nextConfig;