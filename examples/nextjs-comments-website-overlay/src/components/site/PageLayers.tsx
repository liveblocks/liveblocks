import Hero from "./Hero";

export async function PageLayers() {
  return (
    <main style={{ position: "relative" }}>
      <Hero />
      {/*<div style={{ position: "absolute", left: "100px", top: "50px" }}>*/}
      {/*  <Hero />*/}
      {/*</div>*/}
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
