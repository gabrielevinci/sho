import { getSession } from '@/app/lib/session';
import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.isLoggedIn || !session?.userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    
    const { folderId, targetFolderId, insertPosition } = await request.json();
    
    if (!folderId) {
      return NextResponse.json({ error: 'FolderId è obbligatorio' }, { status: 400 });
    }
    
    if (!targetFolderId) {
      return NextResponse.json({ error: 'TargetFolderId è obbligatorio' }, { status: 400 });
    }
    
    if (!insertPosition || !['before', 'after'].includes(insertPosition)) {
      return NextResponse.json({ error: 'InsertPosition deve essere "before" o "after"' }, { status: 400 });
    }
    
    // Verifica che entrambe le cartelle appartengano all'utente
    const foldersCheck = await sql`
      SELECT id, name, parent_folder_id, workspace_id, position 
      FROM folders 
      WHERE id IN (${folderId}, ${targetFolderId}) AND user_id = ${session.userId}
    `;
    
    if (foldersCheck.rowCount !== 2) {
      return NextResponse.json({ error: 'Una o più cartelle non trovate' }, { status: 404 });
    }
    
    const sourceFolder = foldersCheck.rows.find(f => f.id === folderId);
    const targetFolder = foldersCheck.rows.find(f => f.id === targetFolderId);
    
    if (!sourceFolder || !targetFolder) {
      return NextResponse.json({ error: 'Cartelle non trovate' }, { status: 404 });
    }
    
    // Verifica che le cartelle siano nello stesso workspace
    if (sourceFolder.workspace_id !== targetFolder.workspace_id) {
      return NextResponse.json({ error: 'Non puoi riordinare cartelle tra workspace diversi' }, { status: 400 });
    }
    
    // Removed the restriction for reordering folders at different levels
    // Now folders can be reordered between any levels within the same workspace
      // Calculate the new position for the source folder
    const newPosition = await calculateNewPosition(
      sourceFolder, 
      targetFolder, 
      insertPosition, 
      session.userId
    );
    
    // Determine if we need to trigger recompaction
    const isRootLevel = targetFolder.parent_folder_id === null;
    const shouldRecompact = !isRootLevel || (Math.random() > 0.8); // 20% chance for root-level, always for nested

    // Update the source folder's position and parent if needed
    await sql`BEGIN`;
    
    try {
      // Update source folder position and parent
      await sql`
        UPDATE folders 
        SET position = ${newPosition}, 
            parent_folder_id = ${targetFolder.parent_folder_id},
            updated_at = NOW()
        WHERE id = ${folderId} AND user_id = ${session.userId}
      `;
      
      // Conditional recompaction for better performance
      if (shouldRecompact) {
        await recompactPositions(sourceFolder.parent_folder_id, session.userId);
        if (sourceFolder.parent_folder_id !== targetFolder.parent_folder_id) {
          await recompactPositions(targetFolder.parent_folder_id, session.userId);
        }
      }
      
      await sql`COMMIT`;
      
      return NextResponse.json({ success: true });
    } catch (error) {
      await sql`ROLLBACK`;
      throw error;
    }
  } catch (error) {
    console.error('Errore durante il riordinamento:', error);
    return NextResponse.json({ 
      error: 'Errore durante il riordinamento delle cartelle' 
    }, { status: 500 });
  }
}

// Calculate the new position for the source folder with optimized algorithm
async function calculateNewPosition(
  sourceFolder: Record<string, unknown>, 
  targetFolder: Record<string, unknown>, 
  insertPosition: 'before' | 'after',
  userId: string
): Promise<number> {
  // Get all folders at the target level, sorted by position
  const siblings = await sql`
    SELECT id, position 
    FROM folders 
    WHERE parent_folder_id ${(targetFolder.parent_folder_id as string | null) ? `= ${targetFolder.parent_folder_id as string}` : 'IS NULL'}
    AND user_id = ${userId}
    AND id != ${sourceFolder.id as string}
    ORDER BY position ASC
  `;
  
  const siblingPositions = siblings.rows.map(s => ({ id: s.id, position: s.position }));
  const targetIndex = siblingPositions.findIndex(s => s.id === targetFolder.id);
  
  let newPosition: number;
  
  // Check if this is a root-level operation for optimization
  const isRootLevel = targetFolder.parent_folder_id === null;
  
  if (insertPosition === 'before') {
    if (targetIndex === 0) {
      // Insert at the beginning
      newPosition = Math.max(0, (targetFolder.position as number) - (isRootLevel ? 0.1 : 1));
    } else {
      // Insert between previous and target
      const prevPosition = siblingPositions[targetIndex - 1].position;
      const gap = (targetFolder.position as number) - prevPosition;
      newPosition = isRootLevel && gap > 0.2 
        ? prevPosition + (gap / 2)  // Use midpoint for root-level for better performance
        : (prevPosition + (targetFolder.position as number)) / 2;
    }
  } else { // 'after'
    if (targetIndex === siblingPositions.length - 1) {
      // Insert at the end
      newPosition = (targetFolder.position as number) + (isRootLevel ? 0.1 : 1);
    } else {
      // Insert between target and next
      const nextPosition = siblingPositions[targetIndex + 1].position;
      const gap = nextPosition - (targetFolder.position as number);
      newPosition = isRootLevel && gap > 0.2 
        ? (targetFolder.position as number) + (gap / 2)  // Use midpoint for root-level for better performance
        : ((targetFolder.position as number) + nextPosition) / 2;
    }
  }
  
  return Math.max(0, newPosition);
}

// Recompact positions to ensure they are sequential integers with optimized batch updates
async function recompactPositions(parentFolderId: string | null, userId: string): Promise<void> {
  const folders = await sql`
    SELECT id 
    FROM folders 
    WHERE parent_folder_id ${parentFolderId ? `= ${parentFolderId}` : 'IS NULL'}
    AND user_id = ${userId}
    ORDER BY position ASC
  `;
  
  // For small number of folders, use individual updates for minimal locking
  if (folders.rows.length < 10) {
    for (let i = 0; i < folders.rows.length; i++) {
      await sql`
        UPDATE folders 
        SET position = ${i}, updated_at = NOW()
        WHERE id = ${folders.rows[i].id} AND user_id = ${userId}
      `;
    }
    return;
  }
  
  // For larger collections, use a more efficient batch update approach
  const batchSize = 5;
  for (let i = 0; i < folders.rows.length; i += batchSize) {
    const batch = folders.rows.slice(i, i + batchSize);
    const values = batch.map((folder, index) => `('${folder.id}', ${i + index})`).join(',');
    
    await sql.query(`
      WITH updates(id, new_position) AS (VALUES ${values})
      UPDATE folders
      SET position = updates.new_position, updated_at = NOW()
      FROM updates
      WHERE folders.id = updates.id AND folders.user_id = '${userId}'
    `);
  }
}
