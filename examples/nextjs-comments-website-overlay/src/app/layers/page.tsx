import { Room } from "@/components/Room";
import { Comments } from "@/components/comments/Comments";
import { Cursors } from "@/components/cursors/Cursors";
import { EditableTextMenu } from "@/components/editable/EditableTextMenu";
import { PageLayers } from "@/components/site/PageLayers";

export default async function Home() {
  return (
    <Room>
      <EditableTextMenu>
        <PageLayers />
        <Cursors />
        <Comments />
      </EditableTextMenu>
    </Room>
  );
}
