import { useCallback, useState } from "react";

export function useForceRerender() {
  const [count, setCount] = useState(0);
  const f = useCallback(() => {
    setCount((n) => n + 1);
  }, []);
  return [count, f] as const;
}
