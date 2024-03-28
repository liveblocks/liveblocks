"use client";

import { getProviders, signIn } from "next-auth/react";
import { ComponentProps } from "react";
import { Button } from "@/primitives/Button";
import styles from "./signin.module.css";

interface Props extends ComponentProps<"div"> {
  providers?: Awaited<ReturnType<typeof getProviders>>;
}

export function NextAuthLogin({ providers }: Props) {
  if (!providers) {
    return <h4 className={styles.error}>No NextAuth providers enabled</h4>;
  }

  return (
    <div className={styles.actions}>
      {Object.values(providers).map((provider) => (
        <Button key={provider.name} onClick={() => signIn(provider.id)}>
          Sign in with {provider.name}
        </Button>
      ))}
    </div>
  );
}
