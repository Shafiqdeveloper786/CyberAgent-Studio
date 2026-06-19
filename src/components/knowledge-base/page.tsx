import React from "react";
// Default import use kiya hai (bina curly braces ke) kyunki content file mein export default hai
import { KnowledgeBaseContent } from "@/components/knowledge-base/KnowledgeBaseContent";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default function KnowledgeBasePage() {
  return (
    <DashboardShell title="Knowledge Base">
      <div className="h-full overflow-y-auto">
        <div className="p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto">
          <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden">
            <KnowledgeBaseContent />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}