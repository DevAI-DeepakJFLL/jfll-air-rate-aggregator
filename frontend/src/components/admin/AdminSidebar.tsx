"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileSpreadsheet,
  Receipt,
  Network,
  ShieldCheck,
  X,
} from "lucide-react";
import { useAdminRole } from "@/context/AdminRoleContext";
import { JfllLogo } from "@/components/common/BrandAssets";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      {
        name: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
        exact: true,
      },
    ],
  },
  {
    title: "Tariffs",
    items: [
      {
        name: "Rate Sheets",
        href: "/admin/tariffs",
        icon: FileSpreadsheet,
      },
    ],
  },
  {
    title: "Cost Configuration",
    items: [
      {
        name: "Charges & Surcharges",
        href: "/admin/charges",
        icon: Receipt,
      },
    ],
  },
  {
    title: "Network",
    items: [
      {
        name: "Corridors & Ports",
        href: "/admin/corridors",
        icon: Network,
      },
    ],
  },
  {
    title: "Governance",
    items: [
      {
        name: "Security & RBAC",
        href: "/admin/security",
        icon: ShieldCheck,
      },
    ],
  },
];

export interface AdminSidebarProps {
  isMobileDrawer?: boolean;
  onClose?: () => void;
  onNavigate?: () => void;
  className?: string;
}

export default function AdminSidebar({
  isMobileDrawer = false,
  onClose,
  onNavigate,
  className = "",
}: AdminSidebarProps) {
  const pathname = usePathname();
  const { isPricingHead } = useAdminRole();

  const isItemActive = (item: NavItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  return (
    <aside
      className={
        isMobileDrawer
          ? `w-full h-full flex flex-col select-none bg-obsidian-950 text-slate-300 ${className}`
          : `hidden lg:flex w-64 bg-obsidian-950 border-r border-obsidian-800 text-slate-300 min-h-screen flex-col shrink-0 sticky top-0 h-screen select-none ${className}`
      }
    >
      {/* Header / Brand Identity */}
      <div className="p-4 border-b border-obsidian-800/80 bg-obsidian-900/40 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <JfllLogo size="md" variant="badge" className="border-obsidian-700/80 shadow-xs" />
          <div className="min-w-0 flex-1">
            <span className="font-extrabold tracking-tight text-white text-sm">
              JET FREIGHT ADMIN
            </span>
            <p className="text-xs font-medium text-slate-400 mt-0.5">
              BOM Mumbai Gateway
            </p>
          </div>
        </div>

        {/* Mobile slide-over close button */}
        {isMobileDrawer && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-obsidian-800 transition-colors shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-1">
            <div className="px-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              {section.title}
            </div>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = isItemActive(item);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => {
                        if (onNavigate) {
                          onNavigate();
                        }
                      }}
                      className={`group flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all ${
                        active
                          ? "bg-obsidian-900 text-amber-400 border-l-2 border-amber-400 font-bold shadow-2xs"
                          : "text-slate-400 hover:text-white hover:bg-obsidian-900/60 font-medium"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 transition-colors ${
                          active
                            ? "text-amber-400"
                            : "text-slate-500 group-hover:text-slate-200"
                        }`}
                      />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer / User Profile & Role Status */}
      <div className="p-3.5 border-t border-obsidian-800/80 bg-obsidian-900/40 mt-auto">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-obsidian-950 font-black text-xs shrink-0 shadow-xs">
            DN
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-white truncate">
              Deepak Naidu
            </div>
            <div className="mt-0.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-xs font-bold text-amber-400 border border-amber-400/30">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                Admin Portal
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
