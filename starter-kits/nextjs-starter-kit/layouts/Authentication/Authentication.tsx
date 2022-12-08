import clsx from "clsx";
import { ComponentProps } from "react";
import { signIn } from "next-auth/react";
import { users } from "../../data/users";
import { Button } from "../../primitives/Button";
import { Select } from "../../primitives/Select";
import { getProviders } from "next-auth/react";
import styles from "./Authentication.module.css";

interface Props extends ComponentProps<"div"> {
  providers?: Awaited<ReturnType<typeof getProviders>>;
}

export function AuthenticationLayout({
  providers,
  className,
  ...props
}: Props) {
  return (
    <div className={clsx(className, styles.container)} {...props}>
      <main className={styles.main}>
        <h2 className={styles.title}>Sign in to your account</h2>
        {providers && providers.credentials ? (
          <DemoLogin />
        ) : (
          <NextAuthLogin providers={providers} />
        )}
      </main>
      <aside className={styles.aside} />
    </div>
  );
}

function NextAuthLogin({ providers }: Props) {
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

// === EVERYTHING BELOW ONLY NECESSARY FOR DEMO AUTH ===========================

function DemoLogin() {
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
