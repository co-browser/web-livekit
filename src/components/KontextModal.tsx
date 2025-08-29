'use client';

import React, { useState } from 'react';
import { useKontext } from '../providers/KontextProvider';

interface KontextModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KontextModal({ isOpen, onClose }: KontextModalProps) {
  const { connect } = useKontext();
  const [userId, setUserId] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) return;

    setIsConnecting(true);
    setError('');

    try {
      await connect(userId.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Connect to Kontext
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Get personalized AI responses based on your data
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <form onSubmit={handleConnect} className="space-y-4">
            <div>
              <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-2">
                User ID
              </label>
              <input
                type="text"
                id="userId"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter your user ID (e.g., demo-user)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isConnecting}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                This identifies you in the Kontext system for personalized responses
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-700">
                <strong>What is Kontext?</strong><br />
                Kontext personalizes AI responses using your connected data sources like Gmail, calendar, and preferences.
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          <button
            type="button"
            onClick={handleSkip}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            disabled={isConnecting}
          >
            Skip for now
          </button>
          
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              disabled={isConnecting}
            >
              Cancel
            </button>
            
            <button
              onClick={handleConnect}
              disabled={isConnecting || !userId.trim()}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 transition-colors flex items-center"
            >
              {isConnecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Connecting...
                </>
              ) : (
                'Connect'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}