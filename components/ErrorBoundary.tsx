import React, { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import ErrorDisplay from './ErrorDisplay';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorEventId: string | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorEventId: null,
  };

  public static getDerivedStateFromError(_: Error): Partial<State> {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    Sentry.withScope(scope => {
      // Spread errorInfo into a new object to match the 'Extras' type,
      // which expects an index signature.
      scope.setExtras({ ...errorInfo });
      const eventId = Sentry.captureException(error);
      this.setState({ errorEventId: eventId });
    });
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      // Render fallback UI and pass the Sentry event ID
      return (
        <ErrorDisplay 
            message="Sorry, a part of the application has encountered an error. Our team has been notified. Please try refreshing or clicking the button below."
            onRetry={() => this.setState({ hasError: false, errorEventId: null })}
            errorEventId={this.state.errorEventId}
        />
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;