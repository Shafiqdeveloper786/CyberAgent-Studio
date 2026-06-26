import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CyberAgent Chat",
  description: "AI Chat Widget",
};

export default function WidgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>CyberAgent Chat</title>
        <style>{`
          /* COMPLETE WHITE THEME - No dark theme inheritance */
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #1e293b !important;
            font-family: 'Inter', system-ui, sans-serif !important;
            -webkit-font-smoothing: antialiased !important;
            width: 100% !important;
            height: 100% !important;
            overflow: hidden !important;
          }
          
          /* Nuclear override - everything must be white */
          * {
            background: #ffffff !important;
            color: #1e293b !important;
          }
          
          /* All elements */
          div, span, p, h1, h2, h3, h4, h5, h6, input, button, textarea, section, article, main, aside, nav, header, footer {
            background: #ffffff !important;
            color: #1e293b !important;
            border-color: rgba(0,0,0,0.1) !important;
          }
          
          /* Placeholder */
          input::placeholder, textarea::placeholder {
            color: #94a3b8 !important;
          }
        `}</style>
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
