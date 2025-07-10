#!/usr/bin/env node

/**
 * Script di test per il sistema di cartelle multiple
 * Testa la creazione, l'associazione e la gestione di link in più cartelle
 */

import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';

// Simula un utente e workspace per i test
const testUserId = uuidv4();
const testWorkspaceId = uuidv4();

// Funzioni di utilità per i test
async function createTestUser() {
  await sql`
    INSERT INTO users (id, email, password_hash, is_verified)
    VALUES (${testUserId}, 'test@multifolder.com', 'hash', true)
  `;
  console.log('✅ Utente di test creato');
}

async function createTestWorkspace() {
  await sql`
    INSERT INTO workspaces (id, name, user_id)
    VALUES (${testWorkspaceId}, 'Test Workspace', ${testUserId})
  `;
  console.log('✅ Workspace di test creato');
}

async function createTestFolders() {
  const folders = [
    { id: uuidv4(), name: 'Marketing' },
    { id: uuidv4(), name: 'Sviluppo' },
    { id: uuidv4(), name: 'Social Media' },
    { id: uuidv4(), name: 'Documentazione' }
  ];

  for (const folder of folders) {
    await sql`
      INSERT INTO folders (id, name, workspace_id, user_id)
      VALUES (${folder.id}, ${folder.name}, ${testWorkspaceId}, ${testUserId})
    `;
  }

  console.log('✅ Cartelle di test create:', folders.map(f => f.name).join(', '));
  return folders;
}

async function createTestLinks() {
  const links = [
    { id: uuidv4(), short_code: 'test-multi-1', original_url: 'https://example.com/page1', title: 'Link Test 1' },
    { id: uuidv4(), short_code: 'test-multi-2', original_url: 'https://example.com/page2', title: 'Link Test 2' },
    { id: uuidv4(), short_code: 'test-multi-3', original_url: 'https://example.com/page3', title: 'Link Test 3' }
  ];

  for (const link of links) {
    await sql`
      INSERT INTO links (id, short_code, original_url, title, user_id, workspace_id)
      VALUES (${link.id}, ${link.short_code}, ${link.original_url}, ${link.title}, ${testUserId}, ${testWorkspaceId})
    `;
  }

  console.log('✅ Link di test creati:', links.map(l => l.title).join(', '));
  return links;
}

async function testMultipleFolderAssociations(links, folders) {
  console.log('\n📁 Test delle associazioni multiple...');

  // Test 1: Associa il primo link a più cartelle
  const link1 = links[0];
  const marketingFolder = folders.find(f => f.name === 'Marketing');
  const socialFolder = folders.find(f => f.name === 'Social Media');
  const devFolder = folders.find(f => f.name === 'Sviluppo');

  // Associa link1 a Marketing e Social Media
  await sql`
    INSERT INTO link_folder_associations (link_id, folder_id, user_id, workspace_id)
    VALUES 
      (${link1.id}, ${marketingFolder.id}, ${testUserId}, ${testWorkspaceId}),
      (${link1.id}, ${socialFolder.id}, ${testUserId}, ${testWorkspaceId})
  `;
  console.log(`  ✅ ${link1.title} associato a Marketing e Social Media`);

  // Test 2: Associa il secondo link a tutte le cartelle
  const link2 = links[1];
  for (const folder of folders) {
    await sql`
      INSERT INTO link_folder_associations (link_id, folder_id, user_id, workspace_id)
      VALUES (${link2.id}, ${folder.id}, ${testUserId}, ${testWorkspaceId})
    `;
  }
  console.log(`  ✅ ${link2.title} associato a tutte le cartelle`);

  // Test 3: Associa il terzo link solo a Sviluppo
  const link3 = links[2];
  await sql`
    INSERT INTO link_folder_associations (link_id, folder_id, user_id, workspace_id)
    VALUES (${link3.id}, ${devFolder.id}, ${testUserId}, ${testWorkspaceId})
  `;
  console.log(`  ✅ ${link3.title} associato solo a Sviluppo`);
}

