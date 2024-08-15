"use client";

import { Room } from "@/app/Room";
import { YjsTldraw } from "@/components/YjsTldraw";

/**
 * IMPORTANT: LICENSE REQUIRED
 * To use tldraw commercially, you must first purchase a license
 * Learn more: https://tldraw.dev/community/license
 */

export default function Home() {
  return (
    <Room>
      <YjsTldraw />
    </Room>
  );
}
