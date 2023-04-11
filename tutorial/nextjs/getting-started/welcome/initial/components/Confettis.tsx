import { useWindowSize } from "@/utils";
import Confetti from "react-confetti";

export default function Confettis() {
  const { width, height } = useWindowSize();

  return (
    <Confetti
      width={width}
      height={height}
      numberOfPieces={300}
      colors={["#9F8DFC", "#A1A0A7", "#FFFFFF"]}
      gravity={0.04}
      recycle={false}
    />
  );
}
