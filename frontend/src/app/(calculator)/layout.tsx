import React from "react";
import { CalculatorHeader } from "@/components/navigation/CalculatorHeader";

export default function CalculatorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen flex flex-col">
      <CalculatorHeader />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        {children}
      </main>
    </div>
  );
}
