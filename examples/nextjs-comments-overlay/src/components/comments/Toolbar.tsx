"use client";

import { Button } from "./Button";
import { useState } from "react";
import { Collapsible as CollapsiblePrimitive } from "radix-ui";
import { NewThread } from "@/components/comments/NewThread";
import { Sidebar } from "@/components/comments/Sidebar";
import { ToolbarAvatars } from "@/components/comments/ToolbarAvatars";
import { SidebarIcon } from "@/components/icons/SidebarIcon";
import styles from "./Toolbar.module.css";
import sidebarStyles from "./Sidebar.module.css";
import { PlusIcon } from "@/components/icons/PlusIcon";

export function Toolbar({ ...props }) {
  const [open, setOpen] = useState(false);

  return (
    <CollapsiblePrimitive.Root
      open={open}
      onOpenChange={setOpen}
      {...props}
      data-hide-cursors
      data-ignore-when-placing-composer
    >
      <div className={styles.toolbar}>
        <div className={styles.toolbarActions}>
          <NewThread>
            <Button variant="ghost" square>
              <PlusIcon width={12} height={12} />
            </Button>
          </NewThread>
        </div>
        <div className={styles.toolbarSeparator} />
        <ToolbarAvatars />
        <div className={styles.toolbarSeparator} />
        <div className={styles.toolbarActions}>
          <CollapsiblePrimitive.Trigger asChild>
            <Button variant="ghost" square>
              <SidebarIcon
                style={{ opacity: open ? "0.7" : "1" }}
                width={12}
                height={12}
              />
            </Button>
          </CollapsiblePrimitive.Trigger>
        </div>
      </div>
      <CollapsiblePrimitive.Content className={sidebarStyles.sidebar}>
        <Sidebar onClose={() => setOpen(false)} />
      </CollapsiblePrimitive.Content>
    </CollapsiblePrimitive.Root>
  );
}
