import { BeyondPresenceError, BeyondPresenceErrorType } from '../types';

/**
 * Creates a BeyondPresenceError from an unknown error
 */
export function createBeyondPresenceError(
  type: BeyondPresenceErrorType,
  message: string,
  originalError?: unknown
): BeyondPresenceError {
  const error = originalError instanceof Error ? originalError : undefined;
  return new BeyondPresenceError(type, message, error);
}

/**
 * Checks if an error is a BeyondPresenceError
 */
export function isBeyondPresenceError(error: unknown): error is BeyondPresenceError {
  return error instanceof BeyondPresenceError;
}

/**
 * Extracts error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

/**
 * Handles API errors and converts them to BeyondPresenceError
 */
export function handleApiError(error: unknown, context: string): BeyondPresenceError {
  const message = getErrorMessage(error);
  
  // Check for specific error types based on message or error properties
  if (message.includes('401') || message.includes('unauthorized')) {
    return createBeyondPresenceError(
      BeyondPresenceErrorType.AUTHENTICATION_ERROR,
      `Authentication failed: ${message}`,
      error
    );
  }
  
  if (message.includes('session') && message.includes('expired')) {
    return createBeyondPresenceError(
      BeyondPresenceErrorType.SESSION_EXPIRED_ERROR,
      `Session expired: ${message}`,
      error
    );
  }
  
  // Default to session creation error for API calls
  return createBeyondPresenceError(
    BeyondPresenceErrorType.SESSION_CREATION_ERROR,
    `${context}: ${message}`,
    error
  );
}

/**
 * Handles LiveKit connection errors
 */
export function handleLiveKitError(error: unknown, context: string): BeyondPresenceError {
  const message = getErrorMessage(error);
  
  return createBeyondPresenceError(
    BeyondPresenceErrorType.LIVEKIT_CONNECTION_ERROR,
    `LiveKit ${context}: ${message}`,
    error
  );
}

/**
 * Handles track subscription errors
 */
export function handleTrackError(error: unknown, trackType: 'video' | 'audio'): BeyondPresenceError {
  const message = getErrorMessage(error);
  
  if (trackType === 'audio' && (message.includes('autoplay') || message.includes('user interaction'))) {
    return createBeyondPresenceError(
      BeyondPresenceErrorType.AUDIO_PLAYBACK_ERROR,
      `Audio playback requires user interaction: ${message}`,
      error
    );
  }
  
  return createBeyondPresenceError(
    BeyondPresenceErrorType.TRACK_SUBSCRIPTION_ERROR,
    `${trackType} track error: ${message}`,
    error
  );
}