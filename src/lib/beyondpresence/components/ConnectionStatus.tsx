'use client';

import React from 'react';
import { BeyondPresenceSession } from '../types';

interface ConnectionStatusProps {
  isConnecting: boolean;
  isConnected: boolean;
  error: Error | null;
  session: BeyondPresenceSession | null;
  className?: string;
  showDetails?: boolean;
  onRetry?: () => void;
}

/**
 * Component for displaying BeyondPresence connection status and error information
 */
export function ConnectionStatus({
  isConnecting,
  isConnected,
  error,
  session,
  className = '',
  showDetails = false,
  onRetry
}: ConnectionStatusProps) {
  
  // Determine status color and icon
  const getStatusInfo = () => {
    if (error) {
      return {
        color: '#ef4444',
        backgroundColor: '#fef2f2',
        borderColor: '#fecaca',
        icon: '❌',
        text: 'Connection Error',
        description: error.message
      };
    }
    
    if (isConnecting) {
      return {
        color: '#f59e0b',
        backgroundColor: '#fffbeb',
        borderColor: '#fed7aa',
        icon: '🔄',
        text: 'Connecting...',
        description: 'Establishing connection to BeyondPresence'
      };
    }
    
    if (isConnected) {
      return {
        color: '#10b981',
        backgroundColor: '#f0fdf4',
        borderColor: '#bbf7d0',
        icon: '✅',
        text: 'Connected',
        description: session ? `Session: ${session.id.slice(0, 8)}...` : 'Connected to BeyondPresence'
      };
    }
    
    return {
      color: '#6b7280',
      backgroundColor: '#f9fafb',
      borderColor: '#e5e7eb',
      icon: '⚪',
      text: 'Disconnected',
      description: 'Not connected to BeyondPresence'
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <div 
      className={`beyondpresence-connection-status ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        backgroundColor: statusInfo.backgroundColor,
        border: `1px solid ${statusInfo.borderColor}`,
        borderRadius: '6px',
        fontSize: '14px',
        color: statusInfo.color,
        fontWeight: '500'
      }}
    >
      {/* Status icon with animation for connecting state */}
      <span 
        style={{
          display: 'inline-block',
          animation: isConnecting ? 'spin 1s linear infinite' : 'none'
        }}
      >
        {statusInfo.icon}
      </span>
      
      {/* Status text */}
      <span>{statusInfo.text}</span>
      
      {/* Retry button for error state */}
      {error && onRetry && (
        <button
          onClick={onRetry}
          style={{
            marginLeft: '8px',
            padding: '4px 8px',
            backgroundColor: statusInfo.color,
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.opacity = '0.8';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          Retry
        </button>
      )}
      
      {/* Detailed information */}
      {showDetails && (
        <div 
          style={{
            marginLeft: '8px',
            fontSize: '12px',
            color: '#6b7280',
            fontWeight: '400'
          }}
        >
          {statusInfo.description}
        </div>
      )}
      
      {/* Session details when connected */}
      {showDetails && isConnected && session && (
        <div 
          style={{
            marginLeft: '8px',
            fontSize: '11px',
            color: '#9ca3af',
            fontWeight: '400'
          }}
        >
          Avatar: {session.avatarId.slice(0, 8)}...
        </div>
      )}
      
      {/* CSS for spin animation */}
      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Compact version of ConnectionStatus for minimal UI space
 */
export function ConnectionStatusCompact({
  isConnecting,
  isConnected,
  error,
  className = ''
}: Pick<ConnectionStatusProps, 'isConnecting' | 'isConnected' | 'error' | 'className'>) {
  const getStatusInfo = () => {
    if (error) return { color: '#ef4444', icon: '❌' };
    if (isConnecting) return { color: '#f59e0b', icon: '🔄' };
    if (isConnected) return { color: '#10b981', icon: '✅' };
    return { color: '#6b7280', icon: '⚪' };
  };

  const statusInfo = getStatusInfo();

  return (
    <span 
      className={`beyondpresence-connection-status-compact ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        backgroundColor: statusInfo.color + '20', // 20% opacity
        color: statusInfo.color,
        fontSize: '12px',
        animation: isConnecting ? 'spin 1s linear infinite' : 'none'
      }}
      title={
        error ? `Error: ${error.message}` :
        isConnecting ? 'Connecting...' :
        isConnected ? 'Connected' :
        'Disconnected'
      }
    >
      {statusInfo.icon}
      
      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </span>
  );
}

/**
 * Detailed ConnectionStatus with expanded information and controls
 */
export function ConnectionStatusDetailed({
  isConnecting,
  isConnected,
  error,
  session,
  className = '',
  onRetry,
  onDisconnect
}: ConnectionStatusProps & { onDisconnect?: () => void }) {
  const statusInfo = (() => {
    if (error) {
      return {
        color: '#ef4444',
        backgroundColor: '#fef2f2',
        borderColor: '#fecaca',
        icon: '❌',
        title: 'Connection Error',
        subtitle: error.message
      };
    }
    
    if (isConnecting) {
      return {
        color: '#f59e0b',
        backgroundColor: '#fffbeb',
        borderColor: '#fed7aa',
        icon: '🔄',
        title: 'Connecting to BeyondPresence',
        subtitle: 'Please wait while we establish the connection...'
      };
    }
    
    if (isConnected && session) {
      return {
        color: '#10b981',
        backgroundColor: '#f0fdf4',
        borderColor: '#bbf7d0',
        icon: '✅',
        title: 'Connected to BeyondPresence',
        subtitle: `Session ID: ${session.id}`
      };
    }
    
    return {
      color: '#6b7280',
      backgroundColor: '#f9fafb',
      borderColor: '#e5e7eb',
      icon: '⚪',
      title: 'Not Connected',
      subtitle: 'Click connect to start streaming'
    };
  })();

  return (
    <div 
      className={`beyondpresence-connection-status-detailed ${className}`}
      style={{
        padding: '16px',
        backgroundColor: statusInfo.backgroundColor,
        border: `1px solid ${statusInfo.borderColor}`,
        borderRadius: '8px',
        color: statusInfo.color
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <span 
          style={{
            fontSize: '20px',
            animation: isConnecting ? 'spin 1s linear infinite' : 'none'
          }}
        >
          {statusInfo.icon}
        </span>
        
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
            {statusInfo.title}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>
            {statusInfo.subtitle}
          </div>
          
          {/* Session details */}
          {isConnected && session && (
            <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '12px' }}>
              <div>Avatar ID: {session.avatarId}</div>
              <div>Status: {session.status}</div>
              <div>Created: {new Date(session.createdAt).toLocaleString()}</div>
            </div>
          )}
          
          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {error && onRetry && (
              <button
                onClick={onRetry}
                style={{
                  padding: '6px 12px',
                  backgroundColor: statusInfo.color,
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Retry Connection
              </button>
            )}
            
            {isConnected && onDisconnect && (
              <button
                onClick={onDisconnect}
                style={{
                  padding: '6px 12px',
                  backgroundColor: 'transparent',
                  color: statusInfo.color,
                  border: `1px solid ${statusInfo.color}`,
                  borderRadius: '4px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Disconnect
              </button>
            )}
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}