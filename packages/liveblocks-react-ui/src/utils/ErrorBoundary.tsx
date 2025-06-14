import type { ComponentType, ErrorInfo, ReactNode } from "react";
import { Component, createContext, useContext } from "react";

const ErrorBoundaryContext = createContext<{
  error: Error;
  reset: () => void;
} | null>(null);

export interface ErrorBoundaryProps {
  children?: ReactNode;
  fallback?: ReactNode | ComponentType<{ error: Error }>;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(error, errorInfo);
  }

  reset() {
    this.setState({ error: null });
  }

  render(): React.ReactNode {
    if (this.state.error === null) return this.props.children;

    const error = this.state.error;
    const reset = this.reset.bind(this);
    const fallback = this.props.fallback;
    const Fallback =
      typeof fallback === "function" ? fallback : () => fallback ?? null;
    return (
      <ErrorBoundaryContext.Provider value={{ error, reset }}>
        <Fallback error={this.state.error} />
      </ErrorBoundaryContext.Provider>
    );
  }
}

export function useErrorBoundary(): {
  error: Error;
  reset: () => void;
} {
  const context = useContext(ErrorBoundaryContext);

  if (context === null) {
    throw new Error(
      "useErrorBoundary must be used within an ErrorBoundary component"
    );
  }

  return context;
}
