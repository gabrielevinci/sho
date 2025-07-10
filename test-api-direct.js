// Test diretto dell'API /api/links-with-folders
async function testAPIDirectly() {
    try {
        console.log('🔍 Testing API directly...');
        
        const response = await fetch('http://localhost:3001/api/links-with-folders', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📋 API Response:', JSON.stringify(data, null, 2));
        
        // Analizza i link per vedere se hanno associazioni
        if (data.links) {
            console.log('🔍 Link analysis:');
            data.links.forEach((link, index) => {
                console.log(`Link ${index + 1}: id=${link.id}, title="${link.title}", folders=${link.folders?.length || 0}`);
                if (link.folders && link.folders.length > 0) {
                    console.log(`  - Folders:`, link.folders.map(f => `${f.id}:${f.name}`));
                }
            });
        }
        
    } catch (error) {
        console.error('❌ API Test Error:', error);
    }
}

testAPIDirectly();
