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
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex min-h-[50vh] items-center justify-center p-6">
          <div className="text-center max-w-md">
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
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
