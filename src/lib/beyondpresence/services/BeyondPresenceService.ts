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
  private config: BeyondPresenceConfig;
  private logger = createContextLogger('BeyondPresenceService');

  constructor(config: BeyondPresenceConfig) {
    this.logger.info('Initializing BeyondPresence service', { 
      hasApiKey: !!config.apiKey 
    });

    this.config = config;
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
      // Use API route for server-side session creation to avoid CORS issues
      const response = await fetch('/api/beyondpresence/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          avatarId: config.avatarId,
          livekitToken: config.livekitToken,
          livekitUrl: config.livekitUrl
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const session: BeyondPresenceSession = await response.json();

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
      // For now, we'll throw an error as session retrieval would need a separate API route
      // In a real implementation, you'd create a GET endpoint for this
      throw new Error('Session retrieval not implemented for client-side usage');

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
      // For now, we'll just log that we're destroying the session
      // In a real implementation, you'd create a DELETE endpoint for this
      this.logger.warn('Session destruction not implemented for client-side usage', { sessionId });
      
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