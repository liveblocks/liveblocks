"use client";

import { useLostConnectionListener } from "@/app/liveblocks.config";
import { useRef } from "react";
import toast, { Toaster } from "react-hot-toast";

export function LostConnectionToasts() {
  const toastId = useRef<string>();

  useLostConnectionListener((event) => {
    if (event === "lost") {
      toastId.current = toast.loading("Lost connection, trying to reconnect…");
    } else if (event === "restored") {
      toastId.current = toast.success("Reconnected!", { id: toastId.current });
    } else if (event === "failed") {
      toastId.current = toast("Could not reconnect, please refresh.", {
        id: toastId.current,
      });
    }
  });

  return <Toaster position="top-right" />;
}
