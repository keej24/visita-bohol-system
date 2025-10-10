import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<{
    error: Error;
    resetError: () => void;
    errorId?: string;
  }>;
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void;
  showDetails?: boolean;
  level?: 'page' | 'component' | 'critical';
}

// Generate unique error ID for tracking
const generateErrorId = (): string => {
  return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Log error to monitoring service
const logError = (error: Error, errorInfo: ErrorInfo, errorId: string, level: string) => {
  if (process.env.NODE_ENV === 'production') {
    // In production, send to error tracking service
    console.error('Error Boundary Caught Error:', {
      errorId,
      level,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      errorInfo,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });
  } else {
    console.group('🚨 Error Boundary Caught Error');
    console.error('Error ID:', errorId);
    console.error('Level:', level);
    console.error('Error:', error);
    console.error('Component Stack:', errorInfo.componentStack);
    console.groupEnd();
  }
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private errorId?: string;
  
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.errorId = generateErrorId();
    
    logError(error, errorInfo, this.errorId, this.props.level || 'component');
    
    this.setState({
      error,
      errorInfo,
      errorId: this.errorId,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo, this.errorId);
  }

  handleReset = () => {
    this.errorId = undefined;
    this.setState({ hasError: false, error: undefined, errorInfo: undefined, errorId: undefined });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent 
            error={this.state.error}
            resetError={this.handleReset}
            errorId={this.state.errorId}
          />
        );
      }

      const isPageLevel = this.props.level === 'page';
      const isCritical = this.props.level === 'critical';
      const showDetails = this.props.showDetails || process.env.NODE_ENV === 'development';

      // Default error UI
      return (
        <div className={`flex items-center justify-center ${isPageLevel ? 'min-h-screen' : 'min-h-[300px]'} p-4`}>
          <Card className={`w-full max-w-lg ${isCritical ? 'border-destructive' : 'border-warning'}`}>
            <CardHeader className="text-center">
              <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${
                isCritical ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'
              }`}>
                <AlertTriangle className="h-6 w-6" />
              </div>
              <CardTitle className="text-lg">
                {isCritical ? 'Critical Error' : 'Something went wrong'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-muted-foreground">
                {isCritical 
                  ? 'A critical error has occurred that prevents the application from running properly.'
                  : 'We encountered an unexpected error. Please try again or contact support if the problem persists.'
                }
              </p>
              
              {showDetails && (
                <details className="text-left">
                  <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                    Technical Details
                  </summary>
                  <div className="mt-2 space-y-2 rounded-md bg-muted p-3 text-xs font-mono">
                    {this.state.errorId && <div><strong>Error ID:</strong> {this.state.errorId}</div>}
                    <div><strong>Error:</strong> {this.state.error.name}</div>
                    <div><strong>Message:</strong> {this.state.error.message}</div>
                    {this.state.error.stack && (
                      <div>
                        <strong>Stack:</strong>
                        <pre className="mt-1 whitespace-pre-wrap break-all">{this.state.error.stack}</pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
              
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button onClick={this.handleReset} variant="default" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
                
                {isPageLevel && (
                  <Button
                    variant="outline"
                    onClick={() => window.location.href = '/'}
                    className="gap-2"
                  >
                    <Home className="h-4 w-4" />
                    Go Home
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reload Page
                </Button>
              </div>
              
              {this.state.errorId && (
                <p className="text-xs text-muted-foreground">
                  Error ID: <code className="rounded bg-muted px-1">{this.state.errorId}</code>
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

// Specific error boundaries for different use cases
export const PageErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary level="page" showDetails={process.env.NODE_ENV === 'development'}>
    {children}
  </ErrorBoundary>
);

export const ComponentErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary level="component">
    {children}
  </ErrorBoundary>
);

export const CriticalErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary level="critical" showDetails={true}>
    {children}
  </ErrorBoundary>
);

// Chart error boundary with specialized handling
export const ChartErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  const ChartErrorFallback: React.FC<{
    error: Error;
    resetError: () => void;
    errorId?: string;
  }> = ({ error, resetError, errorId }) => (
    <Card className="w-full border-warning">
      <CardContent className="flex flex-col items-center justify-center py-8">
        <AlertTriangle className="h-8 w-8 text-warning mb-4" />
        <h3 className="font-semibold mb-2">Chart Loading Error</h3>
        <p className="text-sm text-muted-foreground text-center mb-4">
          Unable to load chart data. This might be due to a data formatting issue or network problem.
        </p>
        <Button onClick={resetError} size="sm" variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
        {errorId && (
          <p className="text-xs text-muted-foreground mt-2">
            Error ID: <code>{errorId}</code>
          </p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <ErrorBoundary 
      level="component" 
      fallback={ChartErrorFallback}
      onError={(error, errorInfo, errorId) => {
        console.warn('Chart Error:', { error, errorInfo, errorId });
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

// Form error boundary with specialized handling
export const FormErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  const FormErrorFallback: React.FC<{
    error: Error;
    resetError: () => void;
    errorId?: string;
  }> = ({ error, resetError, errorId }) => (
    <Card className="w-full border-destructive">
      <CardContent className="flex flex-col items-center justify-center py-6">
        <AlertTriangle className="h-6 w-6 text-destructive mb-3" />
        <h3 className="font-semibold mb-2">Form Error</h3>
        <p className="text-sm text-muted-foreground text-center mb-4">
          There was an error with the form. Please refresh and try again.
        </p>
        <div className="flex gap-2">
          <Button onClick={resetError} size="sm" variant="outline">
            Reset Form
          </Button>
          <Button onClick={() => window.location.reload()} size="sm" variant="default">
            Refresh Page
          </Button>
        </div>
        {errorId && (
          <p className="text-xs text-muted-foreground mt-2">
            Error ID: <code>{errorId}</code>
          </p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <ErrorBoundary 
      level="component" 
      fallback={FormErrorFallback}
    >
      {children}
    </ErrorBoundary>
  );
};

export default ErrorBoundary;