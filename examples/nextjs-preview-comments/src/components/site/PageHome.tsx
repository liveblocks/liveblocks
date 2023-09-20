import { ArticleList } from "./ArticleList";
import styles from "./PageHome.module.css";
import { getMarketingText } from "@/lib/strapi";
import { EditableText } from "@/components/editable/EditableText";

export async function PageHome() {
  const marketingText = await getMarketingText();

  return (
    <main className={styles.home}>
      <div className={styles.homeHeader}>
        <h1 className={styles.homeTitle}>
          <EditableText
            strapiApiId={"marketing-text"}
            attribute={"BlogTitle"}
          />
        </h1>
        <div className={styles.homeDescription}>
          <EditableText
            strapiApiId={"marketing-text"}
            attribute={"BlogDescription"}
          />
        </div>
      </div>
      <ArticleList />
    </main>
  );
}
