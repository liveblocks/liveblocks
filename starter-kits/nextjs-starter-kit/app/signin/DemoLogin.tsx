"use client";

import { signIn } from "next-auth/react";
import { users } from "@/data/users";
import { Select } from "@/primitives/Select";
import styles from "./signin.module.css";

// Used only for demo authentication, displays a dropdown of users
export function DemoLogin() {
  return (
    <div className={styles.actions}>
      <Select
        items={users.map((user) => ({ value: user.id, title: user.name }))}
        onChange={(email) => {
          signIn("credentials", { email });
        }}
        placeholder="Choose a profile…"
      />
    </div>
  );
}
