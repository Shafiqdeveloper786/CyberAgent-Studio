import { DashboardShell } from "@/components/layout/DashboardShell";
import { KnowledgeBaseContent } from "@/components/knowledge-base/KnowledgeBaseContent";

export const metadata = { title: "Knowledge Base — CyberAgent Studio" };

export default function KnowledgeBasePage() {
  return (
    <DashboardShell title="Knowledge Base">
      <KnowledgeBaseContent />
    </DashboardShell>
  );
}
