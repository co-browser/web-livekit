'use client';

import React, { useState } from 'react';
import { useKontext } from '@kontext.dev/kontext-sdk/react';
import { KontextConnectButton } from '@kontext.dev/kontext-sdk/components';

interface ChatInterfaceProps {
  className?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function ChatInterface({ className }: ChatInterfaceProps) {
  const [privacyLevel, setPrivacyLevel] = useState<'strict' | 'moderate' | 'none'>('none');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isConnected, userId, isLoading: kontextLoading, error: kontextError } = useKontext();
  
  // Use connected Kontext user ID, or fall back to demo user
  const effectiveUserId = userId || 'demo-user';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          userId: effectiveUserId,
          privacyLevel,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let assistantContent = '';
      const assistantMessage: Message = {
        id: Date.now().toString() + '_assistant',
        role: 'assistant',
        content: '',
      };

      setMessages(prev => [...prev, assistantMessage]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.choices?.[0]?.delta?.content) {
                assistantContent += parsed.choices[0].delta.content;
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === assistantMessage.id 
                      ? { ...msg, content: assistantContent }
                      : msg
                  )
                );
              }
            } catch (_e) {
              // Skip invalid JSON lines
            }
          }
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 px-4 py-3 bg-white">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            Chat with AI Assistant
          </h3>
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Privacy:</label>
            <select
              value={privacyLevel}
              onChange={(e) => setPrivacyLevel(e.target.value as 'strict' | 'moderate' | 'none')}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="none">None</option>
              <option value="moderate">Moderate</option>
              <option value="strict">Strict</option>
            </select>
          </div>
        </div>
        
        {/* Connection Status */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center space-x-2">
            {kontextLoading ? (
              <div className="flex items-center space-x-1">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                <span className="text-xs text-gray-500">Checking connection...</span>
              </div>
            ) : isConnected ? (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-green-700 font-medium">Kontext Connected</span>
                <span className="text-xs text-gray-500">({userId})</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span className="text-xs text-gray-600">Using default responses</span>
                <span className="text-xs text-gray-500">({effectiveUserId})</span>
              </div>
            )}
          </div>
          
          {kontextError && (
            <span className="text-xs text-red-600">⚠ {kontextError}</span>
          )}
        </div>

        {/* Personalization Status */}
        {isConnected && (
          <div className="mt-2 px-3 py-1 bg-green-50 border border-green-200 rounded-md">
            <p className="text-xs text-green-800">
              ✨ Responses are personalized using your connected data
            </p>
          </div>
        )}
        
        {/* Error Display */}
        {error && (
          <div className="mt-2 px-3 py-1 bg-red-50 border border-red-200 rounded-md">
            <p className="text-xs text-red-800">
              ⚠ {error}
            </p>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p>Start a conversation! This chat uses Kontext for personalized responses.</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-900'
                }`}
              >
                <div className="text-sm font-medium mb-1">
                  {message.role === 'user' ? 'You' : 'AI Assistant'}
                </div>
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-gray-200">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                <span className="text-sm text-gray-600">Thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-gray-200 px-4 py-2 bg-white space-y-2">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Type your message..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Send
          </button>
        </form>
        
        {/* Kontext Connection Button */}
        <div className="flex justify-center">
          {isConnected ? (
            <div className="px-4 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg">
              ✓ Kontext Connected ({userId})
            </div>
          ) : (
            <KontextConnectButton 
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg transition-colors"
            >
              Connect Gmail for Personalization
            </KontextConnectButton>
          )}
        </div>
      </div>
    </div>
  );
}