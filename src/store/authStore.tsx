"use client";

import React, { createContext, useCallback, useContext, useState } from "react";

export interface AuthUser {
  email: string;
  name: string;
  initials: string;
}

interface AuthStoreCtx {
  /* ── auth ── */
  user: AuthUser | null;
  isLoggedIn: boolean;
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
  const [modalOpen, setModalOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);

  const openModal = useCallback(() => setModalOpen(true), []);
  const closeModal = useCallback(() => setModalOpen(false), []);

  const openPricing = useCallback(() => setPricingOpen(true), []);
  const closePricing = useCallback(() => setPricingOpen(false), []);

  const login = useCallback((u: AuthUser) => {
    setUser(u);
    setModalOpen(false);
  }, []);

  const logout = useCallback(() => setUser(null), []);

  return (
    <AuthStoreContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
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
