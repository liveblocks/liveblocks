"use client";

import { useState } from "react";
import { Drawer } from "vaul";
import { Threads } from "./Threads";

const SidebarThreads = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);

  return (
    <Drawer.Root direction="bottom" open={open} onOpenChange={setOpen}>
      <Drawer.Trigger asChild>{children}</Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-2xl" />
        <Drawer.Content className="bg-primary outline-none rounded-t-xl max-w-[calc(100%-2*1rem)] sm:max-w-screen-md mx-auto flex flex-col w-full fixed bottom-0 top-1/3 sm:top-20 sm:rounded-t-2xl inset-x-0 overflow-hidden">
          <Drawer.Title className="shrink-0 font-medium p-4 border-b border-primary sticky top-0 bg-primary z-10">
            Comments
          </Drawer.Title>
          <div className="flex-1 overflow-y-auto">
            <Threads />
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};

export default SidebarThreads;
