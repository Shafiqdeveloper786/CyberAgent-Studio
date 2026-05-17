/**
 * /widget/[agentId] — Standalone embeddable chat widget
 *
 * Rendered inside an iframe by the embed script.
 * No navbar, no sidebar — pure chat UI.
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

  let agentName  = "Assistant";
  let agentColor = "#00f2ff";

  try {
    await connectDB();
    const agent = await Agent
      .findById(agentId)
      .select("name themeColor")
      .lean<{ name: string; themeColor: string }>();
    if (agent) {
      agentName  = agent.name;
      agentColor = agent.themeColor || "#00f2ff";
    }
  } catch { /* render with defaults */ }

  return (
    /* Clean single root — no nested <html> or <body>.
       touch-action:auto ensures iOS Safari never disables tap events
       on the chat input or close button.                              */
    <div
      className="w-full h-full flex flex-col"
      style={{ touchAction: "auto", background: "#050508", margin: 0, padding: 0 }}
    >
      <WidgetChat agentId={agentId} agentName={agentName} accentColor={agentColor} />
    </div>
  );
}
