import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jet Freight Logistics | In-House Air Cargo Rate Aggregator",
  description: "Internal Air Cargo Buying Rate Comparison & Tariff Desk",
  icons: {
    icon: "/jfll-logo.png",
    shortcut: "/jfll-logo.png",
    apple: "/jfll-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-aero-canvas text-slate-800 antialiased font-sans selection:bg-amber-100 selection:text-amber-900">
        {children}
      </body>
    </html>
  );
}
