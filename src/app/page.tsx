'use client';

import React, { useEffect, useState } from 'react';
import { BeyondPresenceStream } from '../lib/beyondpresence';
import { ChatInterface } from '../components/ChatInterface';
import { KontextModal } from '../components/KontextModal';
import { useKontext } from '../providers/KontextProvider';
import type { UseBeyondPresenceConfig } from '../lib/beyondpresence';

export default function Home() {
  const { isConnected, persona } = useKontext();
  const [showKontextModal, setShowKontextModal] = useState(false);

  // Auto-popup Kontext modal after page loads if not connected
  useEffect(() => {
    const timer = setTimeout(() => {
      if (persona && !isConnected) {
        setShowKontextModal(true);
      }
    }, 2000); // Show after 2 seconds

    return () => clearTimeout(timer);
  }, [persona, isConnected]);

  // Directly use environment variables
  // Note: livekitToken can be empty - it will be auto-generated server-side if LIVEKIT_API_SECRET is set
  const config: UseBeyondPresenceConfig = {
    beyondPresence: {
      apiKey: process.env.NEXT_PUBLIC_BEY_API_KEY || ''
    },
    session: {
      avatarId: process.env.NEXT_PUBLIC_DEMO_AVATAR_ID || '',
      livekitToken: process.env.NEXT_PUBLIC_DEMO_LIVEKIT_TOKEN || '', // Can be empty for auto-generation
      livekitUrl: process.env.NEXT_PUBLIC_DEMO_LIVEKIT_URL || ''
    },
    autoConnect: true, // Auto-connect immediately
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

  // Check if environment variables are configured
  // Note: LIVEKIT_TOKEN is optional if LIVEKIT_API_SECRET is set server-side
  const isConfigured = !!(
    process.env.NEXT_PUBLIC_BEY_API_KEY &&
    process.env.NEXT_PUBLIC_DEMO_AVATAR_ID &&
    process.env.NEXT_PUBLIC_DEMO_LIVEKIT_URL
  );

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-md p-6">
            <h2 className="text-2xl font-bold text-red-900 mb-4">
              Configuration Missing
            </h2>
            <div className="text-red-700 space-y-2">
              <p>Please set the following environment variables in your .env.local file:</p>
              <ul className="list-disc list-inside mt-4 space-y-1">
                <li>NEXT_PUBLIC_BEY_API_KEY - Your BeyondPresence API key</li>
                <li>NEXT_PUBLIC_DEMO_AVATAR_ID - Your avatar ID</li>
                <li>NEXT_PUBLIC_DEMO_LIVEKIT_URL - Your LiveKit server URL</li>
                <li>LIVEKIT_API_SECRET - Your LiveKit API secret (for auto-generating tokens)</li>
                <li>KONTEXT_API_KEY - Your Kontext API key (optional, for personalization)</li>
              </ul>
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> The app will automatically generate LiveKit JWT tokens using your API key and secret.
                </p>
              </div>
            </div>
          </div>
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
            Personalized AI Assistant
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Voice and text AI interactions powered by BeyondPresence, LiveKit, and Kontext personalization
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Video Stream */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Voice Assistant</h2>
              <p className="text-sm text-gray-600 mt-1">
                Speak to interact with the AI assistant (powered by Kontext personalization)
              </p>
            </div>
            <BeyondPresenceStream
              config={config}
              className="min-h-[500px]"
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

          {/* Text Chat Interface */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Text Chat</h2>
              <p className="text-sm text-gray-600 mt-1">
                Type to chat with the same AI assistant (also uses Kontext personalization)
              </p>
            </div>
            <ChatInterface 
              userId="demo-user"
              className="h-[500px]"
            />
          </div>
        </div>

        {/* Feature Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
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
              High-quality avatar video streaming with personalized AI responses powered by Kontext context understanding.
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
              Speech-to-text processing with Kontext personalization layer before LLM generation for contextual responses.
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
              Dual-mode interaction: voice chat through LiveKit agent and text chat through web API, both using Kontext personalization.
            </p>
          </div>
        </div>
        
        {/* Auto-popup Kontext Modal */}
        <KontextModal 
          isOpen={showKontextModal} 
          onClose={() => setShowKontextModal(false)} 
        />
      </div>
    </div>
  );
}