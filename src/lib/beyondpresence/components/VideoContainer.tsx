'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { RemoteVideoTrack } from 'livekit-client';
import { createContextLogger } from '../utils/logger';

interface VideoContainerProps {
  videoTracks: RemoteVideoTrack[];
  className?: string;
  videoClassName?: string;
  onVideoTrackAttached?: (element: HTMLVideoElement, track: RemoteVideoTrack) => void;
  autoPlay?: boolean;
  muted?: boolean;
  playsInline?: boolean;
}

/**
 * Component for rendering BeyondPresence video tracks
 */
export function VideoContainer({
  videoTracks,
  className = '',
  videoClassName = '',
  onVideoTrackAttached,
  autoPlay = true,
  muted = true,
  playsInline = true
}: VideoContainerProps) {
  const logger = createContextLogger('VideoContainer');
  const containerRef = useRef<HTMLDivElement>(null);
  const videoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());

  // Create video element for a track
  const createVideoElement = useCallback((track: RemoteVideoTrack): HTMLVideoElement => {
    const videoElement = document.createElement('video');
    
    // Configure video element
    videoElement.autoplay = autoPlay;
    videoElement.muted = muted;
    videoElement.playsInline = playsInline;
    videoElement.controls = false;
    
    // Set attributes for testing
    if (autoPlay) videoElement.setAttribute('autoplay', '');
    if (muted) videoElement.setAttribute('muted', '');
    if (playsInline) videoElement.setAttribute('playsinline', '');
    
    // Add CSS classes
    if (videoClassName) {
      videoElement.className = videoClassName;
    } else {
      // Default styling for optimal avatar display
      videoElement.style.width = '100%';
      videoElement.style.height = '100%';
      videoElement.style.objectFit = 'cover';
      videoElement.style.borderRadius = '8px';
    }

    // Set accessibility attributes
    videoElement.setAttribute('aria-label', 'BeyondPresence Avatar Video');
    videoElement.setAttribute('role', 'img');

    return videoElement;
  }, [autoPlay, muted, playsInline, videoClassName]);

  // Attach track to video element
  const attachTrack = useCallback((track: RemoteVideoTrack, videoElement: HTMLVideoElement) => {
    try {
      track.attach(videoElement);
      
      logger.info('Video track attached successfully', {
        trackSid: track.sid,
        trackSource: track.source
      });

      // Call callback if provided
      onVideoTrackAttached?.(videoElement, track);

    } catch (error) {
      logger.error('Failed to attach video track', error as Error, {
        trackSid: track.sid
      });
    }
  }, [onVideoTrackAttached, logger]);

  // Detach track from video element
  const detachTrack = useCallback((track: RemoteVideoTrack) => {
    try {
      track.detach();
      
      logger.info('Video track detached successfully', {
        trackSid: track.sid
      });

    } catch (error) {
      logger.error('Failed to detach video track', error as Error, {
        trackSid: track.sid
      });
    }
  }, [logger]);

  // Handle video tracks changes
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const currentElements = videoElementsRef.current;

    // Get current track SIDs
    const currentTrackSids = new Set(videoTracks.map(track => track.sid));
    const existingTrackSids = new Set(currentElements.keys());

    // Remove elements for tracks that are no longer present
    for (const [trackSid, element] of currentElements.entries()) {
      if (!currentTrackSids.has(trackSid)) {
        // Find the track to detach
        const trackToDetach = Array.from(currentElements.entries())
          .find(([sid]) => sid === trackSid);
        
        if (trackToDetach) {
          // Remove element from DOM
          if (element.parentNode) {
            element.parentNode.removeChild(element);
          }
          
          // Remove from our tracking
          currentElements.delete(trackSid);
          
          logger.info('Removed video element for detached track', { trackSid });
        }
      }
    }

    // Add elements for new tracks
    for (const track of videoTracks) {
      if (!existingTrackSids.has(track.sid)) {
        const videoElement = createVideoElement(track);
        
        // Add to container
        container.appendChild(videoElement);
        
        // Attach track
        attachTrack(track, videoElement);
        
        // Track the element
        currentElements.set(track.sid, videoElement);
        
        logger.info('Added video element for new track', { trackSid: track.sid });
      }
    }

  }, [videoTracks, createVideoElement, attachTrack, logger]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Detach all tracks and clean up elements
      for (const [trackSid, element] of videoElementsRef.current.entries()) {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      }
      videoElementsRef.current.clear();
      
      // Detach all tracks
      videoTracks.forEach(track => {
        detachTrack(track);
      });
    };
  }, []);

  // Handle video load events
  const handleVideoLoad = useCallback((event: Event) => {
    const videoElement = event.target as HTMLVideoElement;
    logger.info('Video loaded successfully', {
      videoWidth: videoElement.videoWidth,
      videoHeight: videoElement.videoHeight
    });
  }, [logger]);

  // Handle video error events
  const handleVideoError = useCallback((event: Event) => {
    const videoElement = event.target as HTMLVideoElement;
    const error = videoElement.error;
    
    logger.error('Video playback error', new Error(error?.message || 'Unknown video error'), {
      errorCode: error?.code,
      networkState: videoElement.networkState,
      readyState: videoElement.readyState
    });
  }, [logger]);

  // Add event listeners to container for delegated event handling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Use event delegation for video events
    const handleLoad = (event: Event) => {
      if ((event.target as HTMLElement).tagName === 'VIDEO') {
        handleVideoLoad(event);
      }
    };

    const handleError = (event: Event) => {
      if ((event.target as HTMLElement).tagName === 'VIDEO') {
        handleVideoError(event);
      }
    };

    container.addEventListener('loadeddata', handleLoad);
    container.addEventListener('error', handleError, true); // Use capture for error events

    return () => {
      container.removeEventListener('loadeddata', handleLoad);
      container.removeEventListener('error', handleError, true);
    };
  }, [handleVideoLoad, handleVideoError]);

  return (
    <div 
      ref={containerRef}
      className={`beyondpresence-video-container ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {videoTracks.length === 0 && (
        <div 
          className="no-video-placeholder"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '200px',
            backgroundColor: '#f3f4f6',
            borderRadius: '8px',
            color: '#6b7280',
            fontSize: '14px'
          }}
        >
          No video tracks available
        </div>
      )}
    </div>
  );
}