import type { RecursiveKeyValuePair } from "tailwindcss/types/config";

// Export config specific to emails and define them to make them
// usable in your code editor.
export const emailColors: RecursiveKeyValuePair = {
  foreground: "#111111",
  mention: "#1667FF",
  headline: "#171717",
  comment: {
    background: "#EEEEEE",
    foreground: {
      DEFAULT: "#171717",
      subtle: "rgba(23, 23, 23, 0.6)",
    },
  },
};
