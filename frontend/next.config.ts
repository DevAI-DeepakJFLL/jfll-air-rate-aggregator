import type { NextConfig } from "next";

const isExport = process.env.NEXT_OUTPUT_EXPORT === "true";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' http://localhost:8000 http://127.0.0.1:8000 https:; frame-ancestors 'none';",
  },
];

const nextConfig: NextConfig = {
  ...(isExport
    ? { output: "export", images: { unoptimized: true } }
    : process.env.BUILD_STANDALONE === "true"
    ? { output: "standalone" }
    : {}),
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: true,
  poweredByHeader: false,
  ...(!isExport
    ? {
        async headers() {
          return [
            {
              source: "/:path*",
              headers: securityHeaders,
            },
          ];
        },
      }
    : {}),
};

export default nextConfig;
