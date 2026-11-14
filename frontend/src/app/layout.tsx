import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { Plane, ShieldCheck, UploadCloud } from "lucide-react";

export const metadata: Metadata = {
  title: "Jet Freight Logistics - In-House Air Cargo Rate Aggregator",
  description: "Internal Air Cargo Buying Rate Comparison Tool (<500kg Smalls)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 antialiased flex flex-col">
        {/* Navigation Bar */}
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-jfll-navy text-white shadow-sm">
                <Plane className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-extrabold tracking-tight text-jfll-navy">
                  Jet Freight Logistics
                </h1>
                <p className="text-xs font-semibold text-slate-500">
                  Air Cargo Rate Aggregator <span className="text-jfll-blue">• &lt;500kg Smalls</span>
                </p>
              </div>
            </div>

            <nav className="flex items-center gap-4">
              <Link
                href="/"
                className="text-xs font-bold text-slate-700 hover:text-jfll-blue transition-colors"
              >
                Rate Discovery
              </Link>
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <UploadCloud className="h-3.5 w-3.5 text-slate-500" />
                Admin Ingestion
              </Link>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                <ShieldCheck className="h-3 w-3" />
                Zero-Margin Net Buy
              </span>
            </nav>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
          Jet Freight Logistics Ltd. • Internal Operational Rate Desk • BOM Hub Gateway
        </footer>
      </body>
    </html>
  );
}
