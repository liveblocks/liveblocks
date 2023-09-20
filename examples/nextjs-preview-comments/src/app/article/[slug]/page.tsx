import { PageArticle } from "@/components/site/PageArticle";
import { Room } from "@/components/comments/Room";
import { Comments } from "@/components/comments/Comments";

export default async function Article({
  params,
}: {
  params: { slug: string };
}) {
  return (
    <Room>
      <PageArticle slug={params.slug} />
      <Comments />
    </Room>
  );
}
