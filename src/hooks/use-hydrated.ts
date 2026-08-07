"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/** Returns true only after client-side hydration to avoid SSR/localStorage mismatch. */
export function useHydrated() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
