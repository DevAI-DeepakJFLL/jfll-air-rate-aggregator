"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type AdminRole = "PRICING_HEAD" | "COORDINATOR";

interface AdminRoleContextType {
  role: AdminRole;
  setRole: (role: AdminRole) => void;
  isAdmin: boolean;
  isPricingHead: boolean;
}

const STORAGE_KEY = "jfll_admin_role";

const AdminRoleContext = createContext<AdminRoleContextType | undefined>(undefined);

export function AdminRoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<AdminRole>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEY) as AdminRole | null;
        if (stored === "PRICING_HEAD" || stored === "COORDINATOR") {
          return stored;
        }
      } catch {
        // Storage unavailable
      }
    }
    return "PRICING_HEAD";
  });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const setRole = (newRole: AdminRole) => {
    setRoleState(newRole);
    try {
      localStorage.setItem(STORAGE_KEY, newRole);
    } catch {
      // LocalStorage write failed
    }
  };

  const isPricingHead = role === "PRICING_HEAD";
  const isAdmin = isPricingHead;

  return (
    <AdminRoleContext.Provider
      value={{
        role,
        setRole,
        isAdmin,
        isPricingHead,
      }}
    >
      {children}
    </AdminRoleContext.Provider>
  );
}

export function useAdminRole(): AdminRoleContextType {
  const context = useContext(AdminRoleContext);
  if (!context) {
    throw new Error("useAdminRole must be used within an AdminRoleProvider");
  }
  return context;
}
