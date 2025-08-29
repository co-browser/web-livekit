// Main exports for BeyondPresence integration
export { BeyondPresenceStream, BeyondPresenceStreamSimple } from './components/BeyondPresenceStream';
export { VideoContainer } from './components/VideoContainer';
export { AudioContainer } from './components/AudioContainer';
export { ConnectionStatus, ConnectionStatusCompact, ConnectionStatusDetailed } from './components/ConnectionStatus';
export { useBeyondPresence } from './hooks/useBeyondPresence';
export { BeyondPresenceService } from './services/BeyondPresenceService';
export { LiveKitService } from './services/LiveKitService';

// Utility exports
export { 
  createBeyondPresenceError,
  isBeyondPresenceError,
  getErrorMessage,
  handleApiError,
  handleLiveKitError,
  handleTrackError
} from './utils/errorHandling';

export {
  detectBrowserCapabilities,
  isBrowserSupported,
  validateBrowserSupport,
  getBrowserInfo,
  supportsAdaptiveStream,
  supportsDynacast
} from './utils/browserCompat';

export {
  getLogger,
  setLogger,
  setLogLevel,
  createContextLogger,
  log
} from './utils/logger';

// Type exports
export type {
  BeyondPresenceConfig,
  SessionConfig,
  BeyondPresenceSession,
  LiveKitConfig,
  ConnectionState,
  TrackState,
  BrowserCapabilities,
  Logger,
  UseBeyondPresenceConfig,
  UseBeyondPresenceReturn,
  BeyondPresenceStreamProps
} from './types';

export {
  BeyondPresenceError,
  BeyondPresenceErrorType,
  LogLevel
} from './types';