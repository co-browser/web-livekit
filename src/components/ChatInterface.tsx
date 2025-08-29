'use client';

import React, { useState } from 'react';
import { KontextButton } from './KontextButton';
import { useKontext } from '../providers/KontextProvider';

interface ChatInterfaceProps {
  userId?: string;
  className?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function ChatInterface({ userId = 'demo-user', className }: ChatInterfaceProps) {
  const [privacyLevel, setPrivacyLevel] = useState<'strict' | 'moderate' | 'none'>('none');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { isConnected, userId: contextUserId } = useKontext();
  
  // Use the connected user ID if available, otherwise use prop
  const effectiveUserId = isConnected ? contextUserId : userId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: input.trim(),
          userId: effectiveUserId,
          privacyLevel,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: ''
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            if (line.startsWith('0:')) {
              try {
                const content = JSON.parse(line.slice(2));
                assistantContent += content;
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessage.id 
                    ? { ...msg, content: assistantContent }
                    : msg
                ));
              } catch (_e) {
                console.warn('Failed to parse chunk:', line);
              }
            }
          }
        }
      }

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your message.'
      };
      setMessages(prev => [...prev, errorMessage]);
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
            Chat with Kontext AI
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
        <div className="text-sm text-gray-500 mt-1">
          User ID: {effectiveUserId} {isConnected && <span className="text-green-600">(Kontext Connected)</span>}
        </div>
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
      <div className="flex-shrink-0 border-t border-gray-200 px-4 py-3 bg-white space-y-3">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
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
          <KontextButton size="sm" />
        </div>
      </div>
    </div>
  );
}