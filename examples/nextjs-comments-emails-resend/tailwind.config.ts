import type { Config } from "tailwindcss";
import { emailColors } from "./emails/_styles/colors";

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
