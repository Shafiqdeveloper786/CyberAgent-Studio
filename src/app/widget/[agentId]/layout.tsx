/**
 * Widget segment layout — applies dark background and full-height
 * containment for the iframe context.
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
        height:     "100dvh",   /* dvh = dynamic viewport height, works in iOS Safari */
        width:      "100%",
        background: "#050508",
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
