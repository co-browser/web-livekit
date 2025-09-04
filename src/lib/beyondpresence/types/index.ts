// Core BeyondPresence types and interfaces
import type { Room, RoomOptions, RemoteVideoTrack, RemoteAudioTrack } from 'livekit-client';

export interface BeyondPresenceConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface SessionConfig {
  avatarId: string;
  livekitToken: string;
  livekitUrl: string;
}

export interface BeyondPresenceSession {
  id: string;
  avatarId: string;
  livekitToken: string;
  livekitUrl: string;
  status: 'active' | 'inactive' | 'expired';
  createdAt: string;
  expiresAt: string;
}

export interface LiveKitConfig {
  url: string;
  token: string;
  roomOptions?: RoomOptions;
}

export interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';
  error: Error | null;
  lastConnectedAt: Date | null;
  reconnectAttempts: number;
}

export interface TrackState {
  videoTracks: Map<string, RemoteVideoTrack>;
  audioTracks: Map<string, RemoteAudioTrack>;
  attachedElements: Map<string, HTMLElement>;
}

// React Hook interfaces
export interface UseBeyondPresenceConfig {
  beyondPresence: BeyondPresenceConfig;
  session: SessionConfig;
  autoConnect?: boolean;
  onError?: (error: Error) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export interface UseBeyondPresenceReturn {
  // Connection state
  isConnecting: boolean;
  isConnected: boolean;
  error: Error | null;
  
  // Session data
  session: BeyondPresenceSession | null;
  room: Room | null;
  
  // Track management
  videoTracks: RemoteVideoTrack[];
  audioTracks: RemoteAudioTrack[];
  
  // Control methods
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  startAudio: () => Promise<void>;
  startMicrophoneStream: () => Promise<(() => void) | undefined>;
  
  // Audio state
  canPlayAudio: boolean;
  audioPlaybackBlocked: boolean;
}

// React Component interfaces
export interface BeyondPresenceStreamProps {
  config: UseBeyondPresenceConfig;
  className?: string;
  videoClassName?: string;
  audioClassName?: string;
  showConnectionStatus?: boolean;
  showErrorDisplay?: boolean;
  onVideoTrackAttached?: (element: HTMLVideoElement, track: RemoteVideoTrack) => void;
  onAudioTrackAttached?: (element: HTMLAudioElement, track: RemoteAudioTrack) => void;
}

export interface BrowserCapabilities {
  webRTC: boolean;
  mediaDevices: boolean;
  insertableStreams: boolean;
  adaptiveStream: boolean;
  dynacast: boolean;
}

export enum BeyondPresenceErrorType {
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  SESSION_CREATION_ERROR = 'SESSION_CREATION_ERROR',
  SESSION_EXPIRED_ERROR = 'SESSION_EXPIRED_ERROR',
  LIVEKIT_CONNECTION_ERROR = 'LIVEKIT_CONNECTION_ERROR',
  TRACK_SUBSCRIPTION_ERROR = 'TRACK_SUBSCRIPTION_ERROR',
  AUDIO_PLAYBACK_ERROR = 'AUDIO_PLAYBACK_ERROR',
  BROWSER_COMPATIBILITY_ERROR = 'BROWSER_COMPATIBILITY_ERROR'
}

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  OFF = 4
}

export interface Logger {
  debug(message: string, context?: object): void;
  info(message: string, context?: object): void;
  warn(message: string, context?: object): void;
  error(message: string, error?: Error, context?: object): void;
}

// Custom Error Class
export class BeyondPresenceError extends Error {
  constructor(
    public type: BeyondPresenceErrorType,
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'BeyondPresenceError';
    
    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BeyondPresenceError);
    }
  }
}