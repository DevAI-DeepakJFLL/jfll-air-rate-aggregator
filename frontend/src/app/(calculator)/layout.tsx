import React from "react";
import Link from "next/link";
import { CalculatorHeader } from "@/components/navigation/CalculatorHeader";
import { JfllLogo } from "@/components/common/BrandAssets";

export default function CalculatorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen flex flex-col bg-aero-canvas">
      <CalculatorHeader />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        {children}
      </main>

      {/* Corporate Branded Footer */}
      <footer className="border-t border-slate-200/80 bg-white/80 py-8 px-4 sm:px-6 mt-12">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <JfllLogo size="sm" variant="badge" />
            <div>
              <span className="font-bold text-slate-800 text-xs block">
                Jet Freight Logistics Ltd.
              </span>
              <span className="text-[11px] text-slate-500">
                Air Cargo Spot &amp; Published Tariff Desk &bull; BOM Sahar Gateway
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>IATA Cargo Agent</span>
            <span>&bull;</span>
            <span>NSE Listed (JETFREIGHT)</span>
            <span>&bull;</span>
            <Link
              href="/admin"
              className="font-bold text-slate-700 hover:text-jfll-blue transition-colors cursor-pointer"
            >
              Admin Portal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
