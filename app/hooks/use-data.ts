'use client';

import { useCachedLinks, useCachedFolders, useCachedWorkspaces, useCachedAnalytics } from './use-cached-data';

// Tipi per le risposte delle API
interface LinksResponse {
  links: Array<{
    id: string;
    short_code: string;
    original_url: string;
    created_at: Date;
    title: string | null;
    description: string | null;
    folder_id: string | null;
    click_count: number;
    unique_click_count: number;
  }>;
}

interface FoldersResponse {
  folders: Array<{
    id: string;
    name: string;
    parent_folder_id: string | null;
    workspace_id: string;
    user_id: string;
    created_at: Date;
    updated_at: Date;
    position: number;
  }>;
}

interface WorkspacesResponse {
  workspaces: Array<{
    id: string;
    name: string;
  }>;
}

/**
 * Hook per ottenere i link di un workspace con cache intelligente
 */
export function useLinks(workspaceId: string | null) {
  const result = useCachedLinks(workspaceId);
  
  return {
    links: (result.data as LinksResponse)?.links || [],
    isLoading: result.isLoading,
    error: result.error,
    mutate: result.mutate,
    revalidate: result.revalidate
  };
}

/**
 * Hook per ottenere le cartelle di un workspace con cache intelligente
 */
export function useFolders(workspaceId: string | null) {
  const result = useCachedFolders(workspaceId);
  
  return {
    folders: (result.data as FoldersResponse)?.folders || [],
    isLoading: result.isLoading,
    error: result.error,
    mutate: result.mutate,
    revalidate: result.revalidate
  };
}

/**
 * Hook per ottenere i workspace dell'utente con cache intelligente
 */
export function useWorkspaces() {
  const result = useCachedWorkspaces();
  
  return {
    workspaces: (result.data as WorkspacesResponse)?.workspaces || [],
    isLoading: result.isLoading,
    error: result.error,
    mutate: result.mutate,
    revalidate: result.revalidate
  };
}

/**
 * Hook per ottenere le analytics di un link con cache intelligente
 */
export function useAnalytics(shortCode: string | null) {
  const result = useCachedAnalytics(shortCode);
  
  return {
    analytics: result.data,
    isLoading: result.isLoading,
    error: result.error,
    mutate: result.mutate,
    revalidate: result.revalidate
  };
}

/**
 * Hook combinato per ottenere tutti i dati necessari alla dashboard
 */
export function useDashboardData(workspaceId: string | null) {
  const linksResult = useCachedLinks(workspaceId);
  const foldersResult = useCachedFolders(workspaceId);
  
  return {
    links: (linksResult.data as LinksResponse)?.links || [],
    folders: (foldersResult.data as FoldersResponse)?.folders || [],
    isLoading: linksResult.isLoading || foldersResult.isLoading,
    error: linksResult.error || foldersResult.error,
    mutateLinks: linksResult.mutate,
    mutateFolders: foldersResult.mutate,
    revalidateLinks: linksResult.revalidate,
    revalidateFolders: foldersResult.revalidate
  };
}