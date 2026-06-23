/**
 * /widget/[agentId] — Standalone embeddable chat widget
 *
 * Rendered inside an iframe by the embed script.
 * No navbar, no sidebar — pure chat UI.
 *
 * Fetches full live agent config (theme, accentColor, logoUrl, welcomeMessage)
 * from the database on every render so the embedded widget always reflects
 * the latest Admin Dashboard settings (no stale cache).
 *
 * NOTE: Do NOT add <html> or <body> here. The root layout at
 * src/app/layout.tsx already owns those tags. Nesting them causes a
 * React hydration mismatch that aborts all event-listener binding,
 * making every input and button completely inert.
 */

import { type Metadata } from "next";
import { WidgetChat }    from "@/components/widget/WidgetChat";
import connectDB         from "@/lib/mongodb";
import Agent             from "@/models/Agent";

interface Props {
  params: Promise<{ agentId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { agentId } = await params;
  try {
    await connectDB();
    const agent = await Agent
      .findById(agentId)
      .select("name")
      .lean<{ name: string }>();
    return { title: agent ? `${agent.name} — CyberAgent` : "CyberAgent Chat" };
  } catch {
    return { title: "CyberAgent Chat" };
  }
}

export default async function WidgetPage({ params }: Props) {
  const { agentId } = await params;

  let agentName        = "Assistant";
  let agentColor       = "#00f2ff";
  let agentTheme       = "corporate-light";
  let agentLogoUrl     = "/logo1.png";
  let agentWelcomeMsg  = "";

  try {
    await connectDB();
    const agent = await Agent
      .findById(agentId)
      .select("name themeColor theme welcomeMessage logoUrl")
      .lean<{ name: string; themeColor: string; theme: string; welcomeMessage: string; logoUrl: string }>();
    if (agent) {
      agentName       = agent.name;
      agentColor      = agent.themeColor || "#00f2ff";
      agentTheme      = agent.theme || "corporate-light";
      agentLogoUrl    = agent.logoUrl || "/logo1.png";
      agentWelcomeMsg = agent.welcomeMessage || "";
    }
  } catch { /* render with defaults */ }

  return (
    /* Clean single root — no nested <html> or <body>.
       touch-action:auto ensures iOS Safari never disables tap events
       on the chat input or close button.                              */
    <div
      className="w-full h-full flex flex-col"
      style={{ touchAction: "auto", background: "#ffffff", margin: 0, padding: 0 }}
    >
      <WidgetChat
        agentId={agentId}
        agentName={agentName}
        accentColor={agentColor}
        theme={agentTheme}
        logoUrl={agentLogoUrl}
        welcomeMessage={agentWelcomeMsg}
      />
    </div>
  );
}