import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers/Providers";

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
      </body>
    </html>
  );
}
