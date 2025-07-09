import { sql } from '@vercel/postgres';

export interface Folder {
  id: string;
  name: string;
  parent_folder_id: string | null;
  workspace_id: string;
  user_id: string;
  created_at: Date;
  updated_at: Date;
  position: number;
  path?: string;
}

/**
 * Helper to get all ancestors of a folder (for breadcrumb)
 * Returns an array of folders from root to the specified folder
 */
export async function getFolderAncestors(folderId: string, userId: string): Promise<Folder[]> {
  try {
    const { rows } = await sql<Folder>`
      WITH RECURSIVE folder_ancestry AS (
        -- Start with the current folder
        SELECT id, name, parent_folder_id, workspace_id, user_id, created_at, updated_at, position, path
        FROM folders 
        WHERE id = ${folderId} AND user_id = ${userId}
        
        UNION ALL
        
        -- Join with parent folders
        SELECT f.id, f.name, f.parent_folder_id, f.workspace_id, f.user_id, f.created_at, f.updated_at, f.position, f.path
        FROM folders f
        JOIN folder_ancestry fa ON f.id = fa.parent_folder_id
      )
      SELECT * FROM folder_ancestry
      ORDER BY path
    `;
    
    // Reverse the array to get root→leaf order
    return rows.reverse();
  } catch (error) {
    console.error('Error getting folder ancestors:', error);
    throw error;
  }
}

/**
 * Helper to get all descendants of a folder
 * Returns an array of all subfolders nested under the specified folder
 */
export async function getFolderDescendants(folderId: string, userId: string): Promise<Folder[]> {
  try {
    const { rows } = await sql<Folder>`
      WITH RECURSIVE folder_descendants AS (
        -- Start with the current folder
        SELECT id, name, parent_folder_id, workspace_id, user_id, created_at, updated_at, position, path
        FROM folders 
        WHERE id = ${folderId} AND user_id = ${userId}
        
        UNION ALL
        
        -- Join with child folders
        SELECT f.id, f.name, f.parent_folder_id, f.workspace_id, f.user_id, f.created_at, f.updated_at, f.position, f.path
        FROM folders f
        JOIN folder_descendants fd ON f.parent_folder_id = fd.id
      )
      SELECT * FROM folder_descendants
      ORDER BY path
    `;
    
    return rows;
  } catch (error) {
    console.error('Error getting folder descendants:', error);
    throw error;
  }
}

/**
 * Check if moving a folder to a new parent would create a cycle
 * Returns true if the move would create a cycle, false otherwise
 */
export async function wouldCreateFolderCycle(
  folderId: string, 
  newParentId: string
): Promise<boolean> {
  try {
    // If the folder and new parent are the same, it would create a cycle
    if (folderId === newParentId) {
      return true;
    }
    
    // Check if the new parent is a descendant of the folder
    const { rows } = await sql`
      WITH RECURSIVE folder_descendants AS (
        -- Start with the folder being moved
        SELECT id FROM folders WHERE id = ${folderId}
        
        UNION ALL
        
        -- Join with child folders
        SELECT f.id
        FROM folders f
        JOIN folder_descendants fd ON f.parent_folder_id = fd.id
      )
      SELECT EXISTS (
        SELECT 1 FROM folder_descendants WHERE id = ${newParentId}
      ) as would_create_cycle
    `;
    
    return rows[0].would_create_cycle;
  } catch (error) {
    console.error('Error checking for folder cycle:', error);
    throw error;
  }
}

/**
 * Updates the paths for a folder and all its descendants
 */
export async function updateFolderPaths(folderId: string, userId: string): Promise<void> {
  try {
    // First set the path to NULL for the folder and all descendants
    // This will trigger the recursive path rebuilding through the database trigger
    await sql`
      WITH RECURSIVE folder_tree AS (
        SELECT id FROM folders WHERE id = ${folderId} AND user_id = ${userId}
        UNION ALL
        SELECT f.id FROM folders f
        JOIN folder_tree ft ON f.parent_folder_id = ft.id
      )
      UPDATE folders SET path = NULL
      WHERE id IN (SELECT id FROM folder_tree)
    `;
    
    // Now trigger the path updates by touching the affected folders
    await sql`
      WITH RECURSIVE folder_tree AS (
        SELECT id FROM folders WHERE id = ${folderId} AND user_id = ${userId}
        UNION ALL
        SELECT f.id FROM folders f
        JOIN folder_tree ft ON f.parent_folder_id = ft.id
      )
      UPDATE folders SET updated_at = CURRENT_TIMESTAMP
      WHERE id IN (SELECT id FROM folder_tree)
    `;
  } catch (error) {
    console.error('Error updating folder paths:', error);
    throw error;
  }
}

/**
 * Get all links in a folder and all its subfolders
 */
export async function getLinksInFolderAndSubfolders(folderId: string, userId: string) {
  try {
    const { rows } = await sql`
      WITH RECURSIVE folder_tree AS (
        SELECT id FROM folders WHERE id = ${folderId} AND user_id = ${userId}
        UNION ALL
        SELECT f.id FROM folders f
        JOIN folder_tree ft ON f.parent_folder_id = ft.id
      )
      SELECT l.* FROM links l
      WHERE l.folder_id IN (SELECT id FROM folder_tree)
      ORDER BY l.created_at DESC
    `;
    
    return rows;
  } catch (error) {
    console.error('Error getting links in folder and subfolders:', error);
    throw error;
  }
}

/**
 * Converts a flat list of folders to a nested tree structure
 */
export function buildFolderTree(folders: Folder[]) {
  interface FolderTreeNode extends Folder {
    children: FolderTreeNode[];
  }
  
  const folderMap = new Map<string, FolderTreeNode>();
  
  // Create nodes for all folders
  folders.forEach(folder => {
    folderMap.set(folder.id, {
      ...folder,
      children: []
    });
  });
  
  const rootNodes: FolderTreeNode[] = [];
  
  // Build the tree
  folders.forEach(folder => {
    const node = folderMap.get(folder.id)!;
    
    if (folder.parent_folder_id) {
      const parent = folderMap.get(folder.parent_folder_id);
      if (parent) {
        parent.children.push(node);
      } else {
        // Parent not found, treat as root
        rootNodes.push(node);
      }
    } else {
      rootNodes.push(node);
    }
  });
  
  return rootNodes;
}
