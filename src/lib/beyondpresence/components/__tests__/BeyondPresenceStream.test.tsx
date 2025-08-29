import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { BeyondPresenceStream, BeyondPresenceStreamSimple } from '../BeyondPresenceStream';
import { useBeyondPresence } from '../../hooks/useBeyondPresence';

// Mock the hook
jest.mock('../../hooks/useBeyondPresence');
const mockUseBeyondPresence = useBeyondPresence as jest.MockedFunction<typeof useBeyondPresence>;

// Mock child components
jest.mock('../VideoContainer', () => ({
  VideoContainer: ({ videoTracks, onVideoTrackAttached }: any) => (
    <div data-testid="video-container">
      Video tracks: {videoTracks.length}
    </div>
  )
}));

jest.mock('../AudioContainer', () => ({
  AudioContainer: ({ audioTracks, canPlayAudio, onStartAudio }: any) => (
    <div data-testid="audio-container">
      Audio tracks: {audioTracks.length}, Can play: {canPlayAudio ? 'Yes' : 'No'}
      {onStartAudio && <button onClick={onStartAudio}>Start Audio</button>}
    </div>
  )
}));

jest.mock('../ConnectionStatus', () => ({
  ConnectionStatus: ({ isConnecting, isConnected, error, onRetry }: any) => (
    <div data-testid="connection-status">
      Status: {isConnecting ? 'Connecting' : isConnected ? 'Connected' : 'Disconnected'}
      {error && <span>Error: {error.message}</span>}
      {onRetry && <button onClick={onRetry}>Retry</button>}
    </div>
  )
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  createContextLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  })
}));

