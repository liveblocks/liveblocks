import { PropsWithChildren } from "react";
import { CustomText } from "@/src/types";

type Props = PropsWithChildren<{
  attributes: Record<string, string>;
  leaf: CustomText;
}>;

export function Leaf({ attributes, children, leaf }: Props) {
  if (leaf.bold) {
    children = <strong>{children}</strong>;
  }

  if (leaf.italic) {
    children = <em>{children}</em>;
  }

  if (leaf.underline) {
    children = <u>{children}</u>;
  }

  return <span {...attributes}>{children}</span>;
}
