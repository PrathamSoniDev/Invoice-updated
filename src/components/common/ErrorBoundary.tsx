import { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  componentStack?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
    this.setState({ componentStack: info.componentStack ?? undefined });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, componentStack: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex min-h-[50vh] items-center justify-center p-6">
          <div className="text-center max-w-2xl w-full">
            <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-4">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">Something went wrong</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              An unexpected error occurred. Try refreshing the page.
            </p>
            <div className="mt-6 flex items-center justify-center gap-2">
              <Button onClick={this.handleReset} variant="outline" size="sm" className="gap-2">
                <RefreshCw className="h-4 w-4" /> Try Again
              </Button>
              <Button onClick={() => window.location.reload()} size="sm">
                Reload Page
              </Button>
            </div>
            {import.meta.env.DEV && this.state.error && (
              <details open className="mt-6 text-left rounded-lg border bg-muted/30 p-3">
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                  Error details (dev only)
                </summary>
                <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-destructive">
                  {this.state.error.name}: {this.state.error.message}
                  {'\n'}
                  {this.state.error.stack}
                </pre>
                {this.state.componentStack && (
                  <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-muted-foreground">
                    {this.state.componentStack}
                  </pre>
                )}
              </details>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}