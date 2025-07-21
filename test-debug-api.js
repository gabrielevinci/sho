const fetch = require('node-fetch');

async function testDebugReset() {
  try {
    const response = await fetch('http://localhost:3000/api/debug-reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        shortCode: 'fnpx6xa',
        userId: 'b9718f87-1a56-4c6e-b91d-ec5e2cef1ad6',
        workspaceId: 'a4d63585-d3ae-4084-a695-fdb53a796f89'
      })
    });

    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', result);
    
    if (response.ok) {
      console.log('✅ Reset completato con successo!');
    } else {
      console.log('❌ Errore durante il reset:', result.error);
    }
    
  } catch (error) {
    console.error('Errore nella chiamata:', error);
  }
}

testDebugReset();
