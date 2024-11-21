"use client";

import { Room } from "@/app/Room";
import { Kanban } from "@/components/Kanban";

export default function Home() {
  return (
    <Room>
      <div className="w-[800px] mx-auto mt-12">
        <Kanban />
      </div>
    </Room>
  );
}
