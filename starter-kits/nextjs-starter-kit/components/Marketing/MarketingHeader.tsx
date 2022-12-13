import clsx from "clsx";
import Link from "next/link";
import { ComponentProps } from "react";
import { SignInIcon } from "../../icons";
import { signIn } from "next-auth/react";
import { Button } from "../../primitives/Button";
import { Container } from "../../primitives/Container";
import { Logo } from "../Logo";
import styles from "./MarketingHeader.module.css";

export function MarketingHeader({
  className,
  ...props
}: ComponentProps<"header">) {
  return (
    <header className={clsx(className, styles.header)} {...props}>
      <Container className={styles.container}>
        <Link href="/">
          <Logo />
        </Link>
        <Button icon={<SignInIcon />} onClick={() => signIn()}>
          Sign in
        </Button>
      </Container>
    </header>
  );
}
