import { useState, useEffect } from "react";

export function useHydrated() {
  const [isHydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return isHydrated;
}
