import styles from "./Hero.module.css";
import { StarIcon } from "@/components/icons/StarIcon";

export default function Hero() {
  return (
    <div className={styles.Hero}>
      <div className={styles.HeroWrapper}>
        <a 
          href="https://liveblocks.io/blog/meet-liveblocks-3-0-the-fastest-way-to-let-your-users-collaborate-with-ai-in-your-product"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.HeroSubtitle}
        >
          <StarIcon width={12} height={12} />
          New: Liveblocks 3.0 with AI Copilots
        </a>
        <h1 className={styles.HeroTitle}>Think better with Acme</h1>
        <p className={styles.HeroDescription}>
          Never miss a note, idea, or connection.
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
