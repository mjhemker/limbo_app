import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { AlertCircle } from 'lucide-react-native';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    // You can log to an error reporting service here
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      // Default error UI
      return (
        <View className="flex-1 bg-white items-center justify-center px-6">
          <View className="items-center mb-6">
            <AlertCircle size={64} color="#ef4444" />
            <Text className="text-2xl font-bold text-gray-900 mt-4 text-center">
              Something went wrong
            </Text>
            <Text className="text-gray-600 text-center mt-2">
              We encountered an unexpected error
            </Text>
          </View>

          {__DEV__ && (
            <ScrollView className="w-full bg-gray-100 rounded-lg p-4 mb-6 max-h-64">
              <Text className="text-xs text-gray-800 font-mono">
                {this.state.error.toString()}
              </Text>
              {this.state.error.stack && (
                <Text className="text-xs text-gray-600 font-mono mt-2">
                  {this.state.error.stack}
                </Text>
              )}
            </ScrollView>
          )}

          <TouchableOpacity
            onPress={this.resetError}
            className="bg-blue-600 rounded-lg px-6 py-3"
          >
            <Text className="text-white font-semibold">Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}
