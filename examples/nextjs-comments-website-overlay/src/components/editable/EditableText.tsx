import { EditableTextClient } from "@/components/editable/EditableTextClient";
import { getStrapiData, updateStrapiData } from "@/lib/strapi";

type Props = {
  strapiApiId: string;
  attribute: string;
};

export async function EditableText(props: Props) {
  const { strapiApiId, attribute } = props;
  const data = (await getStrapiData(strapiApiId)).attributes[attribute];

  async function handleRevalidate() {
    "use server";

    return (await getStrapiData(strapiApiId)).attributes[attribute];
  }

  async function handleUpdate(text: string) {
    "use server";

    await updateStrapiData(strapiApiId, {
      [attribute]: text,
    });

    return true;
  }

  return (
    <EditableTextClient
      initial={data}
      onUpdate={handleUpdate}
      onRevalidate={handleRevalidate}
      {...props}
    />
  );
}
