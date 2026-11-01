import { Component, type ErrorInfo, type ReactNode } from 'react';

export class ViewerErrorBoundary extends Component<
  { onError: (error: Error) => void; fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  public override state = { failed: false };

  public static getDerivedStateFromError() {
    return { failed: true };
  }

  public override componentDidCatch(error: Error, _info: ErrorInfo): void {
    this.props.onError(error);
  }

  public override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
