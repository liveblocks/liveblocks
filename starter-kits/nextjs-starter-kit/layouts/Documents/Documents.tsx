import { DocumentsList } from "./DocumentsList";

type Props = {
  filter?: "all";
};

export async function DocumentsLayout({ filter }: Props) {
  return <DocumentsList filter={filter} />;
}
