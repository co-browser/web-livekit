'use client';

import React, { useState, useEffect } from 'react';
import { BeyondPresenceStream } from '../lib/beyondpresence';
import type { UseBeyondPresenceConfig } from '../lib/beyondpresence';

export default function Home() {
  const [apiKey, setApiKey] = useState('');
  const [avatarId, setAvatarId] = useState('');
  const [livekitUrl, setLivekitUrl] = useState('');
  const [livekitToken, setLivekitToken] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Set initial values from environment after hydration
  useEffect(() => {
    setApiKey(process.env.BEY_API_KEY || '');
    setAvatarId(process.env.NEXT_PUBLIC_DEMO_AVATAR_ID || '');
    setLivekitUrl(process.env.NEXT_PUBLIC_DEMO_LIVEKIT_URL || '');
    setLivekitToken(process.env.NEXT_PUBLIC_DEMO_LIVEKIT_TOKEN || '');
    setIsHydrated(true);
  }, []);

  // Check if we have the minimum required configuration
  const hasMinimumConfig = apiKey && avatarId && livekitUrl && livekitToken;

  const config: UseBeyondPresenceConfig = {
    beyondPresence: {
      apiKey: apiKey,
      baseUrl: process.env.BEY_BASE_URL
    },
    session: {
      avatarId: avatarId,
      livekitToken: livekitToken,
      livekitUrl: livekitUrl
    },
    autoConnect: false, // Let user manually connect
    onError: (error) => {
      console.error('BeyondPresence Error:', error);
    },
    onConnected: () => {
      console.log('Connected to BeyondPresence!');
    },
    onDisconnected: () => {
      console.log('Disconnected from BeyondPresence');
    }
  };

  const handleConfigure = () => {
    if (hasMinimumConfig) {
      setIsConfigured(true);
    }
  };

  const handleReset = () => {
    setIsConfigured(false);
  };

  // Show loading state until hydrated to prevent hydration mismatch
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            BeyondPresence Video Streaming Demo
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Experience real-time avatar video streaming powered by BeyondPresence and LiveKit. 
            Configure your credentials below to get started.
          </p>
        </div>

        {!isConfigured ? (
          /* Configuration Form */
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Configuration</h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
                    BeyondPresence API Key
                  </label>
                  <input
                    type="password"
                    id="apiKey"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your BeyondPresence API key"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="avatarId" className="block text-sm font-medium text-gray-700 mb-1">
                    Avatar ID
                  </label>
                  <input
                    type="text"
                    id="avatarId"
                    value={avatarId}
                    onChange={(e) => setAvatarId(e.target.value)}
                    placeholder="Enter your avatar ID"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="livekitUrl" className="block text-sm font-medium text-gray-700 mb-1">
                    LiveKit URL
                  </label>
                  <input
                    type="text"
                    id="livekitUrl"
                    value={livekitUrl}
                    onChange={(e) => setLivekitUrl(e.target.value)}
                    placeholder="wss://your-domain.livekit.cloud"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="livekitToken" className="block text-sm font-medium text-gray-700 mb-1">
                    LiveKit Token
                  </label>
                  <input
                    type="password"
                    id="livekitToken"
                    value={livekitToken}
                    onChange={(e) => setLivekitToken(e.target.value)}
                    placeholder="Enter your LiveKit token"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={handleConfigure}
                  disabled={!hasMinimumConfig}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Start Demo
                </button>
              </div>

              {!hasMinimumConfig && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">
                        Configuration Required
                      </h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>Please fill in all required fields to start the demo. You can also set these values in your .env.local file.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-md p-4">
              <h3 className="text-lg font-medium text-blue-900 mb-2">Getting Started</h3>
              <div className="text-sm text-blue-800 space-y-2">
                <p>1. Sign up for a BeyondPresence account and get your API key</p>
                <p>2. Create an avatar and note the Avatar ID</p>
                <p>3. Set up a LiveKit server and generate a token</p>
                <p>4. Enter your credentials above to start streaming</p>
              </div>
            </div>
          </div>
        ) : (
          /* Demo Interface */
          <div className="space-y-6">
            {/* Controls */}
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-900">Live Avatar Stream</h2>
              <button
                onClick={handleReset}
                className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Reconfigure
              </button>
            </div>

            {/* Main Stream Component */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <BeyondPresenceStream
                config={config}
                className="min-h-[600px]"
                showConnectionStatus={true}
                showErrorDisplay={true}
                onVideoTrackAttached={(_element, track) => {
                  console.log('Video track attached:', track.sid);
                }}
                onAudioTrackAttached={(_element, track) => {
                  console.log('Audio track attached:', track.sid);
                }}
              />
            </div>

            {/* Feature Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="ml-3 text-lg font-medium text-gray-900">Real-time Video</h3>
                </div>
                <p className="text-gray-600">
                  High-quality avatar video streaming with adaptive bitrate and automatic quality adjustment.
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <h3 className="ml-3 text-lg font-medium text-gray-900">Crystal Clear Audio</h3>
                </div>
                <p className="text-gray-600">
                  Synchronized audio streaming with browser compatibility handling and user interaction prompts.
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="ml-3 text-lg font-medium text-gray-900">Robust Connection</h3>
                </div>
                <p className="text-gray-600">
                  Automatic reconnection, error handling, and connection quality monitoring for reliable streaming.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}