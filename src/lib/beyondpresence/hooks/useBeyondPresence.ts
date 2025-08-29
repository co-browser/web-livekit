import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Room, 
  RoomEvent, 
  RemoteVideoTrack, 
  RemoteAudioTrack, 
  RemoteTrack,
  RemoteTrackPublication,
  RemoteParticipant,
  Track
} from 'livekit-client';
import type { 
  UseBeyondPresenceConfig, 
  UseBeyondPresenceReturn, 
  BeyondPresenceSession 
} from '../types';
import { BeyondPresenceService } from '../services/BeyondPresenceService';
import { LiveKitService } from '../services/LiveKitService';
import { createContextLogger } from '../utils/logger';
import { validateBrowserSupport } from '../utils/browserCompat';

/**
 * React hook for managing BeyondPresence avatar streaming
 */
export function useBeyondPresence(config: UseBeyondPresenceConfig): UseBeyondPresenceReturn {
  const logger = createContextLogger('useBeyondPresence');
  
  // Services
  const beyondPresenceService = useRef<BeyondPresenceService | null>(null);
  const liveKitService = useRef<LiveKitService | null>(null);

  // State
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [session, setSession] = useState<BeyondPresenceSession | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [videoTracks, setVideoTracks] = useState<RemoteVideoTrack[]>([]);
  const [audioTracks, setAudioTracks] = useState<RemoteAudioTrack[]>([]);
  const [canPlayAudio, setCanPlayAudio] = useState(false);
  const [audioPlaybackBlocked, setAudioPlaybackBlocked] = useState(false);

  // Initialize services
  useEffect(() => {
    try {
      validateBrowserSupport();
      
      beyondPresenceService.current = new BeyondPresenceService(config.beyondPresence);
      liveKitService.current = new LiveKitService();
      
      logger.info('Services initialized successfully');
    } catch (err) {
      logger.error('Failed to initialize services', err as Error);
      setError(err as Error);
      config.onError?.(err as Error);
    }
  }, [config.beyondPresence.apiKey, config.beyondPresence.baseUrl]);

  // Track subscription handler
  const handleTrackSubscribed = useCallback((
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant
  ) => {
    logger.info('Track subscribed', {
      trackKind: track.kind,
      trackSource: track.source,
      participant: participant.identity
    });

    if (track.kind === Track.Kind.Video) {
      const videoTrack = track as RemoteVideoTrack;
      setVideoTracks(prev => [...prev, videoTrack]);
    } else if (track.kind === Track.Kind.Audio) {
      const audioTrack = track as RemoteAudioTrack;
      setAudioTracks(prev => [...prev, audioTrack]);
    }
  }, [logger]);

  // Track unsubscription handler
  const handleTrackUnsubscribed = useCallback((
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant
  ) => {
    logger.info('Track unsubscribed', {
      trackKind: track.kind,
      trackSource: track.source,
      participant: participant.identity
    });

    if (track.kind === Track.Kind.Video) {
      const videoTrack = track as RemoteVideoTrack;
      setVideoTracks(prev => prev.filter(t => t !== videoTrack));
      // Detach track from all elements
      videoTrack.detach();
    } else if (track.kind === Track.Kind.Audio) {
      const audioTrack = track as RemoteAudioTrack;
      setAudioTracks(prev => prev.filter(t => t !== audioTrack));
      // Detach track from all elements
      audioTrack.detach();
    }
  }, [logger]);

  // Audio playback status handler
  const handleAudioPlaybackStatusChanged = useCallback(() => {
    const room = liveKitService.current?.getRoom();
    if (room) {
      const canPlay = room.canPlaybackAudio;
      setCanPlayAudio(canPlay);
      setAudioPlaybackBlocked(!canPlay);
      
      logger.info('Audio playback status changed', { canPlay });
    }
  }, [logger]);

  // Connection handler
  const handleConnected = useCallback(() => {
    setIsConnected(true);
    setIsConnecting(false);
    setError(null);
    
    logger.info('Connected to LiveKit room');
    config.onConnected?.();
  }, [config.onConnected, logger]);

  // Disconnection handler
  const handleDisconnected = useCallback((reason?: string) => {
    setIsConnected(false);
    setIsConnecting(false);
    setRoom(null);
    setVideoTracks([]);
    setAudioTracks([]);
    setCanPlayAudio(false);
    setAudioPlaybackBlocked(false);
    
    logger.info('Disconnected from LiveKit room', { reason });
    config.onDisconnected?.();
  }, [config.onDisconnected, logger]);

  // Connect function
  const connect = useCallback(async () => {
    if (!beyondPresenceService.current || !liveKitService.current) {
      const error = new Error('Services not initialized');
      setError(error);
      config.onError?.(error);
      return;
    }

    if (isConnecting || isConnected) {
      logger.warn('Already connecting or connected');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      logger.info('Starting connection process');

      // Create BeyondPresence session (simplified - just gets viewer token)
      const newSession = await beyondPresenceService.current.createSession({
        ...config.session,
        roomName: `avatar-room-${Date.now()}` // Match Python agent's room naming
      });
      setSession(newSession);
      
      logger.info('Viewer session created', { 
        sessionId: newSession.id,
        roomName: newSession.roomName,
        fullSession: newSession
      });
      console.log('Full session details:', newSession);
      
      // Decode the viewer token to see room name
      if (newSession.livekitToken) {
        const tokenParts = newSession.livekitToken.split('.');
        if (tokenParts.length === 3) {
          try {
            const payload = JSON.parse(atob(tokenParts[1]));
            console.log('Viewer token payload:', payload);
            console.log('Viewer will join room:', payload.video?.room);
            console.log('Viewer identity:', payload.sub);
          } catch (e) {
            console.log('Could not decode viewer token');
          }
        }
      }

      // Connect to LiveKit room
      const room = await liveKitService.current.connect({
        url: newSession.livekitUrl,
        token: newSession.livekitToken
      });

      setRoom(room);

      // Set up event listeners
      room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      room.on(RoomEvent.AudioPlaybackStatusChanged, handleAudioPlaybackStatusChanged);
      room.on(RoomEvent.Connected, handleConnected);
      room.on(RoomEvent.Disconnected, handleDisconnected);

      // Update audio playback status
      setCanPlayAudio(room.canPlaybackAudio);
      setAudioPlaybackBlocked(!room.canPlaybackAudio);

      // If room is already connected, trigger connected handler
      if (liveKitService.current.isConnected()) {
        handleConnected();
      }

      // Log room state for debugging
      logger.info('Room state after connection', {
        roomName: room.name,
        localParticipant: room.localParticipant?.identity,
        state: room.state,
        canPublishData: room.localParticipant?.canPublishData,
        canPublishSources: room.localParticipant?.canPublishSources
      });

      // Check for existing participants periodically
      const checkInterval = setInterval(() => {
        if (room.remoteParticipants.size > 0) {
          logger.info('🎉 Remote participants found!', {
            count: room.remoteParticipants.size,
            participants: Array.from(room.remoteParticipants.values()).map(p => ({
              identity: p.identity,
              sid: p.sid,
              isAgent: p.isAgent,
              isCameraEnabled: p.isCameraEnabled,
              isMicrophoneEnabled: p.isMicrophoneEnabled,
              tracks: Array.from(p.trackPublications.values()).map(t => ({
                kind: t.kind,
                source: t.source,
                isSubscribed: t.isSubscribed,
                isEnabled: t.isEnabled
              }))
            }))
          });
          clearInterval(checkInterval);
        } else {
          logger.warn('Still waiting for avatar to join...', {
            roomName: room.name,
            localParticipant: room.localParticipant?.identity,
            state: room.state,
            elapsedSeconds: 5
          });
        }
      }, 5000);
      
      // Clear interval after 30 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (room.remoteParticipants.size === 0) {
          logger.error('Avatar never joined the room after 30 seconds');
        }
      }, 30000);

    } catch (err) {
      logger.error('Connection failed', err as Error);
      setError(err as Error);
      setIsConnecting(false);
      config.onError?.(err as Error);
    }
  }, [
    config.session,
    config.onError,
    isConnecting,
    isConnected,
    handleTrackSubscribed,
    handleTrackUnsubscribed,
    handleAudioPlaybackStatusChanged,
    handleConnected,
    handleDisconnected,
    logger
  ]);

  // Disconnect function
  const disconnect = useCallback(async () => {
    if (!liveKitService.current) {
      return;
    }

    try {
      logger.info('Disconnecting from LiveKit room');
      
      // Clean up tracks
      videoTracks.forEach(track => track.detach());
      audioTracks.forEach(track => track.detach());
      
      await liveKitService.current.disconnect();
      
      // Clean up session if exists
      if (session && beyondPresenceService.current) {
        try {
          await beyondPresenceService.current.destroySession(session.id);
        } catch (err) {
          logger.warn('Failed to destroy session', err as Error);
        }
      }
      
      setSession(null);
      handleDisconnected('Manual disconnect');
      
    } catch (err) {
      logger.error('Disconnect failed', err as Error);
      setError(err as Error);
      config.onError?.(err as Error);
    }
  }, [session, videoTracks, audioTracks, handleDisconnected, config.onError, logger]);

  // Start audio function
  const startAudio = useCallback(async () => {
    if (!liveKitService.current) {
      const error = new Error('LiveKit service not initialized');
      setError(error);
      config.onError?.(error);
      return;
    }

    try {
      await liveKitService.current.startAudio();
      setCanPlayAudio(true);
      setAudioPlaybackBlocked(false);
      
      logger.info('Audio playback started successfully');
    } catch (err) {
      logger.error('Failed to start audio', err as Error);
      setError(err as Error);
      config.onError?.(err as Error);
    }
  }, [config.onError, logger]);

  // Start capturing and publishing microphone audio as LiveKit track
  const startMicrophoneStream = useCallback(async () => {
    if (!room) {
      const error = new Error('Room not connected');
      setError(error);
      config.onError?.(error);
      return;
    }

    try {
      logger.info('Starting microphone capture for voice chat');
      
      // Enable microphone and publish as LiveKit audio track
      // This allows the Python agent to subscribe to our audio
      await room.localParticipant.setMicrophoneEnabled(true);
      
      logger.info('Microphone enabled and publishing to room');
      
      // Check if microphone track was published
      const micTrack = room.localParticipant.getTrackPublication(Track.Source.Microphone);
      if (micTrack) {
        logger.info('Microphone track published successfully', {
          trackSid: micTrack.trackSid,
          isEnabled: micTrack.isEnabled,
          isMuted: micTrack.isMuted
        });
      }
      
      // Return cleanup function
      return async () => {
        await room.localParticipant.setMicrophoneEnabled(false);
        logger.info('Microphone disabled');
      };
    } catch (err) {
      logger.error('Failed to start microphone stream', err as Error);
      setError(err as Error);
      config.onError?.(err as Error);
    }
  }, [room, config.onError, logger]);

  // Auto-connect effect
  useEffect(() => {
    if (config.autoConnect && !isConnecting && !isConnected && !error) {
      connect();
    }
  }, [config.autoConnect, isConnecting, isConnected, error, connect]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (isConnected) {
        disconnect();
      }
    };
  }, []);

  return {
    // Connection state
    isConnecting,
    isConnected,
    error,
    
    // Session data
    session,
    room,
    
    // Track management
    videoTracks,
    audioTracks,
    
    // Control methods
    connect,
    disconnect,
    startAudio,
    startMicrophoneStream,
    
    // Audio state
    canPlayAudio,
    audioPlaybackBlocked
  };
}