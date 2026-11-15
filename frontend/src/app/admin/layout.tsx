"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { AdminRoleProvider } from "@/context/AdminRoleContext";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminTopBar from "@/components/admin/AdminTopBar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile drawer automatically when route changes
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  // Handle Escape key to dismiss mobile drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileNavOpen(false);
      }
    };
    if (mobileNavOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [mobileNavOpen]);

  return (
    <AdminRoleProvider>
      <div className="flex min-h-screen bg-slate-50 font-sans">
        {/* Desktop Fixed/Sticky Sidebar (hidden < lg) */}
        <AdminSidebar />

        {/* Mobile Slide-Over Drawer & Backdrop (< lg) */}
        {mobileNavOpen && (
          <div className="lg:hidden fixed inset-0 z-50">
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-50 bg-obsidian-950/60 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileNavOpen(false)}
              aria-hidden="true"
            />
            {/* Slide-In Drawer */}
            <div className="fixed inset-y-0 left-0 z-50 w-72 bg-obsidian-950 border-r border-obsidian-800 text-slate-300 flex flex-col shadow-2xl animate-in slide-in-from-left duration-200">
              <AdminSidebar
                isMobileDrawer
                onClose={() => setMobileNavOpen(false)}
                onNavigate={() => setMobileNavOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Main Administrative Viewport */}
        <div className="flex-1 flex flex-col min-w-0">
          <AdminTopBar onOpenMobileNav={() => setMobileNavOpen(true)} />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </AdminRoleProvider>
  );
}
