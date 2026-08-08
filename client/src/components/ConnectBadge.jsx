// Clearly a SIMULATED status indicator — the demo makes no external API call.
// (A real product would replace this badge with a genuine integration check.)
export default function ConnectBadge({ connected }) {
  return (
    <div
      className={`connect-badge ${connected ? 'is-on' : 'is-off'}`}
      title="Simulated demo indicator — no external blood-network API is called"
    >
      <span className="dot" />
      <span>{connected ? 'Connected' : 'Offline'}</span>
      <strong>e-RaktKosh (demo)</strong>
    </div>
  );
}