export type Props = Omit<
  JSX.IntrinsicElements["button"],
  // Forbidden props
  "disabled" | "style"
> &
  Required<
    Pick<
      JSX.IntrinsicElements["button"],
      // Required props
      "id" | "children"
    >
  > & {
    // Extra (non-standard props)
    subtitle?: string | null;
    enabled?: boolean;
  };

export default function Button(props: Props) {
  // eslint-disable-next-line prefer-const
  let { enabled, ...rest } = props;
  enabled ??= true;
  const opacity = enabled ? undefined : 0.7;
  return (
    <button
      {...rest}
      style={{
        fontSize: "0.75rem",
        minWidth: 70,
        padding: "2px 4px",
        opacity,
      }}
      title={`#${props.id}`}
      disabled={!enabled}
    >
      <strong>{props.children}</strong>
      <br />
      {props.subtitle}
    </button>
  );
}
