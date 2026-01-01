import { DocumentsList } from "./DocumentsList";

type Props = {
  filter?: "all" | "private" | "organization" | "public";
};

export async function DocumentsLayout({ filter }: Props) {
  return <DocumentsList filter={filter} />;
}
