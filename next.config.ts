import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * Keep these packages out of the webpack bundle so they run in Node.js
   * directly — @xenova/transformers downloads ONNX models at runtime and
   * pdf-parse reads the PDF binary; both break under webpack transforms.
   */
  serverExternalPackages: ["@xenova/transformers", "pdf-parse", "onnxruntime-node"],


  async headers() {
    return [
      /* ── /api/chat — allow cross-origin POST from any domain ── */
      {
        source: "/api/chat",
        headers: [
          { key: "Access-Control-Allow-Origin",      value: "*" },
          { key: "Access-Control-Allow-Methods",     value: "POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers",     value: "Content-Type, x-api-key" },
          { key: "Access-Control-Max-Age",           value: "86400" },
        ],
      },
      /* ── /widget/[agentId] — allow embedding in any iframe ── */
      {
        source: "/widget/:agentId*",
        headers: [
          /* Override Next.js default SAMEORIGIN so external sites can iframe us */
          { key: "X-Frame-Options",        value: "ALLOWALL" },
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
        ],
      },
    ];
  },
};

export default nextConfig;
