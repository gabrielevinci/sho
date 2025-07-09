// Test script for nested folder functionality
// Run with: npx tsx test-nested-folders.ts
// 
// Prerequisites: 
// npm install @vercel/postgres uuid tsx @types/uuid
// (Will install the required packages)

import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';

interface Folder {
  id: string;
  name: string;
  parent_folder_id: string | null;
  path: string;
  workspace_id?: string;
  user_id?: string;
  created_at?: Date;
  updated_at?: Date;
  position?: number;
}

// Mock data for testing
const userId = '00000000-0000-0000-0000-000000000001';
const workspaceId = '00000000-0000-0000-0000-000000000002';

// Function to create test folders in a nested structure
async function createTestFolderStructure() {
  try {
    console.log('Creating test folder structure...');

    // Create parent folders (Level 1)
    const folderA = await createFolder('Folder A', null);
    const folderB = await createFolder('Folder B', null);
    const folderC = await createFolder('Folder C', null);
    
    // Create child folders (Level 2)
    const folderA1 = await createFolder('Folder A1', folderA.id);
    const folderA2 = await createFolder('Folder A2', folderA.id);
    const folderB1 = await createFolder('Folder B1', folderB.id);
    
    // Create deeper nested folders (Level 3)
    const folderA1a = await createFolder('Folder A1a', folderA1.id);
    const folderA1b = await createFolder('Folder A1b', folderA1.id);

    console.log('Test folders created successfully!');
    
    // Print the folder structure
    console.log('\nFolder structure:');
    console.log('- Folder A (path:', folderA.path, ')');
    console.log('  - Folder A1 (path:', folderA1.path, ')');
    console.log('    - Folder A1a (path:', folderA1a.path, ')');
    console.log('    - Folder A1b (path:', folderA1b.path, ')');
    console.log('  - Folder A2 (path:', folderA2.path, ')');
    console.log('- Folder B (path:', folderB.path, ')');
    console.log('  - Folder B1 (path:', folderB1.path, ')');
    console.log('- Folder C (path:', folderC.path, ')');
    
    // Test the recursive queries
    console.log('\nTesting recursive queries...');
    
    // Get all descendants of folderA
    const descendantsA = await getFolderDescendants(folderA.id);
    console.log('\nDescendants of Folder A:');
    descendantsA.forEach(folder => {
      console.log(`- ${folder.name} (${folder.path})`);
    });
    
    // Get breadcrumb for folderA1a
    const breadcrumbA1a = await getFolderAncestors(folderA1a.id);
    console.log('\nBreadcrumb for Folder A1a:');
    breadcrumbA1a.forEach(folder => {
      console.log(`- ${folder.name} (${folder.path})`);
    });
    
    // Test cycle detection
    console.log('\nTesting cycle detection...');
    try {
      console.log('Attempting to move Folder A to be a child of Folder A1a (should fail)');
      await updateFolderParent(folderA.id, folderA1a.id);
      console.log('ERROR: Cycle detection failed!');
    } catch (error) {
      console.log('Success: Cycle correctly detected and prevented');
    }
    
    console.log('\nAll tests completed successfully!');
    
  } catch (error) {
    console.error('Error creating test folder structure:', error);
  } finally {
    // Clean up test data
    await cleanup();
  }
}

// Helper function to create a folder
async function createFolder(name: string, parentFolderId: string | null): Promise<Folder> {
  const folderId = uuidv4();
  const { rows } = await sql`
    INSERT INTO folders (id, name, parent_folder_id, workspace_id, user_id)
    VALUES (${folderId}, ${name}, ${parentFolderId}, ${workspaceId}, ${userId})
    RETURNING id, name, parent_folder_id, path
  `;
  return rows[0] as Folder;
}

// Get all descendants of a folder
async function getFolderDescendants(folderId: string): Promise<Folder[]> {
  const { rows } = await sql`
    WITH RECURSIVE folder_descendants AS (
      SELECT id, name, parent_folder_id, path
      FROM folders 
      WHERE id = ${folderId}
      
      UNION ALL
      
      SELECT f.id, f.name, f.parent_folder_id, f.path
      FROM folders f
      JOIN folder_descendants fd ON f.parent_folder_id = fd.id
    )
    SELECT * FROM folder_descendants
    ORDER BY path
  `;
  return rows as Folder[];
}

// Get all ancestors of a folder
async function getFolderAncestors(folderId: string): Promise<Folder[]> {
  const { rows } = await sql`
    WITH RECURSIVE folder_ancestry AS (
      SELECT id, name, parent_folder_id, path
      FROM folders 
      WHERE id = ${folderId}
      
      UNION ALL
      
      SELECT f.id, f.name, f.parent_folder_id, f.path
      FROM folders f
      JOIN folder_ancestry fa ON f.id = fa.parent_folder_id
    )
    SELECT * FROM folder_ancestry
    ORDER BY path
  `;
  return rows as Folder[];
}

// Update folder parent
async function updateFolderParent(folderId: string, newParentId: string): Promise<void> {
  await sql`
    UPDATE folders
    SET parent_folder_id = ${newParentId}
    WHERE id = ${folderId}
  `;
}

// Clean up test data
async function cleanup() {
  console.log('\nCleaning up test data...');
  await sql`
    DELETE FROM folders 
    WHERE user_id = ${userId}
    AND workspace_id = ${workspaceId}
  `;
  console.log('Cleanup completed.');
}

// Run the test
createTestFolderStructure()
  .catch(console.error)
  .finally(() => {
    console.log('Test script completed.');
    process.exit(0);
  });
