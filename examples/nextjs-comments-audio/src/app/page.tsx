import { Room } from "@/app/Room";
import { Threads } from "@/components/Threads";
import { Presence } from "@/components/Presence";
import { AudioPlayer } from "@/components/AudioPlayer";
import styles from "./page.module.css";

export default function Home() {
  return (
    <Room>
      <div className={styles.wrapper}>
        <header className={styles.header}>
          <h1>Currently listening</h1>
          <Presence />
        </header>
        <main className={styles.main}>
          <AudioPlayer />
          <Threads />
        </main>
      </div>
    </Room>
  );
}
