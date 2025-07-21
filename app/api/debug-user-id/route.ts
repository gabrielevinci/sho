import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSession } from '@/app/lib/session';

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session?.isLoggedIn || !session?.userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    console.log('🔍 Verificando i campi user_id nella tabella links...');

    // 1. Conta i link totali
    const totalLinks = await sql`SELECT COUNT(*) as total FROM links`;
    console.log(`📊 Totale link nella tabella: ${totalLinks.rows[0].total}`);

    // 2. Conta i link con user_id NULL
    const nullUserIds = await sql`SELECT COUNT(*) as null_count FROM links WHERE user_id IS NULL`;
    console.log(`❌ Link con user_id NULL: ${nullUserIds.rows[0].null_count}`);

    // 3. Conta i link con user_id valorizzato
    const validUserIds = await sql`SELECT COUNT(*) as valid_count FROM links WHERE user_id IS NOT NULL`;
    console.log(`✅ Link con user_id valorizzato: ${validUserIds.rows[0].valid_count}`);

    // 4. Mostra alcuni esempi di link con dettagli
    console.log('📝 Esempi di link (ultimi 10 creati):');
    const sampleLinks = await sql`
      SELECT id, short_code, user_id, workspace_id, created_at, title
      FROM links 
      ORDER BY created_at DESC 
      LIMIT 10
    `;
    
    console.log('Sample links:', sampleLinks.rows);

    // 5. Verifica utenti nella tabella users
    console.log('👤 Utenti registrati:');
    const users = await sql`
      SELECT id, email, created_at
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    
    console.log('Users:', users.rows);

    // 6. Verifica workspace
    console.log('🏢 Workspace disponibili:');
    const workspaces = await sql`
      SELECT id, user_id, name, created_at
      FROM workspaces 
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    
    console.log('Workspaces:', workspaces.rows);

    return NextResponse.json({
      success: true,
      data: {
        totalLinks: totalLinks.rows[0].total,
        nullUserIds: nullUserIds.rows[0].null_count,
        validUserIds: validUserIds.rows[0].valid_count,
        sampleLinks: sampleLinks.rows,
        users: users.rows,
        workspaces: workspaces.rows
      }
    });

  } catch (error) {
    console.error('❌ Errore durante la verifica:', error);
    return NextResponse.json({ 
      error: 'Errore interno del server',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
