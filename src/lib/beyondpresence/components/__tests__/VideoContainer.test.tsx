import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { VideoContainer } from '../VideoContainer';
import { RemoteVideoTrack } from 'livekit-client';

// Mock the logger
jest.mock('../../utils/logger', () => ({
  createContextLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  })
}));

// Mock RemoteVideoTrack
const createMockVideoTrack = (sid: string): jest.Mocked<RemoteVideoTrack> => ({
  sid,
  source: 'camera',
  kind: 'video',
  attach: jest.fn(),
  detach: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
} as any);

describe('VideoContainer', () => {
  afterEach(() => {
    cleanup();
  });

  it('should render with no video tracks', () => {
    render(<VideoContainer videoTracks={[]} />);
    
    expect(screen.getByText('No video tracks available')).toBeInTheDocument();
  });

  it('should render video container with proper styling', () => {
    const { container } = render(<VideoContainer videoTracks={[]} />);
    
    const videoContainer = container.querySelector('.beyondpresence-video-container');
    expect(videoContainer).toBeInTheDocument();
    expect(videoContainer).toHaveStyle({
      position: 'relative',
      width: '100%',
      height: '100%'
    });
  });

  it('should apply custom className', () => {
    const { container } = render(
      <VideoContainer videoTracks={[]} className="custom-class" />
    );
    
    const videoContainer = container.querySelector('.beyondpresence-video-container');
    expect(videoContainer).toHaveClass('custom-class');
  });

  it('should create video element when track is added', () => {
    const mockTrack = createMockVideoTrack('track-1');
    
    render(<VideoContainer videoTracks={[mockTrack]} />);
    
    expect(mockTrack.attach).toHaveBeenCalled();
    
    // Check that a video element was created
    const videoElement = document.querySelector('video');
    expect(videoElement).toBeInTheDocument();
    expect(videoElement).toHaveAttribute('autoplay');
    expect(videoElement).toHaveAttribute('muted');
    expect(videoElement).toHaveAttribute('playsinline');
  });

  it('should apply custom video className', () => {
    const mockTrack = createMockVideoTrack('track-1');
    
    render(
      <VideoContainer 
        videoTracks={[mockTrack]} 
        videoClassName="custom-video-class" 
      />
    );
    
    const videoElement = document.querySelector('video');
    expect(videoElement).toHaveClass('custom-video-class');
  });

  it('should configure video element properties', () => {
    const mockTrack = createMockVideoTrack('track-1');
    
    render(
      <VideoContainer 
        videoTracks={[mockTrack]}
        autoPlay={false}
        muted={false}
        playsInline={false}
      />
    );
    
    const videoElement = document.querySelector('video');
    expect(videoElement).not.toHaveAttribute('autoplay');
    expect(videoElement).not.toHaveAttribute('muted');
    expect(videoElement).not.toHaveAttribute('playsinline');
  });

  it('should call onVideoTrackAttached callback', () => {
    const mockTrack = createMockVideoTrack('track-1');
    const onVideoTrackAttached = jest.fn();
    
    render(
      <VideoContainer 
        videoTracks={[mockTrack]}
        onVideoTrackAttached={onVideoTrackAttached}
      />
    );
    
    expect(onVideoTrackAttached).toHaveBeenCalledWith(
      expect.any(HTMLVideoElement),
      mockTrack
    );
  });

  it('should handle multiple video tracks', () => {
    const mockTrack1 = createMockVideoTrack('track-1');
    const mockTrack2 = createMockVideoTrack('track-2');
    
    render(<VideoContainer videoTracks={[mockTrack1, mockTrack2]} />);
    
    expect(mockTrack1.attach).toHaveBeenCalled();
    expect(mockTrack2.attach).toHaveBeenCalled();
    
    const videoElements = document.querySelectorAll('video');
    expect(videoElements).toHaveLength(2);
  });

  it('should remove video element when track is removed', () => {
    const mockTrack1 = createMockVideoTrack('track-1');
    const mockTrack2 = createMockVideoTrack('track-2');
    
    const { rerender } = render(
      <VideoContainer videoTracks={[mockTrack1, mockTrack2]} />
    );
    
    // Initially should have 2 video elements
    expect(document.querySelectorAll('video')).toHaveLength(2);
    
    // Remove one track
    rerender(<VideoContainer videoTracks={[mockTrack1]} />);
    
    // Should now have 1 video element
    expect(document.querySelectorAll('video')).toHaveLength(1);
  });

  it('should detach tracks on unmount', () => {
    const mockTrack = createMockVideoTrack('track-1');
    
    const { unmount } = render(<VideoContainer videoTracks={[mockTrack]} />);
    
    unmount();
    
    expect(mockTrack.detach).toHaveBeenCalled();
  });

  it('should set accessibility attributes', () => {
    const mockTrack = createMockVideoTrack('track-1');
    
    render(<VideoContainer videoTracks={[mockTrack]} />);
    
    const videoElement = document.querySelector('video');
    expect(videoElement).toHaveAttribute('aria-label', 'BeyondPresence Avatar Video');
    expect(videoElement).toHaveAttribute('role', 'img');
  });

  it('should handle track attachment errors gracefully', () => {
    const mockTrack = createMockVideoTrack('track-1');
    mockTrack.attach.mockImplementation(() => {
      throw new Error('Attachment failed');
    });
    
    // Should not throw
    expect(() => {
      render(<VideoContainer videoTracks={[mockTrack]} />);
    }).not.toThrow();
  });

  it('should apply default styling when no videoClassName provided', () => {
    const mockTrack = createMockVideoTrack('track-1');
    
    render(<VideoContainer videoTracks={[mockTrack]} />);
    
    const videoElement = document.querySelector('video') as HTMLVideoElement;
    expect(videoElement.style.width).toBe('100%');
    expect(videoElement.style.height).toBe('100%');
    expect(videoElement.style.objectFit).toBe('cover');
    expect(videoElement.style.borderRadius).toBe('8px');
  });
});