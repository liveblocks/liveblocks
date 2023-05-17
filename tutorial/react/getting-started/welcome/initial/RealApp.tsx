import { ready } from "./App";
import Confettis from "./components/Confettis";

export default function Page() {
  if (!ready) {
    return <h1>Welcome!</h1>;
  }

  return (
    <>
      <h1>Let’s start!</h1>
      <Confettis />
    </>
  );
}
