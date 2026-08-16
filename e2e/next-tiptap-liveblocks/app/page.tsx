"use client";

import { nanoid } from "@liveblocks/client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/rooms/e2e-tiptap-${nanoid()}`);
  }, [router]);

  return <div>Creating room...</div>;
}
