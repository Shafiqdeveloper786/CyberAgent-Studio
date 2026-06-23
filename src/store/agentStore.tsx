"use client";

import React, { createContext, useContext, useState } from "react";

export type Theme = "cyberpunk" | "minimal-dark" | "corporate-light";

export interface AgentConfig {
  name:           string;
  persona:        string;
  accentColor:    string;
  theme:          Theme;
  welcomeMessage: string;
}

/* Minimal shape of a persisted agent needed by loadAgent */
export interface AgentSnapshot {
  _id:            string;
  name:           string;
  persona:        string;
  themeColor:     string;
  theme?:         Theme;
  welcomeMessage?: string;
}

interface AgentStoreCtx {
  config:           AgentConfig;
  setConfig:        React.Dispatch<React.SetStateAction<AgentConfig>>;
  update:           (partial: Partial<AgentConfig>) => void;
  /* Which saved agent (if any) is currently loaded into the builder */
  activeAgentId:    string | null;
  setActiveAgentId: (id: string | null) => void;
  /* Load a saved agent's data into the builder form */
  loadAgent:        (agent: AgentSnapshot) => void;
}

const DEFAULT_CONFIG: AgentConfig = {
  name:           "Nexa",
  persona:        "Tech Support Expert",
  accentColor:    "#2563eb", // Corporate blue
  theme:          "corporate-light",
  welcomeMessage: "Hello! I can certainly help you with that. Can you describe the issue?",
};

const AgentStoreContext = createContext<AgentStoreCtx | null>(null);

export function AgentStoreProvider({ children }: { children: React.ReactNode }) {
  const [config,        setConfig]        = useState<AgentConfig>(DEFAULT_CONFIG);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);

  const update = (partial: Partial<AgentConfig>) =>
    setConfig((prev) => ({ ...prev, ...partial }));

  const loadAgent = (agent: AgentSnapshot) => {
    setConfig((prev) => ({
      ...prev,
      name:        agent.name,
      persona:     agent.persona,
      accentColor: agent.themeColor,
      theme:       agent.theme || "corporate-light",
      welcomeMessage: agent.welcomeMessage || prev.welcomeMessage,
    }));
    setActiveAgentId(agent._id);
  };

  return (
    <AgentStoreContext.Provider
      value={{ config, setConfig, update, activeAgentId, setActiveAgentId, loadAgent }}
    >
      {children}
    </AgentStoreContext.Provider>
  );
}

export function useAgentStore() {
  const ctx = useContext(AgentStoreContext);
  if (!ctx) throw new Error("useAgentStore must be used inside AgentStoreProvider");
  return ctx;
}
