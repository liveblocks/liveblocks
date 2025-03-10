export default function Connected({ connected }: { connected: boolean }) {
  if (connected) {
    return <div className="connected">Connected</div>;
  }

  return <div className="notConnected">Not connected</div>;
}
