import { BeyondPresenceError, BeyondPresenceErrorType } from '../../types';
import {
  createBeyondPresenceError,
  isBeyondPresenceError,
  getErrorMessage,
  handleApiError,
  handleLiveKitError,
  handleTrackError
} from '../errorHandling';

describe('Error Handling Utils', () => {
  describe('createBeyondPresenceError', () => {
    it('should create a BeyondPresenceError with correct properties', () => {
      const originalError = new Error('Original error');
      const error = createBeyondPresenceError(
        BeyondPresenceErrorType.AUTHENTICATION_ERROR,
        'Test message',
        originalError
      );

      expect(error).toBeInstanceOf(BeyondPresenceError);
      expect(error.type).toBe(BeyondPresenceErrorType.AUTHENTICATION_ERROR);
      expect(error.message).toBe('Test message');
      expect(error.originalError).toBe(originalError);
    });
  });

  describe('isBeyondPresenceError', () => {
    it('should return true for BeyondPresenceError', () => {
      const error = new BeyondPresenceError(
        BeyondPresenceErrorType.SESSION_CREATION_ERROR,
        'Test'
      );
      expect(isBeyondPresenceError(error)).toBe(true);
    });

    it('should return false for regular Error', () => {
      const error = new Error('Regular error');
      expect(isBeyondPresenceError(error)).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('should extract message from Error object', () => {
      const error = new Error('Test error message');
      expect(getErrorMessage(error)).toBe('Test error message');
    });

    it('should return string as-is', () => {
      expect(getErrorMessage('String error')).toBe('String error');
    });

    it('should return default message for unknown error', () => {
      expect(getErrorMessage(null)).toBe('An unknown error occurred');
    });
  });

  describe('handleApiError', () => {
    it('should create authentication error for 401', () => {
      const error = handleApiError(new Error('401 unauthorized'), 'test context');
      expect(error.type).toBe(BeyondPresenceErrorType.AUTHENTICATION_ERROR);
    });

    it('should create session expired error', () => {
      const error = handleApiError(new Error('session expired'), 'test context');
      expect(error.type).toBe(BeyondPresenceErrorType.SESSION_EXPIRED_ERROR);
    });

    it('should default to session creation error', () => {
      const error = handleApiError(new Error('generic error'), 'test context');
      expect(error.type).toBe(BeyondPresenceErrorType.SESSION_CREATION_ERROR);
    });
  });
});