'use client';

import { useState, useEffect } from 'react';

interface SessionData {
  workspaceId?: string;
  userId?: string;
}

/**
 * Hook client-side per accedere ai dati di sessione
 * Questo è un workaround temporaneo fino a quando non implementiamo un Context più completo
 */
export function useSessionData(): SessionData {
  const [sessionData, setSessionData] = useState<SessionData>({});

  useEffect(() => {
    // Per ora, proviamo a ricavare i dati dall'URL o dai cookies client-side
    // In futuro, questi dati dovranno venire da un Context globale o Server Component
    
    const urlParams = new URLSearchParams(window.location.search);
    const workspaceFromUrl = urlParams.get('workspace');
    
    // Prova a leggere dai cookie (se disponibili)
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    setSessionData({
      workspaceId: workspaceFromUrl || localStorage.getItem('currentWorkspaceId') || undefined,
      userId: localStorage.getItem('currentUserId') || undefined,
    });
  }, []);

  return sessionData;
}
