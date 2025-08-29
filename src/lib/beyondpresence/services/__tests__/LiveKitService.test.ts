import { LiveKitService } from '../LiveKitService';
import { BeyondPresenceError } from '../../types';
import { ConnectionState } from 'livekit-client';

// Mock LiveKit Room
const mockRoom = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  prepareConnection: jest.fn(),
  on: jest.fn(),
  removeAllListeners: jest.fn(),
  startAudio: jest.fn(),
  state: ConnectionState.Disconnected,
  name: 'test-room',
  numParticipants: 0,
  canPlaybackAudio: true
};

// Mock the LiveKit Room constructor
jest.mock('livekit-client', () => ({
  Room: jest.fn().mockImplementation(() => mockRoom),
  RoomEvent: {
    Connected: 'connected',
    Disconnected: 'disconnected',
    Reconnecting: 'reconnecting',
    Reconnected: 'reconnected',
    ConnectionQualityChanged: 'connectionQualityChanged',
    TrackSubscribed: 'trackSubscribed',
    TrackUnsubscribed: 'trackUnsubscribed',
    AudioPlaybackStatusChanged: 'audioPlaybackStatusChanged',
    MediaDevicesError: 'mediaDevicesError'
  },
  ConnectionState: {
    Connected: 'connected',
    Disconnected: 'disconnected',
    Connecting: 'connecting',
    Reconnecting: 'reconnecting'
  },
  VideoPresets: {
    h720: {
      resolution: { width: 1280, height: 720 }
    }
  }
}));

// Mock browser compatibility functions
jest.mock('../../utils/browserCompat', () => ({
  supportsAdaptiveStream: jest.fn(() => true),
  supportsDynacast: jest.fn(() => true)
}));

describe('LiveKitService', () => {
  let service: LiveKitService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LiveKitService();
    
    // Reset mock room state
    mockRoom.state = ConnectionState.Disconnected;
    mockRoom.connect.mockResolvedValue(undefined);
    mockRoom.disconnect.mockResolvedValue(undefined);
    mockRoom.startAudio.mockResolvedValue(undefined);
  });

  describe('connect', () => {
    const config = {
      url: 'wss://test.livekit.cloud',
      token: 'test-token'
    };

    it('should connect to LiveKit room successfully', async () => {
      mockRoom.state = ConnectionState.Connected;
      
      const result = await service.connect(config);

      expect(mockRoom.prepareConnection).toHaveBeenCalledWith(config.url, config.token);
      expect(mockRoom.connect).toHaveBeenCalledWith(config.url, config.token);
      expect(mockRoom.on).toHaveBeenCalled(); // Event listeners should be set up
      expect(result).toBe(mockRoom);
    });

    it('should handle connection errors', async () => {
      const mockError = new Error('Connection failed');
      mockRoom.connect.mockRejectedValue(mockError);

      await expect(service.connect(config)).rejects.toThrow(BeyondPresenceError);
    });

    it('should disconnect existing room before connecting to new one', async () => {
      // First connection
      mockRoom.state = ConnectionState.Connected;
      await service.connect(config);

      // Reset mocks
      jest.clearAllMocks();
      mockRoom.disconnect.mockResolvedValue(undefined);

      // Second connection should disconnect first
      await service.connect(config);

      expect(mockRoom.disconnect).toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('should disconnect from room successfully', async () => {
      // First connect
      mockRoom.state = ConnectionState.Connected;
      await service.connect({
        url: 'wss://test.livekit.cloud',
        token: 'test-token'
      });

      // Then disconnect
      await service.disconnect();

      expect(mockRoom.removeAllListeners).toHaveBeenCalled();
      expect(mockRoom.disconnect).toHaveBeenCalled();
      expect(service.getRoom()).toBeNull();
    });

    it('should handle disconnect when no room is connected', async () => {
      await expect(service.disconnect()).resolves.not.toThrow();
    });

    it('should handle disconnect errors', async () => {
      // First connect
      await service.connect({
        url: 'wss://test.livekit.cloud',
        token: 'test-token'
      });

      const mockError = new Error('Disconnect failed');
      mockRoom.disconnect.mockRejectedValue(mockError);

      await expect(service.disconnect()).rejects.toThrow(BeyondPresenceError);
      // Room should still be set to null even if disconnect failed
      expect(service.getRoom()).toBeNull();
    });
  });

  describe('getRoom', () => {
    it('should return null when no room is connected', () => {
      expect(service.getRoom()).toBeNull();
    });

    it('should return room instance when connected', async () => {
      await service.connect({
        url: 'wss://test.livekit.cloud',
        token: 'test-token'
      });

      expect(service.getRoom()).toBe(mockRoom);
    });
  });

  describe('isConnected', () => {
    it('should return false when not connected', () => {
      expect(service.isConnected()).toBe(false);
    });

    it('should return true when connected', async () => {
      mockRoom.state = ConnectionState.Connected;
      await service.connect({
        url: 'wss://test.livekit.cloud',
        token: 'test-token'
      });

      expect(service.isConnected()).toBe(true);
    });
  });

  describe('getConnectionState', () => {
    it('should return null when no room exists', () => {
      expect(service.getConnectionState()).toBeNull();
    });

    it('should return room connection state', async () => {
      mockRoom.state = ConnectionState.Connected;
      await service.connect({
        url: 'wss://test.livekit.cloud',
        token: 'test-token'
      });

      expect(service.getConnectionState()).toBe(ConnectionState.Connected);
    });
  });

  describe('startAudio', () => {
    it('should start audio playback successfully', async () => {
      await service.connect({
        url: 'wss://test.livekit.cloud',
        token: 'test-token'
      });

      await service.startAudio();

      expect(mockRoom.startAudio).toHaveBeenCalled();
    });

    it('should throw error when no room is connected', async () => {
      await expect(service.startAudio()).rejects.toThrow(BeyondPresenceError);
    });

    it('should handle audio start errors', async () => {
      await service.connect({
        url: 'wss://test.livekit.cloud',
        token: 'test-token'
      });

      const mockError = new Error('Audio start failed');
      mockRoom.startAudio.mockRejectedValue(mockError);

      await expect(service.startAudio()).rejects.toThrow(BeyondPresenceError);
    });
  });

  describe('canPlaybackAudio', () => {
    it('should return false when no room exists', () => {
      expect(service.canPlaybackAudio()).toBe(false);
    });

    it('should return room audio playback capability', async () => {
      mockRoom.canPlaybackAudio = true;
      await service.connect({
        url: 'wss://test.livekit.cloud',
        token: 'test-token'
      });

      expect(service.canPlaybackAudio()).toBe(true);
    });
  });
});