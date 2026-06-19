"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, BookOpen, GitBranch, Code2, BarChart2, Settings, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Agent Space",     href: "/dashboard",    icon: Bot       },
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
      className="relative flex flex-col shrink-0 h-full select-none bg-white border-r border-slate-100 shadow-sm z-50"
      style={{
        minWidth: displayWidth,
        overflow: "hidden",
      }}
    >
      {/* ── Logo / toggle ── */}
      <button
        onClick={toggleCollapse}
        className="flex items-center gap-3 px-4 py-5 shrink-0 w-full text-left group relative"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-xl shrink-0 transition-all duration-300 group-hover:scale-105 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 group-hover:border-blue-400 shadow-sm">
          <Zap size={14} className="text-blue-600 fill-blue-600/10" />
        </div>

        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.14 }}
              className="text-[13px] font-extrabold text-slate-900 tracking-tight whitespace-nowrap"
            >
              CyberAgent Studio
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <div className="mx-4 mb-4 h-px bg-slate-100" />

      {/* ── Nav items ── */}
      <nav className="flex flex-col gap-1 px-2.5 flex-1">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active =
            pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150",
                active
                  ? "bg-blue-50/60 text-blue-600 font-semibold border-l-[3px] border-blue-600 pl-[11px]"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50/80"
              )}
            >
              <Icon
                size={16}
                className={cn("shrink-0 transition-transform duration-200 group-hover:scale-105", active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")}
              />

              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="whitespace-nowrap overflow-hidden tracking-wide"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* ── Settings (bottom section) ── */}
      <div className="px-2.5 pb-5">
        <div className="mx-1.5 mb-3 h-px bg-slate-100" />
        <Link
          href="/settings"
          className={cn(
            "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150",
            pathname === "/settings"
              ? "bg-blue-50/60 text-blue-600 font-semibold border-l-[3px] border-blue-600 pl-[11px]"
              : "text-slate-500 hover:text-slate-900 hover:bg-slate-50/80"
          )}
        >
          <Settings
            size={16}
            className={cn("shrink-0 transition-transform duration-200 group-hover:rotate-45", pathname === "/settings" ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")}
          />
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}
                className="whitespace-nowrap overflow-hidden tracking-wide">
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
        className="absolute top-0 right-0 bottom-0 w-1.5 z-50 transition-colors"
        style={{ cursor: "col-resize" }}
      >
        <motion.div
          className="absolute inset-y-0 right-0 w-[2px]"
          animate={{
            opacity: dragging ? 1 : handleHover ? 0.6 : 0,
            background: dragging ? "#3b82f6" : "rgba(0,0,0,0.1)",
            boxShadow: dragging ? "0 0 8px #3b82f6" : "none"
          }}
          transition={{ duration: 0.15 }}
        />
      </div>
    </motion.aside>
  );
}