async function testQueryPerformance() {
  console.log('\n🚀 Test delle performance delle query...');

  // Test query per ottenere link con cartelle
  const start = Date.now();
  const { rows } = await sql`
    SELECT 
      l.id,
      l.short_code,
      l.title,
      json_agg(
        json_build_object(
          'id', f.id,
          'name', f.name,
          'parent_folder_id', f.parent_folder_id
        )
      ) FILTER (WHERE f.id IS NOT NULL) as folders
    FROM links l
    LEFT JOIN link_folder_associations lfa ON l.id = lfa.link_id
    LEFT JOIN folders f ON lfa.folder_id = f.id
    WHERE l.user_id = ${testUserId} AND l.workspace_id = ${testWorkspaceId}
    GROUP BY l.id, l.short_code, l.title
    ORDER BY l.title
  `;
  const end = Date.now();

  console.log(`  ✅ Query completata in ${end - start}ms`);
  console.log(`  📊 Link trovati: ${rows.length}`);
  
  rows.forEach(row => {
    const folderNames = row.folders ? row.folders.map(f => f.name).join(', ') : 'Nessuna cartella';
    console.log(`    - ${row.title}: ${folderNames}`);
  });
}

async function testBatchOperations() {
  console.log('\n⚡ Test delle operazioni batch...');

  // Test rimozione batch
  const { rows: associations } = await sql`
    SELECT * FROM link_folder_associations 
    WHERE user_id = ${testUserId} 
    LIMIT 2
  `;

  if (associations.length >= 2) {
    await sql`
      DELETE FROM link_folder_associations 
      WHERE id IN (${associations[0].id}, ${associations[1].id})
    `;
    console.log('  ✅ Rimozione batch di 2 associazioni completata');
  }

  // Test aggiunta batch
  const { rows: linksForBatch } = await sql`
    SELECT id FROM links WHERE user_id = ${testUserId} LIMIT 1
  `;
  const { rows: foldersForBatch } = await sql`
    SELECT id FROM folders WHERE user_id = ${testUserId} LIMIT 2
  `;

  if (linksForBatch.length > 0 && foldersForBatch.length >= 2) {
    await sql`
      INSERT INTO link_folder_associations (link_id, folder_id, user_id, workspace_id)
      VALUES 
        (${linksForBatch[0].id}, ${foldersForBatch[0].id}, ${testUserId}, ${testWorkspaceId}),
        (${linksForBatch[0].id}, ${foldersForBatch[1].id}, ${testUserId}, ${testWorkspaceId})
      ON CONFLICT (link_id, folder_id) DO NOTHING
    `;
    console.log('  ✅ Aggiunta batch di associazioni completata');
  }
}

async function cleanupTestData() {
  console.log('\n🧹 Pulizia dati di test...');
  
  await sql`DELETE FROM link_folder_associations WHERE user_id = ${testUserId}`;
  await sql`DELETE FROM links WHERE user_id = ${testUserId}`;
  await sql`DELETE FROM folders WHERE user_id = ${testUserId}`;
  await sql`DELETE FROM workspaces WHERE user_id = ${testUserId}`;
  await sql`DELETE FROM users WHERE id = ${testUserId}`;
  
  console.log('✅ Dati di test eliminati');
}

async function runTests() {
  console.log('🧪 Avvio test sistema cartelle multiple\n');

  try {
    // Setup
    await createTestUser();
    await createTestWorkspace();
    const folders = await createTestFolders();
    const links = await createTestLinks();

    // Test principali
    await testMultipleFolderAssociations(links, folders);
    await testQueryPerformance();
    await testBatchOperations();

    console.log('\n✅ Tutti i test completati con successo!');
    
  } catch (error) {
    console.error('❌ Errore durante i test:', error);
    throw error;
  } finally {
    // Cleanup
    await cleanupTestData();
  }
}

// Esegui i test se questo file viene eseguito direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests()
    .then(() => {
      console.log('\n🎉 Test completati');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test falliti:', error);
      process.exit(1);
    });
}

export { runTests };
