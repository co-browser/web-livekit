'use client';

import { Persona } from '@kontext.dev/kontext-sdk';
import React, { createContext, useContext, useState, useEffect } from 'react';

interface KontextContextType {
  persona: Persona | null;
  isConnected: boolean;
  userId: string | null;
  connect: (userId: string) => Promise<void>;
  disconnect: () => Promise<void>;
  getContext: (options?: { task?: string; maxTokens?: number; privacyLevel?: 'strict' | 'moderate' | 'none' }) => Promise<{ systemPrompt: string; metadata: any }>;
}

const KontextContext = createContext<KontextContextType | null>(null);

export function KontextProvider({ children }: { children: React.ReactNode }) {
  const [persona, setPersona] = useState<Persona | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Initialize Persona instance if API key is available
    if (process.env.NEXT_PUBLIC_KONTEXT_API_KEY) {
      const personaInstance = new Persona({
        apiKey: process.env.NEXT_PUBLIC_KONTEXT_API_KEY,
        apiUrl: process.env.NEXT_PUBLIC_KONTEXT_API_URL || 'https://api.kontext.dev',
      });
      setPersona(personaInstance);
    }
  }, []);

  const connect = async (newUserId: string) => {
    if (!persona || !newUserId) return;
    
    try {
      // Test connection by getting context
      await persona.getContext({
        userId: newUserId,
        task: 'connection_test',
        maxTokens: 100
      });
      
      setUserId(newUserId);
      setIsConnected(true);
      
      // Store in localStorage for persistence
      localStorage.setItem('kontext_user_id', newUserId);
      localStorage.setItem('kontext_connected', 'true');
      
      console.log('Connected to Kontext for user:', newUserId);
    } catch (error) {
      console.error('Failed to connect to Kontext:', error);
      throw error;
    }
  };

  const disconnect = async () => {
    if (!persona || !userId) return;
    
    try {
      // Call disconnect API if available
      await persona.disconnect(userId);
      
      setUserId(null);
      setIsConnected(false);
      
      // Clear localStorage
      localStorage.removeItem('kontext_user_id');
      localStorage.removeItem('kontext_connected');
      
      console.log('Disconnected from Kontext');
    } catch (error) {
      console.error('Failed to disconnect from Kontext:', error);
      throw error;
    }
  };

  const getContext = async (options?: { 
    task?: string; 
    maxTokens?: number; 
    privacyLevel?: 'strict' | 'moderate' | 'none' 
  }) => {
    if (!persona || !userId || !isConnected) {
      throw new Error('Not connected to Kontext');
    }

    return persona.getContext({
      userId,
      task: options?.task || 'chat',
      maxTokens: options?.maxTokens || 500,
      privacyLevel: options?.privacyLevel || 'none'
    });
  };

  // Check for existing connection on mount
  useEffect(() => {
    const savedUserId = localStorage.getItem('kontext_user_id');
    const savedConnected = localStorage.getItem('kontext_connected');
    
    if (savedUserId && savedConnected === 'true' && persona) {
      // Try to restore connection
      connect(savedUserId).catch(() => {
        // Clear invalid saved state
        localStorage.removeItem('kontext_user_id');
        localStorage.removeItem('kontext_connected');
      });
    }
  }, [persona, connect]);

  const contextValue: KontextContextType = {
    persona,
    isConnected,
    userId,
    connect,
    disconnect,
    getContext
  };

  return (
    <KontextContext.Provider value={contextValue}>
      {children}
    </KontextContext.Provider>
  );
}

export const useKontext = () => {
  const context = useContext(KontextContext);
  if (!context) {
    throw new Error('useKontext must be used within a KontextProvider');
  }
  return context;
};