"use client";

import React from "react";
import { AuthProvider } from "@/components/auth-provider";

export default function ClientAuthWrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
