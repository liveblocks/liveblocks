import { PageHome } from "@/components/site/PageHome";
import { Room } from "@/components/comments/Room";
import { Comments } from "@/components/comments/Comments";
import { Cursors } from "@/components/comments/Cursors";

export default async function Home() {
  return (
    <Room>
      <PageHome />
      <Comments />
      <Cursors />
    </Room>
  );
}
