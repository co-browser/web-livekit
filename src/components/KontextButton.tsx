'use client';

import React, { useState } from 'react';
import { useKontext } from '../providers/KontextProvider';
import { KontextModal } from './KontextModal';

interface KontextButtonProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function KontextButton({ className = '', size = 'md' }: KontextButtonProps) {
  const { isConnected, userId, disconnect } = useKontext();
  const [showModal, setShowModal] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleConnect = () => {
    setShowModal(true);
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await disconnect();
    } catch (error) {
      console.error('Failed to disconnect:', error);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  if (isConnected) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
          <span className="text-sm text-gray-700">
            Connected as <span className="font-medium">{userId}</span>
          </span>
        </div>
        <button
          onClick={handleDisconnect}
          disabled={isDisconnecting}
          className={`
            border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 
            disabled:opacity-50 transition-colors
            ${sizeClasses[size]}
          `}
        >
          {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleConnect}
        className={`
          bg-blue-600 text-white rounded-md hover:bg-blue-700 
          transition-colors flex items-center
          ${sizeClasses[size]} ${className}
        `}
      >
        <svg 
          className="w-4 h-4 mr-2" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M13 10V3L4 14h7v7l9-11h-7z" 
          />
        </svg>
        Connect Kontext
      </button>

      <KontextModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
      />
    </>
  );
}