import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// `@testing-library/react` only auto-registers `cleanup()` when using globals.
afterEach(() => {
  cleanup();
});

(globalThis as unknown as { jest: typeof vi }).jest = vi;
