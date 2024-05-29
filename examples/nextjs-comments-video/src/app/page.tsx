import { Room } from "@/app/Room";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Threads } from "@/components/Threads";
import styles from "./page.module.css";
import { Presence } from "@/components/Presence";

export default function Home() {
  return (
    <Room>
      <div className={styles.wrapper}>
        <header className={styles.header}>
          <h1>My video name</h1>
          <Presence />
        </header>
        <main className={styles.main}>
          <div className={styles.videoPanel}>
            <VideoPlayer />
          </div>
          <div className={styles.threadsPanel}>
            <Threads />
          </div>
        </main>
      </div>
    </Room>
  );
}
