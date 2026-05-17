import { DashboardShell } from "@/components/layout/DashboardShell";
import { DashboardContent } from "@/components/dashboard/DashboardContent";

export const metadata = { title: "Agent Space — CyberAgent Studio" };

export default function DashboardPage() {
  return (
    <DashboardShell title="Agent Space">
      <DashboardContent />
    </DashboardShell>
  );
}
