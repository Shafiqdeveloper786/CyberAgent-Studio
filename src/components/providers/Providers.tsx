"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { AuthStoreProvider } from "@/store/authStore";
import { AgentStoreProvider } from "@/store/agentStore";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthStoreProvider>
        <AgentStoreProvider>
          {children}

          {/* Cyberpunk-styled toast container */}
          <Toaster
            position="bottom-right"
            theme="dark"
            gap={8}
            toastOptions={{
              style: {
                background:    "rgba(8,8,18,0.96)",
                border:        "1px solid rgba(0,242,255,0.18)",
                color:         "#e2e8f0",
                backdropFilter:"blur(16px)",
                borderRadius:  "10px",
                fontSize:      "13px",
              },
              classNames: {
                success: "!border-[rgba(0,255,148,0.25)]",
                error:   "!border-[rgba(239,68,68,0.25)]",
              },
            }}
          />
        </AgentStoreProvider>
      </AuthStoreProvider>
    </SessionProvider>
  );
}
