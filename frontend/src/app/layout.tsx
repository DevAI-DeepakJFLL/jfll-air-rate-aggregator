import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { Plane, ShieldCheck, UploadCloud, Compass } from "lucide-react";

export const metadata: Metadata = {
  title: "Jet Freight Logistics — In-House Air Cargo Rate Aggregator",
  description: "Internal Air Cargo Buying Rate Comparison & Tariff Desk (<500kg Smalls)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen bg-aero-canvas text-slate-800 antialiased flex flex-col font-sans selection:bg-amber-100 selection:text-amber-900">
        {/* Navigation Bar - Flight Deck Obsidian */}
        <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
            <Link
              href="/"
              className="flex items-center gap-3 focus-ring rounded-xl group"
              aria-label="Jet Freight Logistics Home"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-obsidian-900 text-amber-400 shadow-sm group-hover:bg-aero-teal group-hover:text-white transition-all">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-black tracking-tight text-obsidian-900">
                    JET FREIGHT
                  </h1>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-extrabold text-slate-600 tracking-wider">
                    OPERATIONS
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-500">
                  Air Cargo Rate Aggregator &bull;{" "}
                  <span className="text-aero-teal font-bold">&lt; 500kg Smalls Desk</span>
                </p>
              </div>
            </Link>

            <nav className="flex items-center gap-2.5 sm:gap-4">
              <Link
                href="/"
                className="text-xs font-extrabold text-slate-700 hover:text-aero-teal focus-ring rounded-lg px-2.5 py-1.5 transition-colors"
              >
                Rate Discovery
              </Link>
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 focus-ring transition-colors shadow-2xs"
              >
                <UploadCloud className="h-3.5 w-3.5 text-slate-500" />
                <span>Admin Ingestion</span>
              </Link>
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-900 border border-amber-200">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-700" />
                Pure Net Buy (Zero Margin)
              </span>
            </nav>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
          {children}
        </main>

        {/* Precision Footer */}
        <footer className="border-t border-slate-200 bg-white py-4">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between text-xs font-semibold text-slate-500 gap-2">
            <div>Jet Freight Logistics Ltd. &bull; Chhatrapati Shivaji Maharaj International Airport (BOM)</div>
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span>IATA TACT 0.5kg Rule Active</span>
              <span>&bull;</span>
              <span>Break-Even Pivot Engine v1.0</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
