import { renderHook, act } from '@testing-library/react';
import { useBeyondPresence } from '../useBeyondPresence';
import { BeyondPresenceService } from '../../services/BeyondPresenceService';
import { LiveKitService } from '../../services/LiveKitService';

// Mock the services
jest.mock('../../services/BeyondPresenceService');
jest.mock('../../services/LiveKitService');
jest.mock('../../utils/browserCompat', () => ({
  validateBrowserSupport: jest.fn()
}));

// Mock LiveKit types
const mockRoom = {
  on: jest.fn(),
  canPlaybackAudio: true
};

const mockVideoTrack = {
  kind: 'video',
  source: 'camera',
  detach: jest.fn()
};

const mockAudioTrack = {
  kind: 'audio',
  source: 'microphone',
  detach: jest.fn()
};

describe('useBeyondPresence', () => {
  let mockBeyondPresenceService: jest.Mocked<BeyondPresenceService>;
  let mockLiveKitService: jest.Mocked<LiveKitService>;

  const defaultConfig = {
    beyondPresence: {
      apiKey: 'test-api-key'
    },
    session: {
      avatarId: 'test-avatar-id',
      livekitToken: 'test-token',
      livekitUrl: 'wss://test.livekit.cloud'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock service instances
    mockBeyondPresenceService = {
      createSession: jest.fn(),
      destroySession: jest.fn(),
      getSession: jest.fn(),
      isSessionExpired: jest.fn(),
      refreshSession: jest.fn()
    } as any;

    mockLiveKitService = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      getRoom: jest.fn(),
      isConnected: jest.fn(),
      getConnectionState: jest.fn(),
      startAudio: jest.fn(),
      canPlaybackAudio: jest.fn()
    } as any;

    // Mock constructors
    (BeyondPresenceService as jest.MockedClass<typeof BeyondPresenceService>).mockImplementation(
      () => mockBeyondPresenceService
    );
    (LiveKitService as jest.MockedClass<typeof LiveKitService>).mockImplementation(
      () => mockLiveKitService
    );
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useBeyondPresence(defaultConfig));

    expect(result.current.isConnecting).toBe(false);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.session).toBe(null);
    expect(result.current.room).toBe(null);
    expect(result.current.videoTracks).toEqual([]);
    expect(result.current.audioTracks).toEqual([]);
    expect(result.current.canPlayAudio).toBe(false);
    expect(result.current.audioPlaybackBlocked).toBe(false);
  });

  it('should connect successfully', async () => {
    const mockSession = {
      id: 'session-123',
      avatarId: 'test-avatar-id',
      livekitToken: 'test-token',
      livekitUrl: 'wss://test.livekit.cloud',
      status: 'active' as const,
      createdAt: '2023-01-01T00:00:00Z',
      expiresAt: '2023-01-02T00:00:00Z'
    };

    mockBeyondPresenceService.createSession.mockResolvedValue(mockSession);
    mockLiveKitService.connect.mockResolvedValue(mockRoom as any);
    mockLiveKitService.isConnected.mockReturnValue(true);

    const { result } = renderHook(() => useBeyondPresence(defaultConfig));

    await act(async () => {
      await result.current.connect();
    });

    expect(mockBeyondPresenceService.createSession).toHaveBeenCalledWith(defaultConfig.session);
    expect(mockLiveKitService.connect).toHaveBeenCalledWith({
      url: mockSession.livekitUrl,
      token: mockSession.livekitToken
    });
    expect(result.current.session).toBe(mockSession);
    expect(result.current.isConnected).toBe(true);
    expect(result.current.isConnecting).toBe(false);
  });

  it('should handle connection errors', async () => {
    const mockError = new Error('Connection failed');
    mockBeyondPresenceService.createSession.mockRejectedValue(mockError);

    const onError = jest.fn();
    const config = { ...defaultConfig, onError };

    const { result } = renderHook(() => useBeyondPresence(config));

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.error).toBe(mockError);
    expect(result.current.isConnecting).toBe(false);
    expect(result.current.isConnected).toBe(false);
    expect(onError).toHaveBeenCalledWith(mockError);
  });

  it('should disconnect successfully', async () => {
    // First connect
    const mockSession = {
      id: 'session-123',
      avatarId: 'test-avatar-id',
      livekitToken: 'test-token',
      livekitUrl: 'wss://test.livekit.cloud',
      status: 'active' as const,
      createdAt: '2023-01-01T00:00:00Z',
      expiresAt: '2023-01-02T00:00:00Z'
    };

    mockBeyondPresenceService.createSession.mockResolvedValue(mockSession);
    mockLiveKitService.connect.mockResolvedValue(mockRoom as any);
    mockLiveKitService.isConnected.mockReturnValue(true);
    mockLiveKitService.disconnect.mockResolvedValue();
    mockBeyondPresenceService.destroySession.mockResolvedValue();

    const { result } = renderHook(() => useBeyondPresence(defaultConfig));

    await act(async () => {
      await result.current.connect();
    });

    await act(async () => {
      await result.current.disconnect();
    });

    expect(mockLiveKitService.disconnect).toHaveBeenCalled();
    expect(mockBeyondPresenceService.destroySession).toHaveBeenCalledWith(mockSession.id);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.session).toBe(null);
  });

  it('should start audio successfully', async () => {
    mockLiveKitService.startAudio.mockResolvedValue();

    const { result } = renderHook(() => useBeyondPresence(defaultConfig));

    await act(async () => {
      await result.current.startAudio();
    });

    expect(mockLiveKitService.startAudio).toHaveBeenCalled();
    expect(result.current.canPlayAudio).toBe(true);
    expect(result.current.audioPlaybackBlocked).toBe(false);
  });

  it('should handle audio start errors', async () => {
    const mockError = new Error('Audio start failed');
    mockLiveKitService.startAudio.mockRejectedValue(mockError);

    const onError = jest.fn();
    const config = { ...defaultConfig, onError };

    const { result } = renderHook(() => useBeyondPresence(config));

    await act(async () => {
      await result.current.startAudio();
    });

    expect(result.current.error).toBe(mockError);
    expect(onError).toHaveBeenCalledWith(mockError);
  });

  it('should auto-connect when autoConnect is true', async () => {
    const mockSession = {
      id: 'session-123',
      avatarId: 'test-avatar-id',
      livekitToken: 'test-token',
      livekitUrl: 'wss://test.livekit.cloud',
      status: 'active' as const,
      createdAt: '2023-01-01T00:00:00Z',
      expiresAt: '2023-01-02T00:00:00Z'
    };

    mockBeyondPresenceService.createSession.mockResolvedValue(mockSession);
    mockLiveKitService.connect.mockResolvedValue(mockRoom as any);
    mockLiveKitService.isConnected.mockReturnValue(true);

    const config = { ...defaultConfig, autoConnect: true };

    renderHook(() => useBeyondPresence(config));

    // Wait for auto-connect to trigger
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockBeyondPresenceService.createSession).toHaveBeenCalled();
  });

  it('should not connect when already connecting', async () => {
    // Make createSession return a pending promise
    let resolveCreateSession: any;
    const createSessionPromise = new Promise((resolve) => {
      resolveCreateSession = resolve;
    });
    mockBeyondPresenceService.createSession.mockReturnValue(createSessionPromise);

    const { result } = renderHook(() => useBeyondPresence(defaultConfig));

    // Start first connection (don't await)
    act(() => {
      result.current.connect();
    });

    // Try to connect again while first is in progress
    act(() => {
      result.current.connect();
    });

    // Resolve the promise and wait for updates
    const mockSession = {
      id: 'session-123',
      avatarId: 'test-avatar-id',
      livekitToken: 'test-token',
      livekitUrl: 'wss://test.livekit.cloud',
      status: 'active' as const,
      createdAt: '2023-01-01T00:00:00Z',
      expiresAt: '2023-01-02T00:00:00Z'
    };
    
    await act(async () => {
      resolveCreateSession(mockSession);
      await createSessionPromise;
    });

    // Should only call createSession once
    expect(mockBeyondPresenceService.createSession).toHaveBeenCalledTimes(1);
  });
});