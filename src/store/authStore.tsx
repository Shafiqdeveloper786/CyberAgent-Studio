"use client";

import React, { createContext, useCallback, useContext, useState } from "react";

export interface AuthUser {
  email: string;
  name: string;
  initials: string;
}

/** Modal visibility levels — controls which step shows when modal opens */
export type AuthModalState = "CLOSED" | "LOGIN" | "VERIFY";

interface AuthStoreCtx {
  /* ── auth ── */
  user: AuthUser | null;
  isLoggedIn: boolean;

  /* ── modal state machine ── */
  authModalState: AuthModalState;
  /** Open the auth modal. Optionally pass "LOGIN" (default) or "VERIFY" */
  openAuthModal: (state?: AuthModalState) => void;
  closeAuthModal: () => void;

  /* ── legacy aliases (kept for backward compat) ── */
  modalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;

  login: (user: AuthUser) => void;
  logout: () => void;

  /* ── pricing ── */
  pricingOpen: boolean;
  openPricing: () => void;
  closePricing: () => void;
}

const AuthStoreContext = createContext<AuthStoreCtx | null>(null);

export function AuthStoreProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authModalState, setAuthModalState] = useState<AuthModalState>("CLOSED");
  const [pricingOpen, setPricingOpen] = useState(false);

  /* ── Modal management ── */
  const openAuthModal = useCallback((state: AuthModalState = "LOGIN") => {
    setAuthModalState(state);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalState("CLOSED");
  }, []);

  /* Legacy aliases so existing code referencing openModal/closeModal still works */
  const modalOpen = authModalState !== "CLOSED";
  const openModal = useCallback(() => setAuthModalState("LOGIN"), []);
  const closeModal = closeAuthModal;

  const openPricing = useCallback(() => setPricingOpen(true), []);
  const closePricing = useCallback(() => setPricingOpen(false), []);

  const login = useCallback((u: AuthUser) => {
    setUser(u);
    setAuthModalState("CLOSED");
  }, []);

  const logout = useCallback(() => setUser(null), []);

  return (
    <AuthStoreContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        authModalState,
        openAuthModal,
        closeAuthModal,
        modalOpen,
        openModal,
        closeModal,
        login,
        logout,
        pricingOpen,
        openPricing,
        closePricing,
      }}
    >
      {children}
    </AuthStoreContext.Provider>
  );
}

export function useAuthStore() {
  const ctx = useContext(AuthStoreContext);
  if (!ctx) throw new Error("useAuthStore must be used inside AuthStoreProvider");
  return ctx;
}