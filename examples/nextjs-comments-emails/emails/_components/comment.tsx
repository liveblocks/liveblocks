import { CommentEmailAsReactData } from "@liveblocks/emails";
import { Section, Row, Column, Img, Button } from "@react-email/components";
import { cn } from "../_utils/cn";

type CommentProps = CommentEmailAsReactData & {
  isHighlighted?: boolean;
  className?: string;
};

export function Comment({
  id,
  author,
  createdAt,
  reactBody,
  url,
  isHighlighted,
  className,
}: CommentProps) {
  const creationDate = createdAt
    .toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .replace(",", "");

  return (
    <Section
      key={id}
      className={cn("rounded-md py-4 pl-4 pr-8", className)}
      // NOTE: `react-email` do not interpret correctly borders
      // in `className` attribute w/ `tailwindcss`.
      style={{ border: "solid 1px rgba(23, 23, 23, 0.10)" }}
    >
      <Row>
        <Column className="w-10">
          <Img
            className="rounded-full bg-black/5"
            width={28}
            height={28}
            src={author.info.avatar}
          />
        </Column>
        <Column className="text-black">
          <span className="text-sm font-medium">{author.info.name}</span>
          <span className="ml-1.5 opacity-60 text-xs">{creationDate}</span>
        </Column>
      </Row>
      <Row>
        <Column className="w-10" />
        <Column>
          {reactBody}
          <Button
            className={cn(
              "rounded px-3.5 py-2 text-sm font-medium w-max mt-4",
              isHighlighted ? "bg-black text-white" : "bg-black/5 text-black"
            )}
            href={url}
          >
            View comment
          </Button>
        </Column>
      </Row>
    </Section>
  );
}
