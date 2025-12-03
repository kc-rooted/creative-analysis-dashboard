'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const LOCAL_STORAGE_KEY = 'selectedClientId';

interface ClientContextType {
  currentClient: string | null;
  setCurrentClient: (client: string) => void;
  isLoading: boolean;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export function ClientProvider({ children }: { children: ReactNode }) {
  const [currentClient, setCurrentClientState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch current client on mount - prioritize localStorage, then server default
  useEffect(() => {
    const initializeClient = async () => {
      try {
        // First, check localStorage for this browser's selected client
        const storedClient = localStorage.getItem(LOCAL_STORAGE_KEY);

        if (storedClient) {
          // Use the browser's stored preference
          console.log(`[ClientProvider] Using stored client from localStorage: ${storedClient}`);
          setCurrentClientState(storedClient);
          setIsLoading(false);
          return;
        }

        // No localStorage preference - fetch server default (for first-time users)
        const response = await fetch('/api/admin/current-client');
        if (response.ok) {
          const data = await response.json();
          setCurrentClientState(data.clientId);
          // Store it in localStorage for future visits
          if (data.clientId) {
            localStorage.setItem(LOCAL_STORAGE_KEY, data.clientId);
          }
        } else {
          // No client selected anywhere - leave as null
          setCurrentClientState(null);
        }
      } catch (error) {
        console.error('Error initializing client:', error);
        // On error, leave as null (no fallback)
        setCurrentClientState(null);
      } finally {
        setIsLoading(false);
      }
    };
    initializeClient();
  }, []);

  // Update current client - store in localStorage only (per-browser isolation)
  const setCurrentClient = (clientId: string) => {
    // Store in localStorage for this browser only
    localStorage.setItem(LOCAL_STORAGE_KEY, clientId);
    setCurrentClientState(clientId);
    console.log(`[ClientProvider] Client switched to: ${clientId} (stored in localStorage)`);
  };

  return (
    <ClientContext.Provider value={{ currentClient, setCurrentClient, isLoading }}>
      {children}
    </ClientContext.Provider>
  );
}

export function useClient() {
  const context = useContext(ClientContext);
  if (context === undefined) {
    throw new Error('useClient must be used within a ClientProvider');
  }
  return context;
}
