"use client";

import React from "react";
import { Crown } from "lucide-react";

export default function RoleSwitcher() {
  return (
    <div
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-obsidian-950 text-amber-400 border border-obsidian-900 shadow-2xs text-xs font-bold select-none"
      title="Admin Access: Pricing Team Head"
    >
      <Crown className="h-3.5 w-3.5 text-amber-400 shrink-0" />
      <span className="hidden sm:inline">Pricing Team Head</span>
      <span className="sm:hidden">Admin</span>
    </div>
  );
}
