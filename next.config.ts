/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.0.104', 'localhost:3000'],
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