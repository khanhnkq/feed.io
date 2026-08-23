"use client";

import type { OrganizationResponse } from "@feedio/api-client";
import { createContext, useContext, type ReactNode } from "react";

interface OrganizationContextValue {
  organization: OrganizationResponse;
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

export function OrganizationProvider({
  organization,
  children,
}: {
  organization: OrganizationResponse;
  children: ReactNode;
}) {
  return (
    <OrganizationContext.Provider value={{ organization }}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization(): OrganizationResponse {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error("useOrganization must be used within an OrganizationProvider");
  }
  return context.organization;
}
