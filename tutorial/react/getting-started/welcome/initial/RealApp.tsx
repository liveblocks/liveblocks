import { ready } from "./App";

export default function Page() {
  if (!ready) {
    return <h1>Welcome!</h1>;
  }

  return (
    <>
      <h1>Let’s start!</h1>
    </>
  );
}
