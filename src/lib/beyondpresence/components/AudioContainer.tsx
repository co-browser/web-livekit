'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { RemoteAudioTrack } from 'livekit-client';
import { createContextLogger } from '../utils/logger';

interface AudioContainerProps {
  audioTracks: RemoteAudioTrack[];
  canPlayAudio: boolean;
  audioPlaybackBlocked: boolean;
  onStartAudio?: () => Promise<void>;
  onAudioTrackAttached?: (element: HTMLAudioElement, track: RemoteAudioTrack) => void;
  className?: string;
  showAudioControls?: boolean;
  autoPlay?: boolean;
}

/**
 * Component for rendering BeyondPresence audio tracks with browser restriction handling
 */
export function AudioContainer({
  audioTracks,
  canPlayAudio,
  audioPlaybackBlocked,
  onStartAudio,
  onAudioTrackAttached,
  className = '',
  showAudioControls = true,
  autoPlay = true
}: AudioContainerProps) {
  const logger = createContextLogger('AudioContainer');
  const containerRef = useRef<HTMLDivElement>(null);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const [isStartingAudio, setIsStartingAudio] = useState(false);

  // Create audio element for a track
  const createAudioElement = useCallback((track: RemoteAudioTrack): HTMLAudioElement => {
    const audioElement = document.createElement('audio');
    
    // Configure audio element
    audioElement.autoplay = autoPlay;
    audioElement.controls = false; // We'll handle controls ourselves
    audioElement.preload = 'auto';
    
    // Set accessibility attributes
    audioElement.setAttribute('aria-label', 'BeyondPresence Avatar Audio');
    
    // Hide the element (audio is invisible anyway)
    audioElement.style.display = 'none';

    return audioElement;
  }, [autoPlay]);

  // Attach track to audio element
  const attachTrack = useCallback((track: RemoteAudioTrack, audioElement: HTMLAudioElement) => {
    try {
      track.attach(audioElement);
      
      logger.info('Audio track attached successfully', {
        trackSid: track.sid,
        trackSource: track.source
      });

      // Call callback if provided
      onAudioTrackAttached?.(audioElement, track);

    } catch (error) {
      logger.error('Failed to attach audio track', error as Error, {
        trackSid: track.sid
      });
    }
  }, [onAudioTrackAttached, logger]);

  // Detach track from audio element
  const detachTrack = useCallback((track: RemoteAudioTrack) => {
    try {
      track.detach();
      
      logger.info('Audio track detached successfully', {
        trackSid: track.sid
      });

    } catch (error) {
      logger.error('Failed to detach audio track', error as Error, {
        trackSid: track.sid
      });
    }
  }, [logger]);

  // Handle start audio button click
  const handleStartAudio = useCallback(async () => {
    if (!onStartAudio || isStartingAudio) return;

    setIsStartingAudio(true);
    
    try {
      await onStartAudio();
      logger.info('Audio playback started successfully');
    } catch (error) {
      logger.error('Failed to start audio playback', error as Error);
    } finally {
      setIsStartingAudio(false);
    }
  }, [onStartAudio, isStartingAudio, logger]);

  // Handle audio tracks changes
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const currentElements = audioElementsRef.current;

    // Get current track SIDs
    const currentTrackSids = new Set(audioTracks.map(track => track.sid));
    const existingTrackSids = new Set(currentElements.keys());

    // Remove elements for tracks that are no longer present
    for (const [trackSid, element] of currentElements.entries()) {
      if (!currentTrackSids.has(trackSid)) {
        // Remove element from DOM
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
        
        // Remove from our tracking
        currentElements.delete(trackSid);
        
        logger.info('Removed audio element for detached track', { trackSid });
      }
    }

    // Add elements for new tracks
    for (const track of audioTracks) {
      if (!existingTrackSids.has(track.sid)) {
        const audioElement = createAudioElement(track);
        
        // Add to container
        container.appendChild(audioElement);
        
        // Attach track
        attachTrack(track, audioElement);
        
        // Track the element
        currentElements.set(track.sid, audioElement);
        
        logger.info('Added audio element for new track', { trackSid: track.sid });
      }
    }

  }, [audioTracks, createAudioElement, attachTrack, logger]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Detach all tracks and clean up elements
      for (const [trackSid, element] of audioElementsRef.current.entries()) {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      }
      audioElementsRef.current.clear();
      
      // Detach all tracks
      audioTracks.forEach(track => {
        detachTrack(track);
      });
    };
  }, []);

  // Handle audio events
  const handleAudioLoad = useCallback((event: Event) => {
    const audioElement = event.target as HTMLAudioElement;
    logger.info('Audio loaded successfully', {
      duration: audioElement.duration,
      readyState: audioElement.readyState
    });
  }, [logger]);

  const handleAudioError = useCallback((event: Event) => {
    const audioElement = event.target as HTMLAudioElement;
    const error = audioElement.error;
    
    logger.error('Audio playback error', new Error(error?.message || 'Unknown audio error'), {
      errorCode: error?.code,
      networkState: audioElement.networkState,
      readyState: audioElement.readyState
    });
  }, [logger]);

  const handleAudioPlay = useCallback((event: Event) => {
    logger.info('Audio playback started');
  }, [logger]);

  const handleAudioPause = useCallback((event: Event) => {
    logger.info('Audio playback paused');
  }, [logger]);

  // Add event listeners to container for delegated event handling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Use event delegation for audio events
    const handleLoad = (event: Event) => {
      if ((event.target as HTMLElement).tagName === 'AUDIO') {
        handleAudioLoad(event);
      }
    };

    const handleError = (event: Event) => {
      if ((event.target as HTMLElement).tagName === 'AUDIO') {
        handleAudioError(event);
      }
    };

    const handlePlay = (event: Event) => {
      if ((event.target as HTMLElement).tagName === 'AUDIO') {
        handleAudioPlay(event);
      }
    };

    const handlePause = (event: Event) => {
      if ((event.target as HTMLElement).tagName === 'AUDIO') {
        handleAudioPause(event);
      }
    };

    container.addEventListener('loadeddata', handleLoad);
    container.addEventListener('error', handleError, true);
    container.addEventListener('play', handlePlay);
    container.addEventListener('pause', handlePause);

    return () => {
      container.removeEventListener('loadeddata', handleLoad);
      container.removeEventListener('error', handleError, true);
      container.removeEventListener('play', handlePlay);
      container.removeEventListener('pause', handlePause);
    };
  }, [handleAudioLoad, handleAudioError, handleAudioPlay, handleAudioPause]);

  return (
    <div 
      ref={containerRef}
      className={`beyondpresence-audio-container ${className}`}
      style={{
        position: 'relative',
        width: '100%'
      }}
    >
      {/* Audio elements will be added here programmatically */}
      
      {/* Audio controls and status */}
      {showAudioControls && (
        <div className="audio-controls" style={{ marginTop: '8px' }}>
          {audioPlaybackBlocked && onStartAudio && (
            <div 
              className="audio-blocked-notice"
              style={{
                padding: '12px',
                backgroundColor: '#fef3c7',
                border: '1px solid #f59e0b',
                borderRadius: '6px',
                marginBottom: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', color: '#92400e' }}>
                  🔊 Audio is blocked by your browser. Click to enable:
                </span>
                <button
                  onClick={handleStartAudio}
                  disabled={isStartingAudio}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: isStartingAudio ? 'not-allowed' : 'pointer',
                    opacity: isStartingAudio ? 0.6 : 1
                  }}
                >
                  {isStartingAudio ? 'Starting...' : 'Enable Audio'}
                </button>
              </div>
            </div>
          )}
          
          {/* Audio status indicator */}
          <div 
            className="audio-status"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              color: '#6b7280'
            }}
          >
            <span 
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: canPlayAudio ? '#10b981' : '#ef4444'
              }}
            />
            <span>
              Audio: {canPlayAudio ? 'Enabled' : 'Disabled'} 
              {audioTracks.length > 0 && ` (${audioTracks.length} track${audioTracks.length > 1 ? 's' : ''})`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}