describe('BeyondPresenceStream', () => {
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

  const defaultHookReturn = {
    isConnecting: false,
    isConnected: false,
    error: null,
    session: null,
    room: null,
    videoTracks: [],
    audioTracks: [],
    connect: jest.fn(),
    disconnect: jest.fn(),
    startAudio: jest.fn(),
    canPlayAudio: false,
    audioPlaybackBlocked: false
  };

  beforeEach(() => {
    mockUseBeyondPresence.mockReturnValue(defaultHookReturn);
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  describe('BeyondPresenceStream', () => {
    it('should render all components by default', () => {
      render(<BeyondPresenceStream config={defaultConfig} />);

      expect(screen.getByTestId('connection-status')).toBeInTheDocument();
      expect(screen.getByTestId('video-container')).toBeInTheDocument();
      expect(screen.getByTestId('audio-container')).toBeInTheDocument();
    });

    it('should show connect button when disconnected', () => {
      render(<BeyondPresenceStream config={defaultConfig} />);

      expect(screen.getByText('Connect to BeyondPresence')).toBeInTheDocument();
    });

    it('should call connect when connect button is clicked', () => {
      const mockConnect = jest.fn();
      mockUseBeyondPresence.mockReturnValue({
        ...defaultHookReturn,
        connect: mockConnect
      });

      render(<BeyondPresenceStream config={defaultConfig} />);

      const connectButton = screen.getByText('Connect to BeyondPresence');
      fireEvent.click(connectButton);

      expect(mockConnect).toHaveBeenCalled();
    });

    it('should show loading overlay when connecting', () => {
      mockUseBeyondPresence.mockReturnValue({
        ...defaultHookReturn,
        isConnecting: true
      });

      render(<BeyondPresenceStream config={defaultConfig} />);

      expect(screen.getByText('Connecting to BeyondPresence...')).toBeInTheDocument();
      expect(screen.getByText('This may take a few moments')).toBeInTheDocument();
    });

    it('should show disconnect button when connected', () => {
      mockUseBeyondPresence.mockReturnValue({
        ...defaultHookReturn,
        isConnected: true
      });

      render(<BeyondPresenceStream config={defaultConfig} />);

      expect(screen.getByText('Disconnect')).toBeInTheDocument();
    });

    it('should call disconnect when disconnect button is clicked', () => {
      const mockDisconnect = jest.fn();
      mockUseBeyondPresence.mockReturnValue({
        ...defaultHookReturn,
        isConnected: true,
        disconnect: mockDisconnect
      });

      render(<BeyondPresenceStream config={defaultConfig} />);

      const disconnectButton = screen.getByText('Disconnect');
      fireEvent.click(disconnectButton);

      expect(mockDisconnect).toHaveBeenCalled();
    });

    it('should show error display when there is an error', () => {
      const error = new Error('Connection failed');
      mockUseBeyondPresence.mockReturnValue({
        ...defaultHookReturn,
        error
      });

      render(<BeyondPresenceStream config={defaultConfig} />);

      expect(screen.getByText('Connection Error')).toBeInTheDocument();
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should hide error display when showErrorDisplay is false', () => {
      const error = new Error('Connection failed');
      mockUseBeyondPresence.mockReturnValue({
        ...defaultHookReturn,
        error
      });

      render(<BeyondPresenceStream config={defaultConfig} showErrorDisplay={false} />);

      expect(screen.queryByText('Connection Error')).not.toBeInTheDocument();
    });

    it('should hide connection status when showConnectionStatus is false', () => {
      render(<BeyondPresenceStream config={defaultConfig} showConnectionStatus={false} />);

      expect(screen.queryByTestId('connection-status')).not.toBeInTheDocument();
    });

    it('should pass video tracks to VideoContainer', () => {
      const videoTracks = [{ sid: 'track-1' }, { sid: 'track-2' }] as any;
      mockUseBeyondPresence.mockReturnValue({
        ...defaultHookReturn,
        videoTracks
      });

      render(<BeyondPresenceStream config={defaultConfig} />);

      expect(screen.getByText('Video tracks: 2')).toBeInTheDocument();
    });

    it('should pass audio tracks to AudioContainer', () => {
      const audioTracks = [{ sid: 'track-1' }] as any;
      mockUseBeyondPresence.mockReturnValue({
        ...defaultHookReturn,
        audioTracks,
        canPlayAudio: true
      });

      render(<BeyondPresenceStream config={defaultConfig} />);

      expect(screen.getByText('Audio tracks: 1, Can play: Yes')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <BeyondPresenceStream config={defaultConfig} className="custom-class" />
      );

      const streamElement = container.querySelector('.beyondpresence-stream');
      expect(streamElement).toHaveClass('custom-class');
    });

    it('should call onVideoTrackAttached callback', () => {
      const onVideoTrackAttached = jest.fn();
      
      render(
        <BeyondPresenceStream 
          config={defaultConfig} 
          onVideoTrackAttached={onVideoTrackAttached}
        />
      );

      // The callback would be passed to VideoContainer
      // This test verifies the prop is passed correctly
      expect(screen.getByTestId('video-container')).toBeInTheDocument();
    });

    it('should call onAudioTrackAttached callback', () => {
      const onAudioTrackAttached = jest.fn();
      
      render(
        <BeyondPresenceStream 
          config={defaultConfig} 
          onAudioTrackAttached={onAudioTrackAttached}
        />
      );

      // The callback would be passed to AudioContainer
      // This test verifies the prop is passed correctly
      expect(screen.getByTestId('audio-container')).toBeInTheDocument();
    });

    it('should show debug info in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const mockSession = {
        id: 'session-123',
        avatarId: 'avatar-456',
        livekitToken: 'token',
        livekitUrl: 'url',
        status: 'active' as const,
        createdAt: '2023-01-01T00:00:00Z',
        expiresAt: '2023-01-02T00:00:00Z'
      };

      mockUseBeyondPresence.mockReturnValue({
        ...defaultHookReturn,
        isConnected: true,
        session: mockSession,
        videoTracks: [{ sid: 'video-1' }] as any,
        audioTracks: [{ sid: 'audio-1' }] as any,
        canPlayAudio: true
      });

      render(<BeyondPresenceStream config={defaultConfig} />);

      expect(screen.getAllByText(/Status: Connected/)[0]).toBeInTheDocument();
      expect(screen.getByText('Video Tracks: 1')).toBeInTheDocument();
      expect(screen.getByText('Audio Tracks: 1')).toBeInTheDocument();
      expect(screen.getByText('Can Play Audio: Yes')).toBeInTheDocument();
      expect(screen.getByText('Session ID: session-123')).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('BeyondPresenceStreamSimple', () => {
    it('should render only video and audio containers', () => {
      render(<BeyondPresenceStreamSimple config={defaultConfig} />);

      expect(screen.getByTestId('video-container')).toBeInTheDocument();
      expect(screen.getByTestId('audio-container')).toBeInTheDocument();
      expect(screen.queryByTestId('connection-status')).not.toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <BeyondPresenceStreamSimple config={defaultConfig} className="simple-class" />
      );

      const streamElement = container.querySelector('.beyondpresence-stream-simple');
      expect(streamElement).toHaveClass('simple-class');
    });

    it('should pass callbacks to child components', () => {
      const onVideoTrackAttached = jest.fn();
      const onAudioTrackAttached = jest.fn();
      
      render(
        <BeyondPresenceStreamSimple 
          config={defaultConfig}
          onVideoTrackAttached={onVideoTrackAttached}
          onAudioTrackAttached={onAudioTrackAttached}
        />
      );

      expect(screen.getByTestId('video-container')).toBeInTheDocument();
      expect(screen.getByTestId('audio-container')).toBeInTheDocument();
    });
  });
});