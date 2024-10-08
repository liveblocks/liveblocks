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
          // TODO: update img name by creating a new one
          // for this specific example to work without to
          // deploy this example.
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
          <Heading as="h1" className="m-0 text-email-foreground">
            {name}
          </Heading>
        ) : (
          <Text className="text-xs font-medium text-email-foreground">
            {name}
          </Text>
        )}
      </Column>
    </Row>
  );
}
