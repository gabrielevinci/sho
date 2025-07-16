import { getSession } from '@/app/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export interface LinkWithFolders {
  id: string;
  short_code: string;
  original_url: string;
  title: string | null;
  description: string | null;
  created_at: Date;
  click_count: number;
  unique_click_count: number;
  folders: Array<{
    id: string;
    name: string;
    parent_folder_id: string | null;
  }>;
  // Manteniamo la compatibilità con il vecchio sistema
  folder_id: string | null;
}

// GET - Ottenere tutti i link con le loro associazioni alle cartelle
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.isLoggedIn || !session?.userId || !session?.workspaceId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId');
    const includeUnassigned = searchParams.get('includeUnassigned') === 'true';

    // Query base per ottenere i link con conteggi accurati usando enhanced fingerprinting
    let baseQuery = `
      SELECT 
        l.id,
        l.short_code,
        l.original_url,
        l.title,
        l.description,
        l.created_at,
        l.folder_id,
        -- Usa click_count dalla tabella links (più performante)
        l.click_count::integer as click_count,
        -- Calcola unique visitors basandosi sui device_fingerprint unici
        COALESCE(
          (SELECT COUNT(DISTINCT ef.device_fingerprint) 
           FROM enhanced_fingerprints ef 
           WHERE ef.link_id = l.id), 
          l.unique_click_count
        )::integer as unique_click_count
      FROM links l
      WHERE l.user_id = $1 AND l.workspace_id = $2
    `;

    const params = [session.userId, session.workspaceId];
    let paramIndex = 3;

    // Se richiesto un folderId specifico, filtra per quello
    if (folderId && !includeUnassigned) {
      baseQuery += `
        AND EXISTS (
          SELECT 1 FROM link_folder_associations lfa 
          WHERE lfa.link_id = l.id AND lfa.folder_id = $${paramIndex}
        )
      `;
      params.push(folderId);
      paramIndex++;
    }

    baseQuery += `
      ORDER BY l.created_at DESC
    `;

    const { rows: links } = await sql.query(baseQuery, params);

    // Ora ottenere tutte le associazioni cartelle per questi link
    if (links.length === 0) {
      return NextResponse.json({ links: [] });
    }

    const linkIds = links.map(link => link.id);
    const linkPlaceholders = linkIds.map((_, index) => `$${index + 1}`).join(', ');
    
    const associationsQuery = `
      SELECT 
        lfa.link_id,
        f.id as folder_id,
        f.name as folder_name,
        f.parent_folder_id
      FROM link_folder_associations lfa
      JOIN folders f ON lfa.folder_id = f.id
      WHERE lfa.link_id IN (${linkPlaceholders})
        AND lfa.user_id = $${linkIds.length + 1}
        AND lfa.workspace_id = $${linkIds.length + 2}
      ORDER BY f.name ASC
    `;

    const { rows: associations } = await sql.query(associationsQuery, [
      ...linkIds,
      session.userId,
      session.workspaceId
    ]);

    // Temporary debug logging
    console.log('🔍 DEBUG API links-with-folders:');
    console.log('- Links found:', links.length);
    console.log('- Link IDs:', linkIds.slice(0, 3), linkIds.length > 3 ? '...' : '');
    console.log('- Associations found:', associations.length);
    if (associations.length > 0) {
      console.log('- First association:', associations[0]);
    } else {
      console.log('- NO ASSOCIATIONS FOUND - checking query params...');
      console.log('- userId:', session.userId);
      console.log('- workspaceId:', session.workspaceId);
    }



    // Raggruppa le associazioni per link
    const foldersByLink = new Map<string, Array<{
      id: string;
      name: string;
      parent_folder_id: string | null;
    }>>();

    associations.forEach(assoc => {
      const linkIdString = String(assoc.link_id);
      if (!foldersByLink.has(linkIdString)) {
        foldersByLink.set(linkIdString, []);
      }
      foldersByLink.get(linkIdString)!.push({
        id: assoc.folder_id,
        name: assoc.folder_name,
        parent_folder_id: assoc.parent_folder_id
      });
    });

    // Combina i dati
    const linksWithFolders: LinkWithFolders[] = links.map(link => ({
      ...link,
      folders: foldersByLink.get(String(link.id)) || []
    }));



    // Se richiesto includeUnassigned, filtra solo i link non assegnati a nessuna cartella
    let result = linksWithFolders;
    if (includeUnassigned) {
      result = linksWithFolders.filter(link => link.folders.length === 0);
    }

    return NextResponse.json({ links: result });
  } catch (error) {
    console.error('Errore durante il recupero dei link con cartelle:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
