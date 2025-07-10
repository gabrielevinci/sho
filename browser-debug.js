// Script di debug da eseguire nella console del browser
// Monitora le chiamate API per verificare le associazioni

(function() {
    console.log('🔧 Debug API Monitor attivato');
    
    // Intercetta le chiamate fetch
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        const [url] = args;
        
        if (typeof url === 'string' && url.includes('/api/links-with-folders')) {
            console.log('📡 API Call:', url);
            
            return originalFetch.apply(this, arguments)
                .then(response => {
                    if (response.ok) {
                        return response.clone().json().then(data => {
                            console.log('📋 API Response for', url, ':', {
                                totalLinks: data.links?.length || 0,
                                linksWithFolders: data.links?.filter(l => l.folders && l.folders.length > 0).length || 0,
                                firstLinkWithFolders: data.links?.find(l => l.folders && l.folders.length > 0)
                            });
                            
                            // Log dettagliato per debugging
                            if (data.links && data.links.length > 0) {
                                const summary = data.links.slice(0, 3).map(link => ({
                                    id: link.id,
                                    title: link.title || link.original_url.substring(0, 30) + '...',
                                    foldersCount: link.folders?.length || 0,
                                    folderNames: link.folders?.map(f => f.name) || []
                                }));
                                console.table(summary);
                            }
                            
                            return response;
                        }).catch(() => response);
                    }
                    return response;
                });
        }
        
        return originalFetch.apply(this, arguments);
    };
    
    console.log('✅ Monitor installato. Ora ricarica la pagina o naviga tra le cartelle per vedere i log.');
})();

// Funzione di utilità per testare manualmente l'API
window.debugAPI = async function() {
    try {
        console.log('🧪 Test manuale API...');
        const response = await fetch('/api/links-with-folders');
        const data = await response.json();
        
        console.log('📊 Risultati del test:', {
            status: response.status,
            totalLinks: data.links?.length || 0,
            linksWithAssociations: data.links?.filter(l => l.folders && l.folders.length > 0).length || 0
        });
        
        return data;
    } catch (error) {
        console.error('❌ Errore nel test API:', error);
    }
};

console.log('🔧 Debug tools pronti. Usa debugAPI() per testare manualmente l\'API.');
