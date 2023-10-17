import { Room } from "./Room";
import { PageHome } from "@/components/site/PageHome";
import { Cursors } from "@/components/cursors/Cursors";
import { Comments } from "@/components/comments/Comments";

export default function Home() {
  return (
    <Room>
      <PageHome />
      <Cursors />
      <Comments />
    </Room>
  );
}
