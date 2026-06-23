"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, LogIn, LogOut, Sparkles, X, AlertCircle, Sparkle, AlertTriangle, Bot, Check, UserPlus, MailOpen
} from "lucide-react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useAuthStore } from "@/store/authStore";
import { useNotifications } from "@/lib/swr";

interface NavbarProps {
  title?: string;
}

/* ── Clean Minimal Sign-out Modal ── */
function SignOutModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onCancel()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1,    y: 0 }}
          exit={{ opacity: 0, scale: 0.95,    y: 8 }}
          transition={{ type: "spring", stiffness: 340, damping: 28 }}
          className="relative w-full max-w-sm rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-xl"
        >
          <div className="p-6 space-y-5">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-rose-50 border border-rose-200">
                <AlertCircle size={24} className="text-rose-500" />
              </div>
              <div>
                <p className="text-[16px] font-bold text-slate-900 tracking-wide">Sign Out?</p>
                <p className="text-[13px] text-slate-500 mt-1 leading-relaxed max-w-[260px]">
                  Are you sure you want to sign out from your CyberAgent session?
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-medium text-slate-600 hover:text-slate-900 border border-slate-200 bg-white hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all text-white bg-rose-500 hover:bg-rose-600 active:scale-[0.97] shadow-sm"
              >
                Sign Out
              </button>
            </div>
          </div>

          <button
            onClick={onCancel}
            className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
          >
            <X size={14} />
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function Navbar({ title }: NavbarProps) {
  const { data: session, status } = useSession();
  const { openPricing, openAuthModal } = useAuthStore();
  const [signOutConfirm, setSignOutConfirm] = useState(false);

  const isLoggedIn = status === "authenticated";
  const user       = session?.user;

  const initials = user?.name
    ? user.name.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  const handleSignOut = () => signOut({ callbackUrl: "/" });

  const [showNotifications, setShowNotifications] = useState(false);
  const { data: notifData, mutate: mutateNotifications } = useNotifications(isLoggedIn);
  const notifications = notifData?.notifications || [];
  const unreadCount = notifData?.unreadCount || 0;

  const handleNotificationClick = async (notifId: string, isRead: boolean) => {
    if (isRead) return;
    try {
      await fetch(`/api/notifications/${notifId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });
      mutateNotifications();
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch("/api/notifications/mark-all-read", { method: "POST" });
      mutateNotifications();
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  return (
    <>
      <header className="flex items-center justify-between px-4 sm:px-6 py-4 shrink-0 bg-white border-b border-slate-100 relative z-40">
        
        {/* ── Left: Main Page Heading ── */}
        <div className="flex items-center min-w-0">
          <h1 className="text-[16px] sm:text-[18px] font-bold text-slate-900 tracking-wide truncate">
            {title ?? "Agent Space"}
          </h1>
        </div>

        {/* ── Right: UI Status Panel / Controls ── */}
        <div className="flex items-center gap-3">

          {/* PRO Button with royal blue styling */}
          <button
            onClick={openPricing}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-full text-[11px] font-bold tracking-wider transition-all hover:bg-blue-500 active:scale-[0.98] shadow-sm"
            title="View pricing plans"
          >
            <Sparkles size={11} className="text-white/80" />
            PRO
          </button>

          {/* Notification bell */}
          {isLoggedIn && (
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative flex items-center justify-center w-8 h-8 rounded-full text-slate-400 hover:text-blue-600 bg-slate-50 border border-slate-200 hover:border-blue-300 transition-all duration-200"
              >
                <Bell size={14} />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-rose-500 shadow-sm" />
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <>
                    <div
                      className="fixed inset-0 z-35"
                      onClick={() => setShowNotifications(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white shadow-xl py-2 z-40 max-h-96 overflow-y-auto"
                    >
                      <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">Notifications</span>
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllAsRead}
                            className="text-[10px] font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
                          >
                            <MailOpen size={10} /> Mark all read
                          </button>
                        )}
                      </div>

                      <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-400">
                            No notifications yet.
                          </div>
                        ) : (
                          notifications.map((n: any) => {
                            let icon = <Bell size={12} className="text-blue-500" />;
                            let iconBg = "bg-blue-50/60";
                            
                            if (n.type === "welcome") {
                              icon = <UserPlus size={12} className="text-blue-600" />;
                              iconBg = "bg-blue-50";
                            } else if (n.type === "subscription") {
                              icon = <Sparkle size={12} className="text-emerald-600" />;
                              iconBg = "bg-emerald-50";
                            } else if (n.type === "limit_warning") {
                              icon = <AlertTriangle size={12} className="text-amber-600" />;
                              iconBg = "bg-amber-50";
                            } else if (n.type === "agent_created") {
                              icon = <Bot size={12} className="text-violet-600" />;
                              iconBg = "bg-violet-50";
                            } else if (n.type === "invite_accepted") {
                              icon = <Check size={12} className="text-indigo-600" />;
                              iconBg = "bg-indigo-50";
                            }

                            return (
                              <div
                                key={n._id}
                                onClick={() => {
                                  handleNotificationClick(n._id, n.isRead);
                                }}
                                className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50/80 transition-colors ${
                                  !n.isRead ? "bg-blue-50/20 font-medium" : ""
                                }`}
                              >
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
                                  {icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] text-slate-700 leading-normal break-words">
                                    {n.message}
                                  </p>
                                  <p className="text-[9px] text-slate-400 mt-1">
                                    {new Date(n.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                                {!n.isRead && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Auth area */}
          {isLoggedIn ? (
            <div className="flex items-center gap-2.5">
              {/* User Avatar */}
              {user?.image ? (
                <div
                  className="w-8 h-8 rounded-full overflow-hidden cursor-pointer ring-1 ring-slate-200 hover:ring-blue-400 transition-all shadow-sm"
                  title={user.email ?? ""}
                >
                  <Image src={user.image} alt={user.name ?? "Avatar"} width={32} height={32} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-full text-[11px] font-bold cursor-pointer select-none bg-blue-50 text-blue-600 border border-blue-200 shadow-sm transition-all hover:border-blue-400"
                  title={user?.email ?? ""}
                >
                  {initials}
                </div>
              )}

              <button
                onClick={() => setSignOutConfirm(true)}
                className="flex items-center gap-1 text-[12px] font-medium text-slate-400 hover:text-rose-500 transition-all group"
                title="Sign out"
              >
                <LogOut size={13} className="text-slate-400 group-hover:text-rose-400 transition-colors" />
                <span className="hidden md:inline">Sign out</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => openAuthModal("LOGIN")}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-[13px] font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-[0.97]"
            >
              <LogIn size={13} className="text-blue-500" />
              <span>Login / Register</span>
            </button>
          )}
        </div>
      </header>

      {signOutConfirm && (
        <SignOutModal
          onConfirm={handleSignOut}
          onCancel={() => setSignOutConfirm(false)}
        />
      )}
    </>
  );
}