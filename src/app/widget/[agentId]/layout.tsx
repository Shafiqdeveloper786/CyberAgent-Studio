/**
 * Widget segment layout — clean white theme for the iframe context.
 *
 * This file intentionally has NO <html> or <body> tags — those belong
 * only to src/app/layout.tsx (the root layout).  Adding them here would
 * cause a React hydration mismatch and break all event listeners inside
 * the widget iframe.
 */

export default function WidgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        height:     "100dvh",
        width:      "100%",
        background: "#ffffff",
        overflow:   "hidden",
        margin:     0,
        padding:    0,
        touchAction: "auto",
      }}
    >
      {children}
    </div>
  );
}