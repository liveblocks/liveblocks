"use client";

import { nanoid } from "@liveblocks/core";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    const chatId1 = nanoid();
    const chatId2 = nanoid();
    router.replace(`/dual-chat/${chatId1}/${chatId2}`);
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div>Loading...</div>
    </div>
  );
}
