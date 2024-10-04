import { Row, Column, Heading, Text } from "@react-email/components";
import { cn } from "../_utils/cn";

export function CompanyRow({
  name,
  variant = "header",
}: {
  name: string;
  url: string;
  variant?: "header" | "footer";
}) {
  return (
    <Row>
      <Column
        className={cn({
          "w-[32px]": variant === "header",
          "w-[26px]": variant === "footer",
        })}
      >
        <div
          className={cn(
            {
              "w-[24px] h-[24px] rounded-lg ": variant === "header",
              "w-[20px] h-[20px] rounded-md": variant === "footer",
            },
            "bg-black flex items-center justify-center"
          )}
        >
          <div
            className={cn(
              {
                "w-[10px] h-[10px]": variant === "header",
                "w-[8px] h-[8px]": variant === "footer",
              },
              "rounded-full bg-white"
            )}
          />
        </div>
      </Column>
      <Column>
        {variant === "header" ? (
          <Heading as="h1" className="m-0">
            {name}
          </Heading>
        ) : (
          <Text className="text-xs font-medium">{name}</Text>
        )}
      </Column>
    </Row>
  );
}
