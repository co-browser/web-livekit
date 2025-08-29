import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { AudioContainer } from '../AudioContainer';
import { RemoteAudioTrack } from 'livekit-client';

// Mock the logger
jest.mock('../../utils/logger', () => ({
  createContextLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  })
}));

// Mock RemoteAudioTrack
const createMockAudioTrack = (sid: string): jest.Mocked<RemoteAudioTrack> => ({
  sid,
  source: 'microphone',
  kind: 'audio',
  attach: jest.fn(),
  detach: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
} as any);

describe('AudioContainer', () => {
  const defaultProps = {
    audioTracks: [],
    canPlayAudio: true,
    audioPlaybackBlocked: false
  };

  afterEach(() => {
    cleanup();
  });

  it('should render audio container', () => {
    const { container } = render(<AudioContainer {...defaultProps} />);
    
    const audioContainer = container.querySelector('.beyondpresence-audio-container');
    expect(audioContainer).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <AudioContainer {...defaultProps} className="custom-class" />
    );
    
    const audioContainer = container.querySelector('.beyondpresence-audio-container');
    expect(audioContainer).toHaveClass('custom-class');
  });

  it('should show audio status when enabled', () => {
    render(<AudioContainer {...defaultProps} canPlayAudio={true} />);
    
    expect(screen.getByText(/Audio: Enabled/)).toBeInTheDocument();
  });

  it('should show audio status when disabled', () => {
    render(<AudioContainer {...defaultProps} canPlayAudio={false} />);
    
    expect(screen.getByText(/Audio: Disabled/)).toBeInTheDocument();
  });

  it('should show blocked audio notice when audio is blocked', () => {
    const onStartAudio = jest.fn();
    
    render(
      <AudioContainer 
        {...defaultProps} 
        audioPlaybackBlocked={true}
        onStartAudio={onStartAudio}
      />
    );
    
    expect(screen.getByText(/Audio is blocked by your browser/)).toBeInTheDocument();
    expect(screen.getByText('Enable Audio')).toBeInTheDocument();
  });

  it('should call onStartAudio when enable audio button is clicked', async () => {
    const onStartAudio = jest.fn().mockResolvedValue(undefined);
    
    render(
      <AudioContainer 
        {...defaultProps} 
        audioPlaybackBlocked={true}
        onStartAudio={onStartAudio}
      />
    );
    
    const enableButton = screen.getByText('Enable Audio');
    fireEvent.click(enableButton);
    
    expect(onStartAudio).toHaveBeenCalled();
  });

  it('should show loading state when starting audio', async () => {
    const onStartAudio = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(
      <AudioContainer 
        {...defaultProps} 
        audioPlaybackBlocked={true}
        onStartAudio={onStartAudio}
      />
    );
    
    const enableButton = screen.getByText('Enable Audio');
    fireEvent.click(enableButton);
    
    expect(screen.getByText('Starting...')).toBeInTheDocument();
    expect(enableButton).toBeDisabled();
    
    await waitFor(() => {
      expect(screen.getByText('Enable Audio')).toBeInTheDocument();
    });
  });

  it('should create audio element when track is added', () => {
    const mockTrack = createMockAudioTrack('track-1');
    
    render(<AudioContainer {...defaultProps} audioTracks={[mockTrack]} />);
    
    expect(mockTrack.attach).toHaveBeenCalled();
    
    // Check that an audio element was created (though it's hidden)
    const audioElement = document.querySelector('audio');
    expect(audioElement).toBeInTheDocument();
    expect(audioElement).toHaveAttribute('autoplay');
    expect(audioElement).toHaveStyle({ display: 'none' });
  });

  it('should configure audio element properties', () => {
    const mockTrack = createMockAudioTrack('track-1');
    
    render(
      <AudioContainer 
        {...defaultProps}
        audioTracks={[mockTrack]}
        autoPlay={false}
      />
    );
    
    const audioElement = document.querySelector('audio');
    expect(audioElement).not.toHaveAttribute('autoplay');
  });

  it('should call onAudioTrackAttached callback', () => {
    const mockTrack = createMockAudioTrack('track-1');
    const onAudioTrackAttached = jest.fn();
    
    render(
      <AudioContainer 
        {...defaultProps}
        audioTracks={[mockTrack]}
        onAudioTrackAttached={onAudioTrackAttached}
      />
    );
    
    expect(onAudioTrackAttached).toHaveBeenCalledWith(
      expect.any(HTMLAudioElement),
      mockTrack
    );
  });

  it('should handle multiple audio tracks', () => {
    const mockTrack1 = createMockAudioTrack('track-1');
    const mockTrack2 = createMockAudioTrack('track-2');
    
    render(
      <AudioContainer 
        {...defaultProps} 
        audioTracks={[mockTrack1, mockTrack2]} 
      />
    );
    
    expect(mockTrack1.attach).toHaveBeenCalled();
    expect(mockTrack2.attach).toHaveBeenCalled();
    
    const audioElements = document.querySelectorAll('audio');
    expect(audioElements).toHaveLength(2);
    
    expect(screen.getByText(/2 tracks/)).toBeInTheDocument();
  });

  it('should remove audio element when track is removed', () => {
    const mockTrack1 = createMockAudioTrack('track-1');
    const mockTrack2 = createMockAudioTrack('track-2');
    
    const { rerender } = render(
      <AudioContainer {...defaultProps} audioTracks={[mockTrack1, mockTrack2]} />
    );
    
    // Initially should have 2 audio elements
    expect(document.querySelectorAll('audio')).toHaveLength(2);
    
    // Remove one track
    rerender(<AudioContainer {...defaultProps} audioTracks={[mockTrack1]} />);
    
    // Should now have 1 audio element
    expect(document.querySelectorAll('audio')).toHaveLength(1);
  });

  it('should detach tracks on unmount', () => {
    const mockTrack = createMockAudioTrack('track-1');
    
    const { unmount } = render(
      <AudioContainer {...defaultProps} audioTracks={[mockTrack]} />
    );
    
    unmount();
    
    expect(mockTrack.detach).toHaveBeenCalled();
  });

  it('should hide audio controls when showAudioControls is false', () => {
    render(
      <AudioContainer 
        {...defaultProps} 
        audioPlaybackBlocked={true}
        showAudioControls={false}
      />
    );
    
    expect(screen.queryByText(/Audio is blocked/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Audio: Enabled/)).not.toBeInTheDocument();
  });

  it('should handle track attachment errors gracefully', () => {
    const mockTrack = createMockAudioTrack('track-1');
    mockTrack.attach.mockImplementation(() => {
      throw new Error('Attachment failed');
    });
    
    // Should not throw
    expect(() => {
      render(<AudioContainer {...defaultProps} audioTracks={[mockTrack]} />);
    }).not.toThrow();
  });

  it('should set accessibility attributes on audio elements', () => {
    const mockTrack = createMockAudioTrack('track-1');
    
    render(<AudioContainer {...defaultProps} audioTracks={[mockTrack]} />);
    
    const audioElement = document.querySelector('audio');
    expect(audioElement).toHaveAttribute('aria-label', 'BeyondPresence Avatar Audio');
  });

  it('should show track count in status', () => {
    const mockTrack1 = createMockAudioTrack('track-1');
    const mockTrack2 = createMockAudioTrack('track-2');
    const mockTrack3 = createMockAudioTrack('track-3');
    
    render(
      <AudioContainer 
        {...defaultProps} 
        audioTracks={[mockTrack1, mockTrack2, mockTrack3]} 
      />
    );
    
    expect(screen.getByText(/3 tracks/)).toBeInTheDocument();
  });

  it('should handle onStartAudio errors gracefully', async () => {
    const onStartAudio = jest.fn().mockRejectedValue(new Error('Start audio failed'));
    
    render(
      <AudioContainer 
        {...defaultProps} 
        audioPlaybackBlocked={true}
        onStartAudio={onStartAudio}
      />
    );
    
    const enableButton = screen.getByText('Enable Audio');
    fireEvent.click(enableButton);
    
    await waitFor(() => {
      expect(screen.getByText('Enable Audio')).toBeInTheDocument();
    });
    
    expect(enableButton).not.toBeDisabled();
  });
});