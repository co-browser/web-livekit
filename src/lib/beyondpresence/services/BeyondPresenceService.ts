import BeyondPresence from '@bey-dev/sdk';
import type { 
  BeyondPresenceConfig, 
  SessionConfig, 
  BeyondPresenceSession 
} from '../types';
import { handleApiError } from '../utils/errorHandling';
import { createContextLogger } from '../utils/logger';

/**
 * Service class for managing BeyondPresence sessions
 */
export class BeyondPresenceService {
  private client: BeyondPresence;
  private logger = createContextLogger('BeyondPresenceService');

  constructor(config: BeyondPresenceConfig) {
    this.logger.info('Initializing BeyondPresence service', { 
      baseUrl: config.baseUrl,
      hasApiKey: !!config.apiKey 
    });

    this.client = new BeyondPresence({
      apiKey: config.apiKey,
      ...(config.baseUrl && { baseUrl: config.baseUrl })
    });
  }

  /**
   * Creates a new BeyondPresence session with the specified avatar and LiveKit configuration
   */
  async createSession(config: SessionConfig): Promise<BeyondPresenceSession> {
    this.logger.info('Creating BeyondPresence session', {
      avatarId: config.avatarId,
      livekitUrl: config.livekitUrl,
      hasToken: !!config.livekitToken
    });

    try {
      const response = await this.client.session.create({
        avatar_id: config.avatarId,
        livekit_token: config.livekitToken,
        livekit_url: config.livekitUrl
      });

      const session: BeyondPresenceSession = {
        id: response.id,
        avatarId: config.avatarId,
        livekitToken: config.livekitToken,
        livekitUrl: config.livekitUrl,
        status: 'active', // Assume active when just created
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Default 24h expiry
      };

      this.logger.info('Session created successfully', { sessionId: session.id });
      return session;

    } catch (error) {
      this.logger.error('Failed to create session', error as Error, {
        avatarId: config.avatarId
      });
      throw handleApiError(error, 'Session creation failed');
    }
  }

  /**
   * Retrieves an existing BeyondPresence session by ID
   */
  async getSession(sessionId: string): Promise<BeyondPresenceSession> {
    this.logger.info('Retrieving session', { sessionId });

    try {
      // Note: This assumes the BeyondPresence SDK has a session.get method
      // If not available, we'll need to store session data locally or use a different approach
      const response = await this.client.session.retrieve(sessionId);

      const session: BeyondPresenceSession = {
        id: response.id,
        avatarId: response.avatar_id || '',
        livekitToken: response.livekit_token || '',
        livekitUrl: response.livekit_url || '',
        status: this.determineSessionStatus(response),
        createdAt: response.created_at || new Date().toISOString(),
        expiresAt: response.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      this.logger.info('Session retrieved successfully', { 
        sessionId: session.id,
        status: session.status 
      });
      return session;

    } catch (error) {
      this.logger.error('Failed to retrieve session', error as Error, { sessionId });
      throw handleApiError(error, 'Session retrieval failed');
    }
  }

  /**
   * Destroys a BeyondPresence session
   */
  async destroySession(sessionId: string): Promise<void> {
    this.logger.info('Destroying session', { sessionId });

    try {
      // Note: This assumes the BeyondPresence SDK has a session.delete method
      // If not available, we may need to handle this differently
      await this.client.session.delete(sessionId);
      
      this.logger.info('Session destroyed successfully', { sessionId });

    } catch (error) {
      this.logger.error('Failed to destroy session', error as Error, { sessionId });
      throw handleApiError(error, 'Session destruction failed');
    }
  }

  /**
   * Checks if a session is expired based on its expiration time
   */
  isSessionExpired(session: BeyondPresenceSession): boolean {
    const now = new Date();
    const expiresAt = new Date(session.expiresAt);
    return now >= expiresAt;
  }

  /**
   * Refreshes an expired session by creating a new one with the same configuration
   */
  async refreshSession(expiredSession: BeyondPresenceSession): Promise<BeyondPresenceSession> {
    this.logger.info('Refreshing expired session', { 
      sessionId: expiredSession.id,
      avatarId: expiredSession.avatarId 
    });

    // First, try to destroy the old session
    try {
      await this.destroySession(expiredSession.id);
    } catch (error) {
      this.logger.warn('Failed to destroy expired session, continuing with refresh', error as Error);
    }

    // Create a new session with the same configuration
    return this.createSession({
      avatarId: expiredSession.avatarId,
      livekitToken: expiredSession.livekitToken,
      livekitUrl: expiredSession.livekitUrl
    });
  }

  /**
   * Determines session status from API response
   */
  private determineSessionStatus(response: any): BeyondPresenceSession['status'] {
    // This logic depends on what the actual API returns
    // For now, we'll use some reasonable defaults
    if (response.status) {
      return response.status;
    }
    
    // Check if session is expired based on timestamps
    if (response.expires_at) {
      const expiresAt = new Date(response.expires_at);
      if (new Date() >= expiresAt) {
        return 'expired';
      }
    }
    
    return 'active';
  }
}