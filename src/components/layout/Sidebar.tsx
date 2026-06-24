"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, BookOpen, GitBranch, Code2, BarChart2, Settings, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Agent Space",    href: "/dashboard",    icon: Bot       },
  { label: "Knowledge Base", href: "/knowledge-base", icon: BookOpen  },
  { label: "Workflow",       href: "/workflow",        icon: GitBranch },
  { label: "Embed Code",     href: "/embed-code",      icon: Code2     },
  { label: "Analytics",      href: "/analytics",       icon: BarChart2 },
  { label: "Customer Inquiries", href: "/inquiries",   icon: MessageSquare },
];

const MIN_W     = 160;
const MAX_W     = 340;
const DEFAULT_W = 200;
const ICON_W    = 64;
const SNAP_AT   = 110;

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed,     setCollapsed]    = useState(false);
  const [width,         setWidth]        = useState(DEFAULT_W);
  const [dragging,      setDragging]     = useState(false);

  const onDragHandleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = collapsed ? ICON_W : width;
    setDragging(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev: MouseEvent) => {
      const next = startW + (ev.clientX - startX);
      if (next < SNAP_AT) { setCollapsed(true); } 
      else { setCollapsed(false); setWidth(Math.max(MIN_W, Math.min(MAX_W, next))); }
    };
    const onUp = () => {
      setDragging(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [collapsed, width]);

  const toggleCollapse  = () => setCollapsed((c) => !c);
  const displayWidth    = collapsed ? ICON_W : width;

  return (
    <motion.aside
      animate={{ width: displayWidth }}
      transition={{ duration: dragging ? 0 : 0.22, ease: "easeInOut" }}
      className="relative flex flex-col shrink-0 h-full select-none bg-white border-r border-slate-100 shadow-sm z-50"
      style={{ minWidth: displayWidth, overflow: "hidden" }}
    >
      <button
        onClick={toggleCollapse}
        className="flex items-center justify-start shrink-0 w-full text-left group relative"
        style={{ padding: collapsed ? "20px 0" : "20px 24px" }}
      >
        <AnimatePresence initial={false}>
          {collapsed ? (
            <motion.div key="icon" className="flex items-center justify-center w-full shrink-0">
              <Image
                src="/logo.png"
                alt="Logo"
                width={32}
                height={32}
                quality={100}
                priority
                className="object-contain"
              />
            </motion.div>
          ) : (
            <motion.div key="full" className="flex items-center justify-start w-full">
              <Image
                src="/logo.png"
                alt="CyberAgent Studio"
                width={160}
                height={40}
                quality={100}
                priority
                className="h-10 w-auto object-contain"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      <div className="h-px bg-slate-100 mx-6 mb-5 mt-1" />

      <nav className="flex flex-col gap-1 px-3 flex-1">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link key={href} href={href} prefetch={true} className={cn("group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150", active ? "bg-blue-50/60 text-blue-600 font-semibold border-l-[3px] border-blue-600 pl-[11px]" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50/80")}>
              <Icon size={16} className={cn("shrink-0", active ? "text-blue-600" : "text-slate-400")} />
              {!collapsed && <span className="whitespace-nowrap overflow-hidden">{label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1 min-h-0" />

      <div className="px-3 pb-5 pt-2">
        <div className="h-px bg-slate-100 mb-3 mx-3" />
        <Link href="/settings" prefetch={true} className={cn("group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50/80")}>
          <Settings size={16} className="text-slate-400" />
          {!collapsed && <span>Settings</span>}
        </Link>
      </div>

      <div onMouseDown={onDragHandleMouseDown} className="absolute top-0 right-0 bottom-0 w-1.5 cursor-col-resize z-50" />
    </motion.aside>
  );
}