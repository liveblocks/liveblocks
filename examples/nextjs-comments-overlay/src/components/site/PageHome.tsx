"use client";

import { useErrorListener } from "@/liveblocks.config";
import Hero from "./Hero";

export function PageHome() {
  useErrorListener((error) => {
    console.log("Error", error.message);
    switch (error.code) {
      case -1:
        // Authentication error
        break;

      case 4001:
        // Could not connect because you don't have access to this room
        break;

      case 4005:
        // Could not connect because room was full
        break;

      case 4006:
        // Could not connect because roomId was updated
        console.log("roomId updated to:", error.message);
        break;

      default:
        // Unexpected error
        break;
    }
  });
  return (
    <main>
      <Hero />
    </main>
  );
}
