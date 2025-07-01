/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" }, // หรือใช้ FRONTEND_URL แบบเฉพาะเจาะจงถ้า deploy จริง
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" }
        ]
      }
    ]
  },
  env: {
    FRONTEND_URL: process.env.FRONTEND_URL,
    BACKEND_URL: process.env.BACKEND_URL
  },
  reactStrictMode: false,
  devIndicators: false,
  webpack: (config: { infrastructureLogging: { level: string }; stats: { warningsFilter: RegExp[] } }, { dev }: any) => {
    if (dev) {
      // Suppress webpack cache warnings in development
      config.infrastructureLogging = {
        level: 'error',
      }
      
      // Suppress specific serialization warnings
      config.stats = {
        warningsFilter: [
          /Serializing big strings/,
          /PackFileCacheStrategy/
        ]
      }
    }
    return config
  },
}

module.exports = nextConfig
