'use client';

import React from 'react';
import { useBeyondPresence } from '../hooks/useBeyondPresence';
import { VideoContainer } from './VideoContainer';
import { AudioContainer } from './AudioContainer';
import { ConnectionStatus } from './ConnectionStatus';
import type { BeyondPresenceStreamProps } from '../types';
import { createContextLogger } from '../utils/logger';

/**
 * Main component for BeyondPresence avatar video streaming
 * Orchestrates all sub-components and provides a complete streaming solution
 */
export function BeyondPresenceStream({
  config,
  className = '',
  videoClassName = '',
  audioClassName = '',
  showConnectionStatus = true,
  showErrorDisplay = true,
  onVideoTrackAttached,
  onAudioTrackAttached
}: BeyondPresenceStreamProps) {
  const logger = createContextLogger('BeyondPresenceStream');
  const [micEnabled, setMicEnabled] = React.useState(false);
  const micCleanupRef = React.useRef<(() => Promise<void>) | null>(null);

  // Use the BeyondPresence hook for state management
  const {
    isConnecting,
    isConnected,
    error,
    session,
    room,
    videoTracks,
    audioTracks,
    connect,
    disconnect,
    startAudio,
    startMicrophoneStream,
    canPlayAudio,
    audioPlaybackBlocked
  } = useBeyondPresence(config);

  // Handle connection retry
  const handleRetry = async () => {
    logger.info('Retrying connection');
    await connect();
  };

  // Handle disconnect
  const handleDisconnect = async () => {
    logger.info('Disconnecting from stream');
    // Clean up microphone if enabled
    if (micCleanupRef.current) {
      await micCleanupRef.current();
      micCleanupRef.current = null;
      setMicEnabled(false);
    }
    await disconnect();
  };

  // Request microphone permission on mount
  React.useEffect(() => {
    // Request microphone permission early to avoid user having to click twice
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        logger.info('Microphone permission granted');
        // Stop the stream immediately, we just wanted permission
        stream.getTracks().forEach(track => track.stop());
      })
      .catch(err => {
        logger.warn('Microphone permission denied or not available', err);
      });
  }, []);

  // Auto-enable microphone when connected
  React.useEffect(() => {
    if (isConnected && !micEnabled && videoTracks.length > 0) {
      // Automatically enable microphone when avatar video appears
      logger.info('Auto-enabling microphone as avatar is ready');
      setTimeout(async () => {
        const cleanup = await startMicrophoneStream();
        if (cleanup) {
          micCleanupRef.current = cleanup;
          setMicEnabled(true);
          logger.info('Microphone auto-enabled successfully');
        }
      }, 1000); // Small delay to ensure everything is ready
    }
  }, [isConnected, micEnabled, videoTracks.length, startMicrophoneStream, logger]);

  return (
    <div 
      className={`beyondpresence-stream ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}
    >
      {/* Connection Status */}
      {showConnectionStatus && (
        <div className="connection-status-container">
          <ConnectionStatus
            isConnecting={isConnecting}
            isConnected={isConnected}
            error={error}
            session={session}
            onRetry={handleRetry}
            showDetails={true}
          />
        </div>
      )}

      {/* Error Display */}
      {showErrorDisplay && error && (
        <div 
          className="error-display"
          style={{
            padding: '16px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#dc2626'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                Connection Error
              </div>
              <div style={{ fontSize: '14px', marginBottom: '12px' }}>
                {error.message}
              </div>
              <button
                onClick={handleRetry}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div 
        className="stream-content"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          minHeight: '300px'
        }}
      >
        {/* Video Container */}
        <div 
          className="video-section"
          style={{
            flex: 1,
            minHeight: '200px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            overflow: 'hidden'
          }}
        >
          <VideoContainer
            videoTracks={videoTracks}
            className={videoClassName}
            onVideoTrackAttached={onVideoTrackAttached}
          />
        </div>

        {/* Audio Container */}
        <div className="audio-section">
          <AudioContainer
            audioTracks={audioTracks}
            canPlayAudio={canPlayAudio}
            audioPlaybackBlocked={audioPlaybackBlocked}
            onStartAudio={startAudio}
            onAudioTrackAttached={onAudioTrackAttached}
            className={audioClassName}
          />
        </div>

        {/* Connection Controls */}
        {!isConnected && !isConnecting && !error && (
          <div 
            className="connection-controls"
            style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '20px'
            }}
          >
            <button
              onClick={connect}
              style={{
                padding: '12px 24px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer',
                fontWeight: '600',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#3b82f6';
              }}
            >
              Connect to BeyondPresence
            </button>
          </div>
        )}

        {/* Disconnect and Microphone Controls */}
        {isConnected && (
          <div 
            className="session-controls"
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '12px',
              padding: '12px'
            }}
          >
            <button
              onClick={async () => {
                if (!micEnabled) {
                  logger.info('Starting microphone stream');
                  const cleanup = await startMicrophoneStream();
                  if (cleanup) {
                    micCleanupRef.current = cleanup;
                    setMicEnabled(true);
                    logger.info('Microphone stream started successfully');
                  }
                } else {
                  logger.info('Stopping microphone stream');
                  if (micCleanupRef.current) {
                    await micCleanupRef.current();
                    micCleanupRef.current = null;
                  }
                  setMicEnabled(false);
                  logger.info('Microphone stream stopped');
                }
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: micEnabled ? '#dc2626' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = micEnabled ? '#b91c1c' : '#059669';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = micEnabled ? '#dc2626' : '#10b981';
              }}
            >
              {micEnabled ? '🔇 Stop Microphone' : '🎤 Start Microphone'}
            </button>
            
            <button
              onClick={handleDisconnect}
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                color: '#6b7280',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Disconnect
            </button>
          </div>
        )}

        {/* Loading State */}
        {isConnecting && (
          <div 
            className="loading-overlay"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px'
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div 
                style={{
                  fontSize: '24px',
                  marginBottom: '12px',
                  animation: 'spin 1s linear infinite'
                }}
              >
                🔄
              </div>
              <div style={{ fontSize: '16px', color: '#6b7280' }}>
                Connecting to BeyondPresence...
              </div>
              <div style={{ fontSize: '14px', color: '#9ca3af', marginTop: '4px' }}>
                This may take a few moments
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Debug Information (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div 
          className="debug-info"
          style={{
            padding: '12px',
            backgroundColor: '#f3f4f6',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#6b7280',
            fontFamily: 'monospace'
          }}
        >
          <div>Status: {isConnected ? 'Connected' : isConnecting ? 'Connecting' : 'Disconnected'}</div>
          <div>Video Tracks: {videoTracks.length}</div>
          <div>Audio Tracks: {audioTracks.length}</div>
          <div>Can Play Audio: {canPlayAudio ? 'Yes' : 'No'}</div>
          {session && <div>Session ID: {session.id}</div>}
          {room && <div>Room: {room.name || 'Unknown'}</div>}
        </div>
      )}

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        .beyondpresence-stream {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
            'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
            sans-serif;
        }
        
        .beyondpresence-stream button:focus {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }
        
        .beyondpresence-stream button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

/**
 * Simplified BeyondPresenceStream component with minimal UI
 */
export function BeyondPresenceStreamSimple({
  config,
  className = '',
  onVideoTrackAttached,
  onAudioTrackAttached
}: Pick<BeyondPresenceStreamProps, 'config' | 'className' | 'onVideoTrackAttached' | 'onAudioTrackAttached'>) {
  const {
    videoTracks,
    audioTracks,
    canPlayAudio,
    audioPlaybackBlocked,
    startAudio
  } = useBeyondPresence(config);

  return (
    <div className={`beyondpresence-stream-simple ${className}`}>
      <VideoContainer
        videoTracks={videoTracks}
        onVideoTrackAttached={onVideoTrackAttached}
      />
      <AudioContainer
        audioTracks={audioTracks}
        canPlayAudio={canPlayAudio}
        audioPlaybackBlocked={audioPlaybackBlocked}
        onStartAudio={startAudio}
        onAudioTrackAttached={onAudioTrackAttached}
        showAudioControls={false}
      />
    </div>
  );
}