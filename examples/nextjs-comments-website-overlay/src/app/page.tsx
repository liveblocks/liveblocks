import { PageHome } from "@/components/site/PageHome";
import { Room } from "@/components/Room";
import { Comments } from "@/components/comments/Comments";
import { Cursors } from "@/components/cursors/Cursors";

export default async function Home() {
  return (
    <Room>
      <PageHome />
      <Cursors />
      <Comments />
    </Room>
  );
}
