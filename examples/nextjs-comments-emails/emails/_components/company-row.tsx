import { Row, Column, Heading, Text, Img } from "@react-email/components";
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
          "w-[40px]": variant === "header",
          "w-[26px]": variant === "footer",
        })}
      >
        <Img
          // TODO: update img name
          src="https://liveblocks.io/apple-touch-icon.png"
          alt="company logo"
          className={cn({
            "rounded-lg": variant === "header",
            "rounded-md": variant === "footer",
          })}
          width={variant === "header" ? 32 : 20}
          height={variant === "header" ? 32 : 20}
        />
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
