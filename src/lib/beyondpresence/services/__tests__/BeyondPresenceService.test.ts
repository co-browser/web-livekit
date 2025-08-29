import { BeyondPresenceService } from '../BeyondPresenceService';
import { BeyondPresenceError, BeyondPresenceErrorType } from '../../types';

// Create mock functions
const mockCreate = jest.fn();
const mockRetrieve = jest.fn();
const mockDelete = jest.fn();

// Mock the BeyondPresence SDK
jest.mock('@bey-dev/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    session: {
      create: mockCreate,
      retrieve: mockRetrieve,
      delete: mockDelete
    }
  }));
});

import BeyondPresence from '@bey-dev/sdk';

describe('BeyondPresenceService', () => {
  let service: BeyondPresenceService;
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    service = new BeyondPresenceService({
      apiKey: 'test-api-key',
      baseUrl: 'https://test.api.com'
    });

    // Set up the mock client with the functions
    mockClient = {
      session: {
        create: mockCreate,
        retrieve: mockRetrieve,
        delete: mockDelete
      }
    };
  });

  describe('createSession', () => {
    const sessionConfig = {
      avatarId: 'test-avatar-id',
      livekitToken: 'test-token',
      livekitUrl: 'wss://test.livekit.cloud'
    };

    it('should create a session successfully', async () => {
      const mockResponse = {
        id: 'session-123',
        avatar_id: 'test-avatar-id'
      };

      mockClient.session.create.mockResolvedValue(mockResponse);

      const result = await service.createSession(sessionConfig);

      expect(mockClient.session.create).toHaveBeenCalledWith({
        avatar_id: sessionConfig.avatarId,
        livekit_token: sessionConfig.livekitToken,
        livekit_url: sessionConfig.livekitUrl
      });

      expect(result).toMatchObject({
        id: 'session-123',
        avatarId: 'test-avatar-id',
        livekitToken: 'test-token',
        livekitUrl: 'wss://test.livekit.cloud',
        status: 'active'
      });
    });

    it('should handle session creation errors', async () => {
      const mockError = new Error('API Error');
      mockClient.session.create.mockRejectedValue(mockError);

      await expect(service.createSession(sessionConfig)).rejects.toThrow(BeyondPresenceError);
    });
  });

  describe('getSession', () => {
    it('should retrieve a session successfully', async () => {
      const mockResponse = {
        id: 'session-123',
        avatar_id: 'test-avatar-id',
        livekit_token: 'test-token',
        livekit_url: 'wss://test.livekit.cloud',
        created_at: '2023-01-01T00:00:00Z',
        expires_at: '2023-01-02T00:00:00Z'
      };

      mockClient.session.retrieve.mockResolvedValue(mockResponse);

      const result = await service.getSession('session-123');

      expect(mockClient.session.retrieve).toHaveBeenCalledWith('session-123');
      expect(result).toMatchObject({
        id: 'session-123',
        avatarId: 'test-avatar-id',
        status: 'active'
      });
    });

    it('should handle session retrieval errors', async () => {
      const mockError = new Error('Session not found');
      mockClient.session.retrieve.mockRejectedValue(mockError);

      await expect(service.getSession('invalid-session')).rejects.toThrow(BeyondPresenceError);
    });
  });

  describe('destroySession', () => {
    it('should destroy a session successfully', async () => {
      mockClient.session.delete.mockResolvedValue(undefined);

      await service.destroySession('session-123');

      expect(mockClient.session.delete).toHaveBeenCalledWith('session-123');
    });

    it('should handle session destruction errors', async () => {
      const mockError = new Error('Deletion failed');
      mockClient.session.delete.mockRejectedValue(mockError);

      await expect(service.destroySession('session-123')).rejects.toThrow(BeyondPresenceError);
    });
  });

  describe('isSessionExpired', () => {
    it('should return true for expired session', () => {
      const expiredSession = {
        id: 'session-123',
        avatarId: 'test-avatar',
        livekitToken: 'token',
        livekitUrl: 'url',
        status: 'active' as const,
        createdAt: '2023-01-01T00:00:00Z',
        expiresAt: '2023-01-01T01:00:00Z' // 1 hour ago
      };

      expect(service.isSessionExpired(expiredSession)).toBe(true);
    });

    it('should return false for active session', () => {
      const activeSession = {
        id: 'session-123',
        avatarId: 'test-avatar',
        livekitToken: 'token',
        livekitUrl: 'url',
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour from now
      };

      expect(service.isSessionExpired(activeSession)).toBe(false);
    });
  });

  describe('refreshSession', () => {
    it('should refresh an expired session', async () => {
      const expiredSession = {
        id: 'old-session-123',
        avatarId: 'test-avatar',
        livekitToken: 'token',
        livekitUrl: 'url',
        status: 'expired' as const,
        createdAt: '2023-01-01T00:00:00Z',
        expiresAt: '2023-01-01T01:00:00Z'
      };

      const mockNewSession = {
        id: 'new-session-456',
        avatar_id: 'test-avatar'
      };

      mockClient.session.delete.mockResolvedValue(undefined);
      mockClient.session.create.mockResolvedValue(mockNewSession);

      const result = await service.refreshSession(expiredSession);

      expect(mockClient.session.delete).toHaveBeenCalledWith('old-session-123');
      expect(mockClient.session.create).toHaveBeenCalledWith({
        avatar_id: 'test-avatar',
        livekit_token: 'token',
        livekit_url: 'url'
      });
      expect(result.id).toBe('new-session-456');
    });
  });
});