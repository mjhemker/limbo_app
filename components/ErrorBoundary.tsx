import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Warning, ArrowsClockwise } from 'phosphor-react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console or error reporting service
    console.error('Error Boundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo: errorInfo.componentStack || null,
    });

    // In production, send to error reporting service like Sentry
    // Sentry.captureException(error, { extra: errorInfo });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
          <ScrollView className="flex-1 p-6">
            <View className="items-center justify-center py-12">
              {/* Error Icon */}
              <View className="w-20 h-20 rounded-full bg-red-100 items-center justify-center mb-6">
                <Warning weight="bold" size={40} color="#ef4444" />
              </View>

              {/* Error Title */}
              <Text className="text-2xl font-black text-gray-900 mb-2 text-center font-heading">
                Oops! Something went wrong
              </Text>

              {/* Error Description */}
              <Text className="text-gray-600 text-center mb-6">
                We encountered an unexpected error. Don't worry, we've logged it and
                will work on fixing it.
              </Text>

              {/* Reset Button */}
              <TouchableOpacity
                onPress={this.handleReset}
                className="bg-blue-600 rounded-full px-8 py-4 flex-row items-center"
                activeOpacity={0.7}
              >
                <ArrowsClockwise weight="bold" size={20} color="white" />
                <Text className="text-white font-semibold ml-2">Try Again</Text>
              </TouchableOpacity>

              {/* Error Details (Development Only) */}
              {__DEV__ && this.state.error && (
                <View className="mt-8 w-full">
                  <Text className="text-sm font-semibold text-gray-900 mb-2">
                    Error Details (Dev Mode):
                  </Text>
                  <View className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <Text className="text-xs font-mono text-red-900 mb-2">
                      {this.state.error.toString()}
                    </Text>
                    {this.state.errorInfo && (
                      <ScrollView
                        horizontal
                        className="mt-2"
                        showsHorizontalScrollIndicator={false}
                      >
                        <Text className="text-xs font-mono text-red-700">
                          {this.state.errorInfo}
                        </Text>
                      </ScrollView>
                    )}
                  </View>
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC to wrap component with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
