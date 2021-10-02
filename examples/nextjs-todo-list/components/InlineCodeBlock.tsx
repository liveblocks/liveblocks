export default function InlineCodeBlock({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <pre
      className="relative inline font-mono bg-black shadow-thin-border-300 rounded-lg my-4 text-sm text-gray-200 p-2"
      style={{
        minHeight: "36px",
        lineHeight: "1.5em",
      }}
    >
      <code>{children}</code>
    </pre>
  );
}
