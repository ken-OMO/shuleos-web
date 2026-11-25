import type { NextConfig } from "next";
import { environment } from "./src/config/environment";

const isDevelopment = process.env.NODE_ENV === "development";
const apiOrigin = new URL(environment.apiBaseUrl, "http://localhost").origin;
const connectSources = ["'self'"];
if (!environment.apiBaseUrl.startsWith("/")) connectSources.push(apiOrigin);
if (isDevelopment) connectSources.push("ws://localhost:*", "ws://127.0.0.1:*");

const contentSecurityPolicy = [
  "default-src 'self'",
  // Static Next.js hydration and the initial theme script use inline scripts.
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src ${connectSources.join(" ")}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "Content-Security-Policy", value: contentSecurityPolicy },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ...(process.env.SHULEOS_ENABLE_HSTS === "true"
          ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }]
          : []),
      ],
    }];
  },
};

export default nextConfig;
