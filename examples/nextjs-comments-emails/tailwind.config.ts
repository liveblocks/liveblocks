import type {
  RecursiveKeyValuePair,
  ResolvableTo,
} from "tailwindcss/types/config";
import type { Config } from "tailwindcss";

// Export config specific to emails and define them to make them
// usable in your code editor.
export const emailColors: RecursiveKeyValuePair = {
  mention: "#1667FF",
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
