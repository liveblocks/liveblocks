import styles from "./PageArticle.module.css";
import { getArticle } from "@/lib/strapi";

type Props = {
  slug: string;
};

export async function PageArticle({ slug }: Props) {
  const article = await getArticle(slug);

  return (
    <main className={styles.article}>
      <article>
        <div className={styles.articleHeader}>
          <h1 className={styles.articleTitle}>{article.attributes.Title}</h1>
          <div className={styles.articleDescription}>
            {article.attributes.Description}
          </div>
        </div>
        <div className={styles.articleContent}>
          {article.attributes.Content}
        </div>
      </article>
    </main>
  );
}
