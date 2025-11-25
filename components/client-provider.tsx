'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ClientContextType {
  currentClient: string | null;
  setCurrentClient: (client: string) => void;
  isLoading: boolean;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export function ClientProvider({ children }: { children: ReactNode }) {
  const [currentClient, setCurrentClientState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch current client on mount
  useEffect(() => {
    const fetchCurrentClient = async () => {
      try {
        const response = await fetch('/api/admin/current-client');
        if (response.ok) {
          const data = await response.json();
          setCurrentClientState(data.clientId);
        } else {
          // No client selected - leave as null
          setCurrentClientState(null);
        }
      } catch (error) {
        console.error('Error fetching current client:', error);
        // On error, leave as null (no fallback)
        setCurrentClientState(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCurrentClient();
  }, []);

  // Update current client and notify server
  const setCurrentClient = async (clientId: string) => {
    try {
      const response = await fetch('/api/admin/current-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      });

      if (response.ok) {
        setCurrentClientState(clientId);
        console.log(`[ClientProvider] Client switched to: ${clientId}`);
      } else {
        console.error('[ClientProvider] Failed to update client on server');
      }
    } catch (error) {
      console.error('[ClientProvider] Error updating client:', error);
    }
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
