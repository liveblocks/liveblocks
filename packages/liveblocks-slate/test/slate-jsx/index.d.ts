// This allows tests to include Slate Nodes written in JSX without TypeScript complaining.
declare namespace jsx.JSX {
	interface IntrinsicElements {
		// rome-ignore lint/suspicious/noExplicitAny:
		[elemName: string]: any;
	}
}
