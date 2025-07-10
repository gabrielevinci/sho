// Test per verificare la query SQL corretta
console.log('🧪 Testing SQL query parameter indexing...');

// Simula la situazione dell'API
const linkIds = ['14', '13', '12']; // Esempio di IDs
const userId = 'test-user-id';
const workspaceId = 'test-workspace-id';

// La query che abbiamo corretto
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

const queryParams = [
  ...linkIds,
  userId,
  workspaceId
];

console.log('📋 Generated Query:');
console.log(associationsQuery);
console.log('\n🔢 Parameters:');
queryParams.forEach((param, index) => {
  console.log(`$${index + 1}: ${param}`);
});

console.log('\n✅ Query Parameters Mapping:');
console.log('- Link IDs:', linkIds);
console.log('- User ID:', userId, `(position $${linkIds.length + 1})`);
console.log('- Workspace ID:', workspaceId, `(position $${linkIds.length + 2})`);

// Verifica che i placeholder siano corretti
const expectedPlaceholders = linkIds.map((_, i) => `$${i + 1}`).join(', ');
console.log('\n🎯 Placeholder verification:');
console.log('Expected:', expectedPlaceholders);
console.log('Generated:', linkPlaceholders);
console.log('Match:', expectedPlaceholders === linkPlaceholders ? '✅' : '❌');
