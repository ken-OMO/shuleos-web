"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";

export function useAuth() {
  const store = useAuthStore();
  const finishHydration = useAuthStore((state) => state.finishHydration);
  useEffect(() => {
    void Promise.resolve(useAuthStore.persist.rehydrate()).then(finishHydration);
  }, [finishHydration]);
  return store;
}
