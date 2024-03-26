import DefaultLink from "next/link";
import { ComponentProps } from "react";

interface LinkProps extends Omit<ComponentProps<typeof DefaultLink>, "href"> {
  href?: string;
}

export function Link({ href, ...props }: LinkProps) {
  return href ? <DefaultLink href={href} {...props} /> : <a {...props} />;
}
