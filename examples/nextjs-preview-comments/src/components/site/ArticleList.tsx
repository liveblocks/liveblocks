import { getArticles } from "@/lib/strapi";
import styles from "./ArticleList.module.css";

export async function ArticleList() {
  const articles = await getArticles();
  return (
    <div className={styles.articleList}>
      {articles.map(({ id, attributes }) => {
        const date = new Date(attributes.Date);
        return (
          <article key={id}>
            <div className={styles.articleInfo}>
              <time
                dateTime={date.toISOString()}
                className={styles.articleDate}
              >
                {date.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </time>
              <h2 className={styles.articleTitle}>
                <a href={`/article/${attributes.Slug}`}>{attributes.Title}</a>
              </h2>
              <p className={styles.articleDescription}>
                {attributes.Description}
              </p>
              {/*{attributes.authors ? (*/}
              {/*  <div>*/}
              {/*    {attributes.authors.map((author) => (*/}
              {/*      <div>{author.name}</div>*/}
              {/*    ))}*/}
              {/*  </div>*/}
              {/*) : null}*/}
            </div>
          </article>
        );
      })}
    </div>
  );
}
