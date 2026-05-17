"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, BookOpen, GitBranch, Code2, BarChart2, Settings, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Agent Space",    href: "/dashboard",      icon: Bot       },
  { label: "Knowledge Base", href: "/knowledge-base", icon: BookOpen  },
  { label: "Workflow",       href: "/workflow",        icon: GitBranch },
  { label: "Embed Code",     href: "/embed-code",      icon: Code2     },
  { label: "Analytics",      href: "/analytics",       icon: BarChart2 },
];

const MIN_W     = 160;
const MAX_W     = 340;
const DEFAULT_W = 200;
const ICON_W    = 64;
const SNAP_AT   = 110;

export function Sidebar() {
  const pathname = usePathname();

  const [collapsed,    setCollapsed]    = useState(false);
  const [width,        setWidth]        = useState(DEFAULT_W);
  const [dragging,     setDragging]     = useState(false);
  const [handleHover,  setHandleHover]  = useState(false);

  const onDragHandleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = collapsed ? ICON_W : width;
    setDragging(true);
    document.body.style.cursor     = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev: MouseEvent) => {
      const next = startW + (ev.clientX - startX);
      if (next < SNAP_AT) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
        setWidth(Math.max(MIN_W, Math.min(MAX_W, next)));
      }
    };
    const onUp = () => {
      setDragging(false);
      document.body.style.cursor     = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
  }, [collapsed, width]);

  const toggleCollapse  = () => setCollapsed((c) => !c);
  const displayWidth    = collapsed ? ICON_W : width;

  return (
    <motion.aside
      animate={{ width: displayWidth }}
      transition={{ duration: dragging ? 0 : 0.22, ease: "easeInOut" }}
      className="relative flex flex-col shrink-0 h-full select-none"
      style={{
        background:  "rgba(6,6,12,0.98)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        overflow:    "hidden",
        minWidth:    displayWidth,
        boxShadow:   "4px 0 24px rgba(0,0,0,0.3)",
      }}
    >
      {/* ── Logo / toggle ── */}
      <button
        onClick={toggleCollapse}
        className="flex items-center gap-3 px-4 py-5 shrink-0 w-full text-left group"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {/* Icon mark — always glowing */}
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-all duration-200 group-hover:scale-110"
          style={{
            background: "linear-gradient(135deg,rgba(0,242,255,0.2),rgba(168,85,247,0.2))",
            border:     "1px solid rgba(0,242,255,0.45)",
            boxShadow:  "0 0 18px rgba(0,242,255,0.25), 0 0 40px rgba(168,85,247,0.1)",
          }}
        >
          <Zap size={15} className="text-[#00f2ff]" />
        </div>

        {/* Brand label — always gradient, never plain white */}
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.14 }}
              className="text-[13px] font-black whitespace-nowrap tracking-wide"
              style={{
                background:           "linear-gradient(90deg,#00f2ff,#a855f7)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor:  "transparent",
                filter:               "drop-shadow(0 0 6px rgba(0,242,255,0.3))",
              }}
            >
              CyberAgent Studio
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Gradient divider */}
      <div
        className="mx-3 mb-3 h-px"
        style={{ background: "linear-gradient(90deg,rgba(0,242,255,0.2),rgba(168,85,247,0.1),transparent)" }}
      />

      {/* ── Nav items ── */}
      <nav className="flex flex-col gap-0.5 px-2 flex-1">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active =
            pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150",
                active
                  ? "nav-active text-[#00f2ff]"
                  : "text-[#64748b] hover:text-[#94a3b8] hover:bg-white/[0.03]"
              )}
              style={active ? {
                background: "linear-gradient(90deg,rgba(0,242,255,0.09),transparent)",
                borderLeft: "2px solid #00f2ff",
                paddingLeft: 10,
                boxShadow:  "inset 0 0 20px rgba(0,242,255,0.04)",
              } : {}}
            >
              {/* Neon left border glow when active */}
              {active && (
                <div
                  className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r"
                  style={{ background: "#00f2ff", boxShadow: "0 0 8px rgba(0,242,255,0.8), 0 0 20px rgba(0,242,255,0.3)" }}
                />
              )}

              <Icon
                size={16}
                className="shrink-0"
                style={active ? { color: "#00f2ff", filter: "drop-shadow(0 0 4px rgba(0,242,255,0.5))" } : {}}
              />

              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* ── Settings (bottom) ── */}
      <div className="px-2 pb-4">
        <div
          className="mx-1 mb-3 h-px"
          style={{ background: "linear-gradient(90deg,rgba(255,255,255,0.05),transparent)" }}
        />
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150",
            pathname === "/settings"
              ? "text-[#00f2ff]"
              : "text-[#64748b] hover:text-[#94a3b8] hover:bg-white/[0.03]"
          )}
          style={pathname === "/settings" ? {
            background: "linear-gradient(90deg,rgba(0,242,255,0.09),transparent)",
            borderLeft: "2px solid #00f2ff",
            paddingLeft: 10,
          } : {}}
        >
          <Settings
            size={16}
            className="shrink-0"
            style={pathname === "/settings" ? { color: "#00f2ff", filter: "drop-shadow(0 0 4px rgba(0,242,255,0.5))" } : {}}
          />
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}
                className="whitespace-nowrap overflow-hidden">
                Settings
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* ── Drag-resize handle ── */}
      <div
        onMouseDown={onDragHandleMouseDown}
        onMouseEnter={() => setHandleHover(true)}
        onMouseLeave={() => setHandleHover(false)}
        className="absolute top-0 right-0 bottom-0 w-1 z-10"
        style={{ cursor: "col-resize" }}
      >
        <motion.div
          className="absolute inset-y-0 right-0 w-[3px] rounded-full"
          animate={{
            opacity:    dragging ? 1 : handleHover ? 0.6 : 0,
            background: dragging ? "linear-gradient(180deg,#00f2ff,#a855f7)" : "rgba(0,242,255,0.5)",
            boxShadow:  dragging ? "0 0 12px rgba(0,242,255,0.6)" : "none",
          }}
          transition={{ duration: 0.15 }}
        />
      </div>
    </motion.aside>
  );
}
