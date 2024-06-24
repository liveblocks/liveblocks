"use client";

import { useLostConnectionListener } from "@liveblocks/react/suspense";
import { useRef } from "react";
import toast, { Toaster } from "react-hot-toast";

export function LostConnectionToasts() {
  const toastId = useRef<string>();

  useLostConnectionListener((event) => {
    if (event === "lost") {
      toastId.current = toast.loading("Still trying to reconnect…");
    } else if (event === "restored") {
      toast.success("Reconnected", { id: toastId.current });
    } else if (event === "failed") {
      toast.error("Could not reconnect, please refresh", {
        id: toastId.current,
      });
    }
  });

  return (
    <Toaster
      position="top-center"
      toastOptions={{
        style: {
          borderRadius: "10px",
          boxShadow:
            "0 0 0 1px rgba(31, 41, 55, 0.04), 0 2px 4px rgba(31, 41, 55, 0.06), 0 4px 16px -2px rgba(31, 41, 55, 0.12)",
        },
      }}
    />
  );
}
