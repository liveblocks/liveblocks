import type {
  RecursiveKeyValuePair,
  ResolvableTo,
} from "tailwindcss/types/config";
import type { Config } from "tailwindcss";

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

const config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./emails/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        email: { ...emailColors },
      },
    },
  },
} satisfies Config;
export default config;
