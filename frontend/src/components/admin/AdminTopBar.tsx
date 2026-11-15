"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, ExternalLink, Plane, Building2 } from "lucide-react";
import RoleSwitcher from "./RoleSwitcher";

const ROUTE_LABELS: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/tariffs": "Rate Sheets",
  "/admin/charges": "Charges & Surcharges",
  "/admin/corridors": "Corridors & Ports",
  "/admin/security": "Security & RBAC",
};

export default function AdminTopBar() {
  const pathname = usePathname();

  // Derive active breadcrumb label
  const currentLabel =
    ROUTE_LABELS[pathname] ||
    (pathname.startsWith("/admin/tariffs")
      ? "Rate Sheets"
      : pathname.startsWith("/admin/charges")
      ? "Charges & Surcharges"
      : pathname.startsWith("/admin/corridors")
      ? "Corridors & Ports"
      : pathname.startsWith("/admin/security")
      ? "Security & RBAC"
      : "Control Desk");

  return (
    <header className="h-16 border-b border-slate-200 bg-white/95 backdrop-blur px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      {/* Left: Dynamic Breadcrumbs & Gateway Hub Pill */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
          <Link
            href="/admin"
            className="font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            Admin
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="font-extrabold text-slate-900 truncate">
            {currentLabel}
          </span>
        </nav>

        <div className="hidden lg:flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
          <Plane className="h-3 w-3 text-jfll-blue" />
          <span>BOM Terminal 2 Hub (CSMIA)</span>
        </div>
      </div>

      {/* Right: Role Simulator Toggle & Live Calculator External Link */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <RoleSwitcher />

        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          title="Open Coordinator Rate Discovery Calculator in new tab"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-jfll-blue hover:border-slate-400 hover:bg-slate-50 shadow-2xs transition-all cursor-pointer shrink-0"
        >
          <span>Live Calculator</span>
          <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
        </Link>
      </div>
    </header>
  );
}
