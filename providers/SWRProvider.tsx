"use client";

import { SWRConfig } from "swr";
import React from "react";

// A robust global fetcher with JSON handling and error surfacing
async function defaultFetcher(input: string | URL | Request) {
  const res = await fetch(input.toString(), {
    // Include credentials for same-origin APIs if needed
    credentials: "same-origin",
    headers: {
      Accept: "application/json, text/plain, */*",
    },
  });

  // Try to parse JSON, but gracefully handle empty bodies
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const error: any = new Error(payload?.message || res.statusText || "Request failed");
    error.status = res.status;
    error.payload = payload;
    throw error;
  }

  return payload ?? null;
}

export default function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher: defaultFetcher,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        dedupingInterval: 5000,
        errorRetryCount: 3,
        // Exponential backoff for retries
        errorRetryInterval: 2000,
        onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
          // Do not retry on 404 or 401
          if ((error as any)?.status === 404 || (error as any)?.status === 401) return;
          // Stop retrying after specified count
          if (retryCount >= (config.errorRetryCount ?? 3)) return;
          // Retry after the interval
          setTimeout(() => revalidate({ retryCount }), config.errorRetryInterval ?? 2000);
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
