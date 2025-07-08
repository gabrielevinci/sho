'use server';

import { getSession } from '@/app/lib/session';
import { redirect } from 'next/navigation';
import { sql } from '@vercel/postgres';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { revalidatePath } from 'next/cache';

// --- AZIONI WORKSPACE (COMPLETE E FUNZIONANTI) ---
export async function updateWorkspaceName(formData: FormData) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) { throw new Error('Not authenticated'); }
  const workspaceId = formData.get('workspaceId') as string;
  const newName = formData.get('newName') as string;
  if (!workspaceId || !newName || newName.trim().length < 2) { throw new Error('Invalid data provided.'); }
  await sql`UPDATE workspaces SET name = ${newName} WHERE id = ${workspaceId} AND user_id = ${session.userId}`;
  revalidatePath('/dashboard');
}

export async function createWorkspace(formData: FormData) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) { 
    throw new Error('Not authenticated'); 
  }
  
  const name = formData.get('name') as string;
  if (!name || name.trim().length === 0) { 
    throw new Error('Workspace name cannot be empty'); 
  }
  
  // Crea il workspace
  const { rows } = await sql`
    INSERT INTO workspaces (user_id, name) 
    VALUES (${session.userId}, ${name})
    RETURNING id
  `;
  
  const newWorkspaceId = rows[0].id;
  
  // Crea la cartella "Tutti i link" per il nuovo workspace
  await createDefaultFolder(newWorkspaceId, session.userId);
  
  // Cambia automaticamente al nuovo workspace
  session.workspaceId = newWorkspaceId;
  await session.save();
  
  revalidatePath('/dashboard');
  redirect('/dashboard');
}

export async function switchWorkspace(workspaceId: string) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) { 
    throw new Error('Not authenticated'); 
  }
  
  // Verifica che il workspace esista e appartenga all'utente
  const { rows } = await sql`SELECT id, name FROM workspaces WHERE id = ${workspaceId} AND user_id = ${session.userId}`;
  if (rows.length === 0) { 
    throw new Error('Workspace not found or access denied'); 
  }
  
  // Assicurati che la cartella "Tutti i link" esista per questo workspace
  await createDefaultFolder(workspaceId, session.userId);
  
  // Aggiorna la sessione
  session.workspaceId = workspaceId; 
  await session.save();
  
  revalidatePath('/dashboard');
  redirect('/dashboard');
}

// --- AZIONE LOGOUT (INVARIATA) ---
export async function logout() {
  const session = await getSession();
  await session.destroy();
  redirect('/login');
}

// --- AZIONE DI CREAZIONE LINK AVANZATA (RISCRITTA CON LOGICA CORRETTA) ---
export interface CreateAdvancedLinkState {
  message: string;
  errors?: { originalUrl?: string; shortCode?: string; general?: string; };
  success: boolean;
  finalShortCode?: string;
}

// --- FUNZIONE PER RECUPERARE UN LINK PER LA MODIFICA ---
export async function getLinkByShortCode(shortCode: string) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId || !session.workspaceId) {
    throw new Error('Not authenticated');
  }

  const { rows } = await sql`
    SELECT 
      short_code, original_url, title, description, 
      utm_source, utm_medium, utm_campaign, utm_term, utm_content,
      created_at
    FROM links 
    WHERE short_code = ${shortCode} AND user_id = ${session.userId} AND workspace_id = ${session.workspaceId}
  `;

  if (rows.length === 0) {
    return null;
  }

  return rows[0];
}

// --- SCHEMA E FUNZIONI PER LA MODIFICA DEL LINK ---
export interface UpdateLinkState {
  message: string;
  errors?: { originalUrl?: string; shortCode?: string; general?: string; };
  success: boolean;
  finalShortCode?: string;
}

