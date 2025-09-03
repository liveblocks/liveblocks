"use client";

import { nanoid } from "@liveblocks/core";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/styles/${nanoid()}`);
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div>Loading...</div>
    </div>
  );
}
