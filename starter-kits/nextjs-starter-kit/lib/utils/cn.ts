import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class names, used by the shared UI in /components/ui and
 * /components/ai-elements.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
