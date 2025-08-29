import { 
  Room, 
  RoomEvent, 
  ConnectionState,
  RoomOptions,
  VideoPresets
} from 'livekit-client';
import type { LiveKitConfig } from '../types';
import { handleLiveKitError } from '../utils/errorHandling';
import { createContextLogger } from '../utils/logger';
import { supportsAdaptiveStream, supportsDynacast } from '../utils/browserCompat';

/**
 * Service class for managing LiveKit room connections
 */
export class LiveKitService {
  private room: Room | null = null;
  private logger = createContextLogger('LiveKitService');
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeouts: number[] = [2000, 4000, 8000, 16000, 30000]; // Exponential backoff

  constructor() {
    this.logger.info('LiveKit service initialized');
  }

  /**
   * Connects to a LiveKit room with the specified configuration
   */
  async connect(config: LiveKitConfig): Promise<Room> {
    this.logger.info('Connecting to LiveKit room', {
      url: config.url,
      hasToken: !!config.token
    });

    try {
      // Disconnect existing room if any
      if (this.room) {
        await this.disconnect();
      }

      // Create room with optimized options
      const roomOptions: RoomOptions = {
        // Enable adaptive streaming if browser supports it
        adaptiveStream: supportsAdaptiveStream(),
        
        // Enable dynacast if browser supports it
        dynacast: supportsDynacast(),
        
        // Default capture settings for optimal quality
        videoCaptureDefaults: {
          resolution: VideoPresets.h720.resolution,
        },
        
        // Merge any custom options
        ...config.roomOptions
      };

      this.room = new Room(roomOptions);

      // Set up event listeners
      this.setupEventListeners();

      // Pre-warm connection for faster actual connection
      this.room.prepareConnection(config.url, config.token);

      // Connect to the room
      await this.room.connect(config.url, config.token);

      this.logger.info('Successfully connected to LiveKit room', {
        roomName: this.room.name,
        numParticipants: this.room.numParticipants
      });

      // Reset reconnect attempts on successful connection
      this.reconnectAttempts = 0;

      return this.room;

    } catch (error) {
      this.logger.error('Failed to connect to LiveKit room', error as Error);
      throw handleLiveKitError(error, 'connection failed');
    }
  }

  /**
   * Disconnects from the current LiveKit room
   */
  async disconnect(): Promise<void> {
    if (!this.room) {
      this.logger.debug('No room to disconnect from');
      return;
    }

    this.logger.info('Disconnecting from LiveKit room');

    try {
      // Remove event listeners before disconnecting
      this.removeEventListeners();
      
      // Disconnect from the room
      await this.room.disconnect();
      
      this.room = null;
      this.reconnectAttempts = 0;

      this.logger.info('Successfully disconnected from LiveKit room');

    } catch (error) {
      this.logger.error('Error during disconnect', error as Error);
      // Still set room to null even if disconnect failed
      this.room = null;
      throw handleLiveKitError(error, 'disconnect failed');
    }
  }

  /**
   * Gets the current room instance
   */
  getRoom(): Room | null {
    return this.room;
  }

  /**
   * Checks if currently connected to a room
   */
  isConnected(): boolean {
    return this.room?.state === ConnectionState.Connected;
  }

  /**
   * Gets the current connection state
   */
  getConnectionState(): ConnectionState | null {
    return this.room?.state || null;
  }

  /**
   * Attempts to reconnect to the room with exponential backoff
   */
  private async attemptReconnect(config: LiveKitConfig): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error('Max reconnect attempts reached, giving up');
      return;
    }

    const timeout = this.reconnectTimeouts[Math.min(this.reconnectAttempts, this.reconnectTimeouts.length - 1)];
    this.reconnectAttempts++;

    this.logger.info(`Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${timeout}ms`);

    setTimeout(async () => {
      try {
        await this.connect(config);
        this.logger.info('Reconnection successful');
      } catch (error) {
        this.logger.error('Reconnection failed', error as Error);
        // Try again if we haven't reached max attempts
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          await this.attemptReconnect(config);
        }
      }
    }, timeout);
  }

  /**
   * Sets up event listeners for the room
   */
  private setupEventListeners(): void {
    if (!this.room) return;

    this.room.on(RoomEvent.Connected, () => {
      this.logger.info('Room connected event received');
    });

    this.room.on(RoomEvent.Disconnected, (reason) => {
      this.logger.info('Room disconnected', { reason });
    });

    this.room.on(RoomEvent.Reconnecting, () => {
      this.logger.info('Room reconnecting');
    });

    this.room.on(RoomEvent.Reconnected, () => {
      this.logger.info('Room reconnected successfully');
      this.reconnectAttempts = 0; // Reset on successful reconnection
    });

    this.room.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
      this.logger.debug('Connection quality changed', {
        quality,
        participant: participant?.identity
      });
    });

    this.room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      this.logger.info('Track subscribed', {
        trackKind: track.kind,
        trackSource: track.source,
        participant: participant.identity
      });
    });

    this.room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
      this.logger.info('Track unsubscribed', {
        trackKind: track.kind,
        trackSource: track.source,
        participant: participant.identity
      });
    });

    this.room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
      this.logger.info('Audio playback status changed', {
        canPlayback: this.room?.canPlaybackAudio
      });
    });

    this.room.on(RoomEvent.MediaDevicesError, (error) => {
      this.logger.error('Media devices error', error);
    });
  }

  /**
   * Removes event listeners from the room
   */
  private removeEventListeners(): void {
    if (!this.room) return;

    // Remove all listeners
    this.room.removeAllListeners();
  }

  /**
   * Starts audio playback (required for browser restrictions)
   */
  async startAudio(): Promise<void> {
    if (!this.room) {
      throw handleLiveKitError(new Error('No room connected'), 'start audio failed');
    }

    try {
      await this.room.startAudio();
      this.logger.info('Audio playback started successfully');
    } catch (error) {
      this.logger.error('Failed to start audio playback', error as Error);
      throw handleLiveKitError(error, 'start audio failed');
    }
  }

  /**
   * Gets audio playback capability status
   */
  canPlaybackAudio(): boolean {
    return this.room?.canPlaybackAudio ?? false;
  }
}