"use client";

import { nanoid } from "@liveblocks/core";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/todo/${nanoid()}`);
  }, [router]);

  // Show loading while redirecting
  return (
    <div className="flex items-center justify-center h-screen">
      <div>Loading...</div>
    </div>
  );
}