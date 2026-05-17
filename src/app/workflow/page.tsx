import { DashboardShell } from "@/components/layout/DashboardShell";
import { WorkflowBuilder } from "@/components/workflow/WorkflowBuilder";

export const metadata = { title: "Workflow — CyberAgent Studio" };

export default function WorkflowPage() {
  return (
    <DashboardShell title="Workflow">
      <WorkflowBuilder />
    </DashboardShell>
  );
}
