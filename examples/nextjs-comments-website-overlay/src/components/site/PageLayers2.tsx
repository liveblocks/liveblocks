import Hero from "./Hero";
import { EditableText } from "@/components/editable/EditableText";

export async function PageLayers2() {
  return (
    <main style={{ position: "relative" }}>
      <Hero />
      <div
        style={{
          position: "absolute",
          left: "140px",
          top: "250px",
          fontSize: "50px",
          color: "rgba(255, 255, 255, 0.2)",
        }}
      >
        <EditableText
          strapiApiId={"marketing-text"}
          attribute={"HeroDescription"}
        />
      </div>
      <div
        style={{
          opacity: 0.2,
          background: "green",
          position: "absolute",
          inset: 0,
        }}
      ></div>
    </main>
  );
}
