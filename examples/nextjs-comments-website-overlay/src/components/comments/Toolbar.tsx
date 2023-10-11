import { Button } from "./Button";
import styles from "./Toolbar.module.css";
import sidebarStyles from "./Sidebar.module.css";

import { List, Plus } from "@strapi/icons";
import { useState } from "react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { NewThread } from "@/components/comments/NewThread";
import { Sidebar } from "@/components/comments/Sidebar";
import { ToolbarAvatars } from "@/components/comments/ToolbarAvatars";

export function Toolbar({ ...props }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible.Root
      open={open}
      onOpenChange={setOpen}
      {...props}
      data-hide-cursors
    >
      <div className={styles.toolbar}>
        <div className={styles.toolbarActions}>
          <NewThread>
            <Button variant="ghost" square>
              <Plus width={12} height={12} />
            </Button>
          </NewThread>
          <Collapsible.Trigger asChild>
            <Button variant="ghost" square>
              <List width={12} height={12} />
            </Button>
          </Collapsible.Trigger>
        </div>
        <div className={styles.toolbarSeparator} />
        <ToolbarAvatars />
        <div className={styles.toolbarSeparator} />
        <div className={styles.toolbarActions}>
          <Button variant="secondary">Save</Button>
          <Button>Publish</Button>
          {/*<Button variant="ghost" square>*/}
          {/*  <More width={12} height={12} />*/}
          {/*</Button>*/}
        </div>
      </div>
      <Collapsible.Content className={sidebarStyles.sidebar}>
        <Sidebar onClose={() => setOpen(false)} />
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
