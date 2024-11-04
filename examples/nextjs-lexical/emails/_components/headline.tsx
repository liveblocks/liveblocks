import { Text } from "@react-email/components";
import { cn } from "../_utils/cn";

export function Headline({
  parts,
  className,
}: {
  parts: [string, string, string];
  className?: string;
}) {
  const [start, middle, end] = parts;

  return (
    <Text className={cn("text-sm text-black font-medium m-0", className)}>
      {start} <span className="font-normal">{middle}</span> {end}
    </Text>
  );
}
