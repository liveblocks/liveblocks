import type { PropsWithChildren } from "react";
import * as React from "react";

// import Button from "../../utils/Button";

export function Button({ children }: PropsWithChildren) {
  return <button>{children}</button>;
}

export default function Home() {
  return (
    <div style={{ fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div
          style={{
            width: "32%",
            height: "95vh",
            border: "1px solid gray",
          }}
        >
          <h2>Client A</h2>
          <Button>Sync to Server</Button>
          <Client name="A" />
        </div>

        <div
          style={{
            width: "32%",
            height: "95vh",
            border: "1px solid navy",
          }}
        >
          <h2>Server</h2>
          <Button>Sync to Client A</Button>
          <Button>Sync to Client B</Button>
        </div>

        <div
          style={{
            width: "32%",
            height: "95vh",
            border: "1px solid gray",
          }}
        >
          <h2>Client B</h2>
          <Button>Sync to Server</Button>
          <Client name="B" />
        </div>
      </div>
    </div>
  );
}

function Client(props: { name: string }) {
  const [pending, setPending] = React.useState([]);
  return (
    <div>
      <h2>Client {props.name}</h2>
      <h3>Pending</h3>
      <ul>
        {pending.length > 0 ? (
          pending.map((item) => <li key={item}>{item}</li>)
        ) : (
          <li>—</li>
        )}
      </ul>
    </div>
  );
}
