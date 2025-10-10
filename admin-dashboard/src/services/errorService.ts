import { FirebaseError } from 'firebase/app';

export interface AppError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
  context?: string;
}

export class ErrorService {
  private static instance: ErrorService;
  private errorCallbacks: Array<(error: AppError) => void> = [];

  private constructor() {}

  static getInstance(): ErrorService {
    if (!ErrorService.instance) {
      ErrorService.instance = new ErrorService();
    }
    return ErrorService.instance;
  }

  /**
   * Register a callback to be called when errors occur
   */
  onError(callback: (error: AppError) => void): () => void {
    this.errorCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.errorCallbacks.indexOf(callback);
      if (index > -1) {
        this.errorCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Handle different types of errors and convert them to AppError
   */
  handleError(error: unknown, context?: string): AppError {
    const appError = this.parseError(error, context);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${appError.code}] ${appError.message}`, {
        details: appError.details,
        context: appError.context,
        timestamp: appError.timestamp
      });
    }

    // Notify error callbacks
    this.errorCallbacks.forEach(callback => {
      try {
        callback(appError);
      } catch (callbackError) {
        console.error('Error in error callback:', callbackError);
      }
    });

    return appError;
  }

  /**
   * Parse different error types into standardized AppError
   */
  private parseError(error: unknown, context?: string): AppError {
    const timestamp = new Date();

    // Firebase errors
    if (error instanceof FirebaseError) {
      return {
        code: error.code,
        message: this.getFirebaseErrorMessage(error.code),
        details: { originalMessage: error.message },
        timestamp,
        context
      };
    }

    // Standard JavaScript errors
    if (error instanceof Error) {
      return {
        code: 'GENERAL_ERROR',
        message: error.message,
        details: { stack: error.stack },
        timestamp,
        context
      };
    }

    // Network errors
    if (typeof error === 'object' && error !== null && 'status' in error) {
      return {
        code: 'NETWORK_ERROR',
        message: this.getNetworkErrorMessage((error as any).status),
        details: error,
        timestamp,
        context
      };
    }

    // String errors
    if (typeof error === 'string') {
      return {
        code: 'UNKNOWN_ERROR',
        message: error,
        timestamp,
        context
      };
    }

    // Unknown error format
    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
      details: error,
      timestamp,
      context
    };
  }

  /**
   * Get user-friendly messages for Firebase errors
   */
  private getFirebaseErrorMessage(code: string): string {
    const firebaseErrors: Record<string, string> = {
      // Auth errors
      'auth/user-not-found': 'No account found with this email address.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/email-already-in-use': 'An account with this email already exists.',
      'auth/weak-password': 'Password is too weak. Please choose a stronger password.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
      'auth/network-request-failed': 'Network error. Please check your connection and try again.',
      'auth/requires-recent-login': 'Please sign in again to complete this action.',
      'auth/operation-not-allowed': 'This operation is not allowed.',

      // Firestore errors
      'firestore/permission-denied': 'You do not have permission to perform this action.',
      'firestore/not-found': 'The requested document was not found.',
      'firestore/already-exists': 'A document with this ID already exists.',
      'firestore/resource-exhausted': 'Database quota exceeded. Please try again later.',
      'firestore/failed-precondition': 'Operation failed due to invalid conditions.',
      'firestore/aborted': 'Operation was aborted due to a conflict.',
      'firestore/out-of-range': 'Invalid parameter value.',
      'firestore/unimplemented': 'This feature is not yet implemented.',
      'firestore/internal': 'Internal database error. Please try again.',
      'firestore/unavailable': 'Database is temporarily unavailable. Please try again.',
      'firestore/data-loss': 'Data loss detected. Please contact support.',

      // Storage errors
      'storage/object-not-found': 'File not found.',
      'storage/bucket-not-found': 'Storage bucket not found.',
      'storage/project-not-found': 'Project not found.',
      'storage/quota-exceeded': 'Storage quota exceeded.',
      'storage/unauthenticated': 'User is not authenticated.',
      'storage/unauthorized': 'User is not authorized to perform this action.',
      'storage/retry-limit-exceeded': 'Upload failed after multiple retries.',
      'storage/invalid-checksum': 'File upload was corrupted.',
      'storage/canceled': 'Upload was canceled.',
      'storage/invalid-event-name': 'Invalid event name.',
      'storage/invalid-url': 'Invalid file URL.',
      'storage/invalid-argument': 'Invalid argument provided.',
      'storage/no-default-bucket': 'No default storage bucket configured.',
      'storage/cannot-slice-blob': 'File could not be processed.',
      'storage/server-file-wrong-size': 'File size mismatch on server.'
    };

    return firebaseErrors[code] || `Firebase error: ${code}`;
  }

  /**
   * Get user-friendly messages for network errors
   */
  private getNetworkErrorMessage(status: number): string {
    const networkErrors: Record<number, string> = {
      400: 'Bad request. Please check your input.',
      401: 'You are not authorized. Please sign in.',
      403: 'Access denied. You do not have permission.',
      404: 'Resource not found.',
      409: 'Conflict. The resource already exists.',
      429: 'Too many requests. Please try again later.',
      500: 'Server error. Please try again later.',
      502: 'Service temporarily unavailable.',
      503: 'Service unavailable. Please try again later.',
      504: 'Request timeout. Please try again.'
    };

    return networkErrors[status] || `Network error (${status}). Please try again.`;
  }

  /**
   * Create a standardized error for common scenarios
   */
  static createError(code: string, message: string, context?: string, details?: any): AppError {
    return {
      code,
      message,
      details,
      context,
      timestamp: new Date()
    };
  }

  /**
   * Validation error helper
   */
  static createValidationError(field: string, message: string, context?: string): AppError {
    return this.createError(
      'VALIDATION_ERROR',
      `${field}: ${message}`,
      context,
      { field }
    );
  }

  /**
   * Network error helper
   */
  static createNetworkError(message: string = 'Network request failed', context?: string): AppError {
    return this.createError('NETWORK_ERROR', message, context);
  }

  /**
   * Permission error helper
   */
  static createPermissionError(action: string, context?: string): AppError {
    return this.createError(
      'PERMISSION_ERROR',
      `You do not have permission to ${action}`,
      context,
      { action }
    );
  }
}

// Global error boundary helper
export const withErrorHandling = <T extends any[], R>(
  fn: (...args: T) => R | Promise<R>,
  context?: string
) => {
  return async (...args: T): Promise<R> => {
    try {
      const result = await fn(...args);
      return result;
    } catch (error) {
      const errorService = ErrorService.getInstance();
      const appError = errorService.handleError(error, context);
      throw appError;
    }
  };
};

// Hook for React components
export const useErrorHandler = () => {
  const errorService = ErrorService.getInstance();

  return {
    handleError: (error: unknown, context?: string) => errorService.handleError(error, context),
    onError: (callback: (error: AppError) => void) => errorService.onError(callback)
  };
};

export default ErrorService;