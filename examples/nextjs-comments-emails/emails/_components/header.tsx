import { Row, Column, Heading, Img, Link } from "@react-email/components";
import { CompanyInfo } from "../_lib/types";

export function Header(company: CompanyInfo) {
  return (
    <Row className="mb-10">
      <Column className="w-10">
        <Link href={company.url} target="_blank">
          {/* TODO: Update img name by creating a new one for this specific example to work without to deploy this example. */}
          <Img
            src="https://liveblocks.io/apple-touch-icon.png"
            alt="Company logo"
            className="rounded-md"
            width={28}
            height={28}
          />
        </Link>
      </Column>
      <Column>
        <Heading as="h1" className="m-0 text-lg text-black">
          {company.name}
        </Heading>
      </Column>
    </Row>
  );
}
