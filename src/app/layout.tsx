import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers/Providers";
import { AgentEmbedScript } from "@/components/embed/AgentEmbedScript";

export const metadata: Metadata = {
  title: "CyberAgent Studio",
  description: "AI Chatbot Builder — Build, deploy and analyze intelligent chat agents.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/*
         * Fonts loaded via CDN at runtime — avoids build-time network
         * dependency on fonts.gstatic.com which can be blocked in CI/CD.
         */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=Urbanist:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full bg-[#050505] text-[#e2e8f0] antialiased">
        <Providers>{children}</Providers>

        {/*
         * NexCore AI live widget — injected globally across all routes.
         *
         * AgentEmbedScript is a "use client" component that:
         *  1. Initialises src with NEXT_PUBLIC_APP_URL at SSR time
         *     so the server-rendered HTML already has a valid src attr.
         *  2. Corrects to window.location.origin inside useEffect,
         *     which fires only after full hydration — zero mismatch.
         *  3. strategy="afterInteractive" guarantees the script never
         *     blocks the critical rendering path.
         */}
        <AgentEmbedScript
          agentId="6a09a160a67750fe223d8637"
          accentColor="#00f2ff"
        />
      </body>
    </html>
  );
}
