import { Room } from "@/components/Room";
import { Comments } from "@/components/comments/Comments";
import { Cursors } from "@/components/cursors/Cursors";
import { EditableTextMenu } from "@/components/editable/EditableTextMenu";
import { PageLayers2 } from "@/components/site/PageLayers2";

export default async function Home() {
  return (
    <Room>
      <EditableTextMenu>
        <PageLayers2 />
        <Cursors />
        <Comments />
      </EditableTextMenu>
    </Room>
  );
}
