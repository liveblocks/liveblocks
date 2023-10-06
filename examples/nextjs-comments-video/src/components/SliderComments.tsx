import { useThreads } from "@/liveblocks.config";

export function SliderComments() {
  const { threads } = useThreads();

  return (
    <div>
      hello
      {threads.map((thread) => (
        <div key={thread.id}>
          {thread.comments?.[0] ? (
            <div>{JSON.stringify(thread.comments[0].body)}</div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