export async function updateAdvancedLink(
  currentShortCode: string,
  prevState: UpdateLinkState,
  formData: FormData
): Promise<UpdateLinkState> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId || !session.workspaceId) {
    return { success: false, message: '', errors: { general: "Autenticazione richiesta o workspace non valido." } };
  }
  
  const { userId, workspaceId } = session;
  const rawData = Object.fromEntries(formData.entries());
  const validatedFields = AdvancedLinkSchema.safeParse(rawData);

  if (!validatedFields.success) {
    const fieldErrors = validatedFields.error.flatten().fieldErrors;
    return {
      success: false,
      message: "Errore di validazione. Controlla i campi.",
      errors: { originalUrl: fieldErrors.originalUrl?.[0], shortCode: fieldErrors.shortCode?.[0] }
    };
  }
  
  const { originalUrl, title, description, utm_source, utm_medium, utm_campaign, utm_term, utm_content } = validatedFields.data;
  let shortCode = validatedFields.data.shortCode;

  // Se non è stato fornito un nuovo short code, mantieni quello attuale
  if (!shortCode) {
    shortCode = currentShortCode;
  }

  // Se il short code è diverso da quello attuale, verifica che non sia già in uso
  if (shortCode !== currentShortCode) {
    const { rows } = await sql`SELECT id FROM links WHERE short_code = ${shortCode}`;
    if (rows.length > 0) {
      return { success: false, message: '', errors: { shortCode: "Questo short code è già in uso. Scegline un altro." } };
    }
  }
  
  try {
    await sql`
      UPDATE links 
      SET 
        original_url = ${originalUrl},
        short_code = ${shortCode},
        title = ${title},
        description = ${description},
        utm_source = ${utm_source},
        utm_medium = ${utm_medium},
        utm_campaign = ${utm_campaign},
        utm_term = ${utm_term},
        utm_content = ${utm_content}
      WHERE short_code = ${currentShortCode} AND user_id = ${userId} AND workspace_id = ${workspaceId}
    `;
  } catch (error) {
    console.error("Database error during link update:", error);
    return { success: false, message: '', errors: { general: "Si è verificato un errore del database. Riprova." } };
  }

  revalidatePath('/dashboard');
  return {
    success: true,
    message: "Link modificato con successo!",
    finalShortCode: shortCode
  };
}

export async function createAdvancedLink(prevState: CreateAdvancedLinkState, formData: FormData): Promise<CreateAdvancedLinkState> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId || !session.workspaceId) {
    return { success: false, message: '', errors: { general: "Autenticazione richiesta o workspace non valido." } };
  }
  const { userId, workspaceId } = session;

  const rawData = Object.fromEntries(formData.entries());
  const validatedFields = AdvancedLinkSchema.safeParse(rawData);

  if (!validatedFields.success) {
    const fieldErrors = validatedFields.error.flatten().fieldErrors;
    return {
      success: false,
      message: "Errore di validazione. Controlla i campi.",
      errors: { originalUrl: fieldErrors.originalUrl?.[0], shortCode: fieldErrors.shortCode?.[0] }
    };
  }
  
  const { originalUrl, title, description, utm_source, utm_medium, utm_campaign, utm_term, utm_content } = validatedFields.data;
  let shortCode = validatedFields.data.shortCode;

  if (shortCode) {
    const { rows } = await sql`SELECT id FROM links WHERE short_code = ${shortCode}`;
    if (rows.length > 0) {
      return { success: false, message: '', errors: { shortCode: "Questo short code è già in uso. Scegline un altro." } };
    }
  } else {
    shortCode = nanoid(7);
  }
  
  try {
    await sql`
      INSERT INTO links (
        user_id, workspace_id, original_url, short_code, title, description, 
        utm_source, utm_medium, utm_campaign, utm_term, utm_content
      )
      VALUES (
        ${userId}, ${workspaceId}, ${originalUrl}, ${shortCode}, ${title}, ${description},
        ${utm_source}, ${utm_medium}, ${utm_campaign}, ${utm_term}, ${utm_content}
      )
    `;
  } catch (error) {
    console.error("Database error during advanced link creation:", error);
    return { success: false, message: '', errors: { general: "Si è verificato un errore del database. Riprova." } };
  }

  revalidatePath('/dashboard');
  return {
    success: true,
    message: "Link creato con successo!",
    finalShortCode: shortCode
  };
}

const AdvancedLinkSchema = z.object({
  originalUrl: z.string().url({ message: "L'URL di destinazione deve essere un URL valido." }),
  shortCode: z.string().optional().transform(val => val || '').refine(val => /^[a-zA-Z0-9_-]*$/.test(val), {
    message: "Lo short code può contenere solo lettere, numeri, trattini (-) e underscore (_)."
  }),
  title: z.string().optional(),
  description: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_term: z.string().optional(),
  utm_content: z.string().optional(),
});

// --- AZIONI CARTELLE ---
export async function createDefaultFolder(workspaceId: string, userId: string) {
  // Crea la cartella "Tutti i link" se non esiste
  const existing = await sql`
    SELECT id FROM folders 
    WHERE workspace_id = ${workspaceId} AND name = 'Tutti i link' AND user_id = ${userId}
  `;
  
  if (existing.rowCount === 0) {
    await sql`
      INSERT INTO folders (name, parent_folder_id, workspace_id, user_id)
      VALUES ('Tutti i link', NULL, ${workspaceId}, ${userId})
    `;
  }
}

