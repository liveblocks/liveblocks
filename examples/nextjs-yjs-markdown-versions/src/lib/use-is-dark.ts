"use client";

import { useEffect, useState } from "react";

/**
 * Reactively reflects whether the document root has the `dark` Tailwind
 * class set. The class itself is owned by `ThemeToggle` (and seeded
 * pre-hydration by the inline script in the root layout) so this hook is
 * just a passive observer.
 */
export function useIsDark(): boolean {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const update = () => setDark(root.classList.contains("dark"));
    update();

    const obs = new MutationObserver(update);
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  return dark;
}
