"use client";
import React from "react";
import SWRProvider from "./SWRProvider";

export default function SWRBoundary({ children }: { children: React.ReactNode }) {
  return <SWRProvider>{children}</SWRProvider>;
}
