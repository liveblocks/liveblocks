"use client";

import { useState, useEffect } from "react";

export type Scenario = "auth-hidden" | "anonymous" | "auth-visible";

const STORAGE_KEY = "liveblocks-scenario";

export function useScenario() {
  const [scenario, setScenario] = useState<Scenario>("auth-visible");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (
      stored &&
      ["auth-hidden", "anonymous", "auth-visible"].includes(stored)
    ) {
      setScenario(stored as Scenario);
    }
    setIsLoaded(true);
  }, []);

  const updateScenario = (newScenario: Scenario) => {
    setScenario(newScenario);
    localStorage.setItem(STORAGE_KEY, newScenario);
    window.location.reload();
  };

  return { scenario, updateScenario, isLoaded };
}
