import { Text } from "@react-email/components";
import { cn } from "../_utils/cn";
import type { HeadlineParts } from "../_utils/comments";

export function Headline({
  parts,
  className,
}: {
  parts: HeadlineParts;
  className?: string;
}) {
  const [start, middle, end] = parts;

  return (
    <Text className={cn("text-sm text-black font-medium m-0", className)}>
      {start} <span className="font-normal">{middle}</span> {end}
    </Text>
  );
}
