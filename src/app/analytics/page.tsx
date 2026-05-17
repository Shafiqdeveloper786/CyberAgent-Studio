import { DashboardShell } from "@/components/layout/DashboardShell";
import { AnalyticsContent } from "@/components/analytics/AnalyticsContent";

export const metadata = { title: "Analytics — CyberAgent Studio" };

export default function AnalyticsPage() {
  return (
    <DashboardShell title="Analytics">
      <AnalyticsContent />
    </DashboardShell>
  );
}
