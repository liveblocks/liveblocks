"use client";

import { useLostConnectionListener } from "../app/liveblocks.config";
import { useEffect, useRef } from "react";
import toast, { Toaster } from "react-hot-toast";

export function LostConnectionToasts() {
  const toastId = useRef<string>();
  /*
  useLostConnectionListener((event) => {
    if (event === "lost") {
       toastId.current = toast("Lost connection, trying to reconnect…");
    } else if (event === "restored") {
      toast.dismiss(toastId.current);
      toast.success("Reconnected!");
    } else if (event === "failed") {
       toastId.current = toast("Could not reconnect, please refresh.");
    }
  });
   */

  useEffect(() => {
    toastId.current = toast.loading("Lost connection, trying to reconnect…");
    toast.success("Reconnected!");
    toast.error("Could not reconnect, please refresh.");

    return () => toast.dismiss(toastId.current);
  }, []);

  return <Toaster position="top-right" />;
}
