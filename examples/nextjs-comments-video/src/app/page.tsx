import { Room } from "@/app/Room";
import { VideoComments } from "@/components/VideoComments";

export default function Home() {
  return (
    <main>
      <Room>
        <VideoComments />
      </Room>
    </main>
  );
}
