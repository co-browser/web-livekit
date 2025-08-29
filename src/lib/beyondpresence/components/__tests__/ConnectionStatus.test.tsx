import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { 
  ConnectionStatus, 
  ConnectionStatusCompact, 
  ConnectionStatusDetailed 
} from '../ConnectionStatus';
import { BeyondPresenceSession } from '../../types';

describe('ConnectionStatus Components', () => {
  const mockSession: BeyondPresenceSession = {
    id: 'session-12345678-abcd-efgh',
    avatarId: 'avatar-87654321-dcba-hgfe',
    livekitToken: 'token',
    livekitUrl: 'wss://test.livekit.cloud',
    status: 'active',
    createdAt: '2023-01-01T00:00:00Z',
    expiresAt: '2023-01-02T00:00:00Z'
  };

  afterEach(() => {
    cleanup();
  });

  describe('ConnectionStatus', () => {
    it('should show disconnected state by default', () => {
      render(
        <ConnectionStatus 
          isConnecting={false}
          isConnected={false}
          error={null}
          session={null}
        />
      );

      expect(screen.getByText('Disconnected')).toBeInTheDocument();
      expect(screen.getByText('⚪')).toBeInTheDocument();
    });

    it('should show connecting state', () => {
      render(
        <ConnectionStatus 
          isConnecting={true}
          isConnected={false}
          error={null}
          session={null}
        />
      );

      expect(screen.getByText('Connecting...')).toBeInTheDocument();
      expect(screen.getByText('🔄')).toBeInTheDocument();
    });

    it('should show connected state', () => {
      render(
        <ConnectionStatus 
          isConnecting={false}
          isConnected={true}
          error={null}
          session={mockSession}
        />
      );

      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(screen.getByText('✅')).toBeInTheDocument();
    });

    it('should show error state', () => {
      const error = new Error('Connection failed');
      
      render(
        <ConnectionStatus 
          isConnecting={false}
          isConnected={false}
          error={error}
          session={null}
        />
      );

      expect(screen.getByText('Connection Error')).toBeInTheDocument();
      expect(screen.getByText('❌')).toBeInTheDocument();
    });

    it('should show retry button in error state', () => {
      const error = new Error('Connection failed');
      const onRetry = jest.fn();
      
      render(
        <ConnectionStatus 
          isConnecting={false}
          isConnected={false}
          error={error}
          session={null}
          onRetry={onRetry}
        />
      );

      const retryButton = screen.getByText('Retry');
      expect(retryButton).toBeInTheDocument();
      
      fireEvent.click(retryButton);
      expect(onRetry).toHaveBeenCalled();
    });

    it('should show details when showDetails is true', () => {
      render(
        <ConnectionStatus 
          isConnecting={false}
          isConnected={true}
          error={null}
          session={mockSession}
          showDetails={true}
        />
      );

      expect(screen.getByText(/Session: session-\.\.\./)).toBeInTheDocument();
      expect(screen.getByText(/avatar-8/)).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <ConnectionStatus 
          isConnecting={false}
          isConnected={false}
          error={null}
          session={null}
          className="custom-class"
        />
      );

      const statusElement = container.querySelector('.beyondpresence-connection-status');
      expect(statusElement).toHaveClass('custom-class');
    });
  });

  describe('ConnectionStatusCompact', () => {
    it('should render compact disconnected state', () => {
      render(
        <ConnectionStatusCompact 
          isConnecting={false}
          isConnected={false}
          error={null}
        />
      );

      expect(screen.getByText('⚪')).toBeInTheDocument();
    });

    it('should render compact connecting state', () => {
      render(
        <ConnectionStatusCompact 
          isConnecting={true}
          isConnected={false}
          error={null}
        />
      );

      expect(screen.getByText('🔄')).toBeInTheDocument();
    });

    it('should render compact connected state', () => {
      render(
        <ConnectionStatusCompact 
          isConnecting={false}
          isConnected={true}
          error={null}
        />
      );

      expect(screen.getByText('✅')).toBeInTheDocument();
    });

    it('should render compact error state', () => {
      const error = new Error('Connection failed');
      
      render(
        <ConnectionStatusCompact 
          isConnecting={false}
          isConnected={false}
          error={error}
        />
      );

      expect(screen.getByText('❌')).toBeInTheDocument();
    });

    it('should show tooltip on hover', () => {
      const error = new Error('Connection failed');
      
      render(
        <ConnectionStatusCompact 
          isConnecting={false}
          isConnected={false}
          error={error}
        />
      );

      const statusElement = screen.getByText('❌');
      expect(statusElement.closest('span')).toHaveAttribute('title', 'Error: Connection failed');
    });
  });

  describe('ConnectionStatusDetailed', () => {
    it('should show detailed disconnected state', () => {
      render(
        <ConnectionStatusDetailed 
          isConnecting={false}
          isConnected={false}
          error={null}
          session={null}
        />
      );

      expect(screen.getByText('Not Connected')).toBeInTheDocument();
      expect(screen.getByText('Click connect to start streaming')).toBeInTheDocument();
    });

    it('should show detailed connecting state', () => {
      render(
        <ConnectionStatusDetailed 
          isConnecting={true}
          isConnected={false}
          error={null}
          session={null}
        />
      );

      expect(screen.getByText('Connecting to BeyondPresence')).toBeInTheDocument();
      expect(screen.getByText('Please wait while we establish the connection...')).toBeInTheDocument();
    });

    it('should show detailed connected state with session info', () => {
      render(
        <ConnectionStatusDetailed 
          isConnecting={false}
          isConnected={true}
          error={null}
          session={mockSession}
        />
      );

      expect(screen.getByText('Connected to BeyondPresence')).toBeInTheDocument();
      expect(screen.getByText(`Session ID: ${mockSession.id}`)).toBeInTheDocument();
      expect(screen.getByText(`Avatar ID: ${mockSession.avatarId}`)).toBeInTheDocument();
      expect(screen.getByText('Status: active')).toBeInTheDocument();
    });

    it('should show detailed error state with retry button', () => {
      const error = new Error('Connection failed');
      const onRetry = jest.fn();
      
      render(
        <ConnectionStatusDetailed 
          isConnecting={false}
          isConnected={false}
          error={error}
          session={null}
          onRetry={onRetry}
        />
      );

      expect(screen.getByText('Connection Error')).toBeInTheDocument();
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
      
      const retryButton = screen.getByText('Retry Connection');
      expect(retryButton).toBeInTheDocument();
      
      fireEvent.click(retryButton);
      expect(onRetry).toHaveBeenCalled();
    });

    it('should show disconnect button when connected', () => {
      const onDisconnect = jest.fn();
      
      render(
        <ConnectionStatusDetailed 
          isConnecting={false}
          isConnected={true}
          error={null}
          session={mockSession}
          onDisconnect={onDisconnect}
        />
      );

      const disconnectButton = screen.getByText('Disconnect');
      expect(disconnectButton).toBeInTheDocument();
      
      fireEvent.click(disconnectButton);
      expect(onDisconnect).toHaveBeenCalled();
    });

    it('should format creation date correctly', () => {
      render(
        <ConnectionStatusDetailed 
          isConnecting={false}
          isConnected={true}
          error={null}
          session={mockSession}
        />
      );

      // Check that the date is formatted (exact format may vary by locale)
      expect(screen.getByText(/Created:/)).toBeInTheDocument();
    });
  });

  describe('Error handling', () => {
    it('should handle null error gracefully', () => {
      expect(() => {
        render(
          <ConnectionStatus 
            isConnecting={false}
            isConnected={false}
            error={null}
            session={null}
          />
        );
      }).not.toThrow();
    });

    it('should handle null session gracefully', () => {
      expect(() => {
        render(
          <ConnectionStatus 
            isConnecting={false}
            isConnected={true}
            error={null}
            session={null}
          />
        );
      }).not.toThrow();
    });
  });
});