export async function createFolder(formData: FormData) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) { 
    throw new Error('Not authenticated'); 
  }

  const name = formData.get('name') as string;
  const parentFolderId = formData.get('parentFolderId') as string;
  const workspaceId = formData.get('workspaceId') as string;

  if (!name || !workspaceId) {
    throw new Error('Nome cartella e workspace sono obbligatori');
  }

  // Verifica che il workspace appartenga all'utente
  const workspaceCheck = await sql`
    SELECT id FROM workspaces WHERE id = ${workspaceId} AND user_id = ${session.userId}
  `;
  
  if (workspaceCheck.rowCount === 0) {
    throw new Error('Workspace non trovato');
  }

  // Se c'è un parent folder, verifica che esista
  if (parentFolderId) {
    const parentCheck = await sql`
      SELECT id FROM folders 
      WHERE id = ${parentFolderId} AND user_id = ${session.userId} AND workspace_id = ${workspaceId}
    `;
    
    if (parentCheck.rowCount === 0) {
      throw new Error('Cartella parent non trovata');
    }
  }

  await sql`
    INSERT INTO folders (name, parent_folder_id, workspace_id, user_id)
    VALUES (${name}, ${parentFolderId || null}, ${workspaceId}, ${session.userId})
  `;
  
  revalidatePath('/dashboard');
}

export async function renameFolder(formData: FormData) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) { 
    throw new Error('Not authenticated'); 
  }

  const folderId = formData.get('folderId') as string;
  const newName = formData.get('newName') as string;

  if (!folderId || !newName) {
    throw new Error('ID cartella e nome sono obbligatori');
  }

  // Verifica che la cartella appartenga all'utente
  const folderCheck = await sql`
    SELECT id FROM folders WHERE id = ${folderId} AND user_id = ${session.userId}
  `;
  
  if (folderCheck.rowCount === 0) {
    throw new Error('Cartella non trovata');
  }

  await sql`
    UPDATE folders 
    SET name = ${newName}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${folderId} AND user_id = ${session.userId}
  `;
  
  revalidatePath('/dashboard');
}

export async function deleteFolder(formData: FormData) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) { 
    throw new Error('Not authenticated'); 
  }

  const folderId = formData.get('folderId') as string;

  if (!folderId) {
    throw new Error('ID cartella mancante');
  }

  // Verifica che la cartella appartenga all'utente
  const folderCheck = await sql`
    SELECT id, name, workspace_id FROM folders 
    WHERE id = ${folderId} AND user_id = ${session.userId}
  `;
  
  if (folderCheck.rowCount === 0) {
    throw new Error('Cartella non trovata');
  }

  const folder = folderCheck.rows[0];

  // Non permettere l'eliminazione della cartella "Tutti i link"
  if (folder.name === 'Tutti i link') {
    throw new Error('Non è possibile eliminare la cartella "Tutti i link"');
  }

  // Prima di eliminare la cartella, sposta tutti i link nella cartella "Tutti i link"
  await sql`
    UPDATE links 
    SET folder_id = (
      SELECT f.id FROM folders f 
      WHERE f.workspace_id = ${folder.workspace_id} 
      AND f.name = 'Tutti i link'
    )
    WHERE folder_id = ${folderId}
  `;

  // Sposta anche i link delle sottocartelle nella cartella "Tutti i link"
  await sql`
    WITH RECURSIVE folder_tree AS (
      SELECT id FROM folders WHERE id = ${folderId}
      UNION ALL
      SELECT f.id FROM folders f
      INNER JOIN folder_tree ft ON f.parent_folder_id = ft.id
    )
    UPDATE links 
    SET folder_id = (
      SELECT f.id FROM folders f 
      WHERE f.workspace_id = ${folder.workspace_id} 
      AND f.name = 'Tutti i link'
    )
    WHERE folder_id IN (SELECT id FROM folder_tree)
  `;

  // Elimina la cartella (CASCADE eliminerà automaticamente le sottocartelle)
  await sql`
    DELETE FROM folders WHERE id = ${folderId} AND user_id = ${session.userId}
  `;
  
  revalidatePath('/dashboard');
}

export async function moveLinkToFolder(formData: FormData) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) { 
    throw new Error('Not authenticated'); 
  }

  const linkId = formData.get('linkId') as string;
  const folderId = formData.get('folderId') as string;

  if (!linkId) {
    throw new Error('ID link obbligatorio');
  }

  // Verifica che il link appartenga all'utente
  const linkCheck = await sql`
    SELECT id, workspace_id FROM links 
    WHERE id = ${linkId} AND user_id = ${session.userId}
  `;
  
  if (linkCheck.rowCount === 0) {
    throw new Error('Link non trovato');
  }

  const link = linkCheck.rows[0];

  // Se folderId è specificato, verifica che la cartella esista
  if (folderId) {
    const folderCheck = await sql`
      SELECT id FROM folders 
      WHERE id = ${folderId} AND user_id = ${session.userId} AND workspace_id = ${link.workspace_id}
    `;
    
    if (folderCheck.rowCount === 0) {
      throw new Error('Cartella non trovata');
    }
  }

  await sql`
    UPDATE links 
    SET folder_id = ${folderId || null}
    WHERE id = ${linkId} AND user_id = ${session.userId}
  `;
  
  revalidatePath('/dashboard');
}