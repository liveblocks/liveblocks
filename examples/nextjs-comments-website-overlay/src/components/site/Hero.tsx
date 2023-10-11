import { Star } from "@strapi/icons";
import { EditableText } from "../editable/EditableText";
import styles from "./Hero.module.css";

export default function Hero() {
  return (
    <div className={styles.Hero}>
      <div className={styles.HeroWrapper}>
        <div className={styles.HeroSubtitle}>
          <Star width={12} height={12} />
          <EditableText
            strapiApiId={"marketing-text"}
            attribute={"HeroSubtitle"}
          />
        </div>
        <h1 className={styles.HeroTitle}>
          <EditableText
            strapiApiId={"marketing-text"}
            attribute={"HeroTitle"}
          />
        </h1>
        <p className={styles.HeroDescription}>
          <EditableText
            strapiApiId={"marketing-text"}
            attribute={"HeroDescription"}
          />
        </p>
        <div className={styles.HeroButtons}>
          <button className="button">Get Started</button>
          <button className="button button-secondary">Read Docs</button>
        </div>
        <div className={styles.HeroScreenshot} />
      </div>
    </div>
  );
}
