'use client';

import { useState, useEffect } from 'react';
import { ChevronUpIcon, ChevronDownIcon, FolderIcon, HomeIcon, ChevronRightIcon, ArrowRightIcon, PlusIcon, Bars3Icon } from '@heroicons/react/24/outline';
import { Folder } from './FolderSidebar';
import Portal from './Portal';

interface FolderReorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  workspaceId: string;
  onReorder: () => void;
  onToast?: (message: string, type: 'success' | 'error') => void;
}

interface FolderTreeNode {
  id: string;
  name: string;
  parent_folder_id: string | null;
  position: number;
  children: FolderTreeNode[];
  level: number;
}

export default function FolderReorderModal({
  isOpen,
  onClose,
  folders,
  onReorder,
  onToast
}: FolderReorderModalProps) {
  const [folderTree, setFolderTree] = useState<FolderTreeNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [availableTargets, setAvailableTargets] = useState<FolderTreeNode[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Costruisce l'albero delle cartelle gerarchico
  const buildFolderTree = (folders: Folder[]): FolderTreeNode[] => {
    const filteredFolders = folders.filter(folder => folder.name !== 'Tutti i link');
    
    // Crea un map per accesso rapido
    const folderMap = new Map<string, FolderTreeNode>();
    
    // Inizializza tutti i nodi
    filteredFolders.forEach(folder => {
      folderMap.set(folder.id, {
        id: folder.id,
        name: folder.name,
        parent_folder_id: folder.parent_folder_id,
        position: folder.position,
        children: [],
        level: 0
      });
    });
    
    // Costruisce l'albero e calcola i livelli
    const rootNodes: FolderTreeNode[] = [];
    
    const calculateLevel = (nodeId: string, visited = new Set<string>()): number => {
      if (visited.has(nodeId)) return 0; // Prevenzione loop
      visited.add(nodeId);
      
      const node = folderMap.get(nodeId);
      if (!node || !node.parent_folder_id) return 0;
      
      const parentLevel = calculateLevel(node.parent_folder_id, visited);
      return parentLevel + 1;
    };
    
    // Organizza i nodi nell'albero
    filteredFolders.forEach(folder => {
      const node = folderMap.get(folder.id)!;
      node.level = calculateLevel(folder.id);
      
      if (folder.parent_folder_id) {
        const parent = folderMap.get(folder.parent_folder_id);
        if (parent) {
          parent.children.push(node);
        }
      } else {
        rootNodes.push(node);
      }
    });
    
    // Ordina i nodi per posizione
    const sortNodes = (nodes: FolderTreeNode[]) => {
      nodes.sort((a, b) => a.position - b.position);
      nodes.forEach(node => sortNodes(node.children));
    };
    
    sortNodes(rootNodes);
    
    return rootNodes;
  };

  // Aggiorna l'albero quando il modal si apre o quando le cartelle cambiano
  useEffect(() => {
    if (isOpen) {
      const tree = buildFolderTree(folders);
      setFolderTree(tree);
      
      // Espandi automaticamente i nodi root
      const rootIds = tree.map(node => node.id);
      setExpandedFolders(new Set(rootIds));
    }
  }, [isOpen, folders]);

  // Effetto aggiuntivo per aggiornare l'albero quando le cartelle cambiano
  useEffect(() => {
    if (isOpen && folders.length > 0) {
      const tree = buildFolderTree(folders);
      setFolderTree(tree);
    }
  }, [folders, isOpen]);

  // Funzioni per gestire l'espansione/collasso
  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  // Funzione per spostare una cartella istantaneamente
  const moveFolder = async (nodeId: string, direction: 'up' | 'down', parentId: string | null) => {
    // Appiattisce l'albero per trovare tutte le cartelle
    const flattenTree = (nodes: FolderTreeNode[]): FolderTreeNode[] => {
      const result: FolderTreeNode[] = [];
      const flatten = (nodeList: FolderTreeNode[]) => {
        nodeList.forEach(node => {
          result.push(node);
          if (node.children.length > 0) {
            flatten(node.children);
          }
        });
      };
      flatten(nodes);
      return result;
    };

    // Trova tutti i fratelli (cartelle con lo stesso parent)
    const allNodes = flattenTree(folderTree);
    const siblings = allNodes
      .filter(node => node.parent_folder_id === parentId)
      .sort((a, b) => a.position - b.position);

    const currentIndex = siblings.findIndex(n => n.id === nodeId);
    
    if (currentIndex === -1) return;
    
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= siblings.length) return;

    try {
      // Algoritmo migliorato: assegna posizioni incrementali per evitare conflitti
      const newPositions: { id: string; position: number }[] = [];
      
      // Riordina i fratelli localmente
      const reorderedSiblings = [...siblings];
      [reorderedSiblings[currentIndex], reorderedSiblings[targetIndex]] = [reorderedSiblings[targetIndex], reorderedSiblings[currentIndex]];
      
      // Assegna nuove posizioni incrementali
      reorderedSiblings.forEach((folder, index) => {
        const newPosition = index + 1; // Posizioni da 1 in avanti
        if (folder.position !== newPosition) {
          newPositions.push({ id: folder.id, position: newPosition });
        }
      });

      // Invia richieste al backend per tutte le modifiche necessarie
      const updatePromises = newPositions.map(({ id, position }) => 
        fetch('/api/folders/reorder', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            folderId: id,
            newPosition: position
          }),
        })
      );

      // Aggiorna immediatamente l'UI - algoritmo ricorsivo corretto
      const updateTree = (nodes: FolderTreeNode[]): FolderTreeNode[] => {
        return nodes.map(node => {
          const updatedNode = { ...node };
          
          // Aggiorna la posizione se è presente nelle nuove posizioni
          const newPosData = newPositions.find(p => p.id === node.id);
          if (newPosData) {
            updatedNode.position = newPosData.position;
          }
          
          // Applica l'aggiornamento ricorsivamente ai figli
          if (updatedNode.children.length > 0) {
            updatedNode.children = updateTree(updatedNode.children);
          }
          
          return updatedNode;
        });
      };

      const newTree = updateTree(folderTree);
      setFolderTree(newTree);

      // Aspetta le risposte dal backend
      const responses = await Promise.all(updatePromises);
      const allSuccess = responses.every(response => response.ok);
      
      if (allSuccess) {
        onToast?.('✅ Ordine aggiornato con successo', 'success');
        onReorder(); // Questo aggiorna i dati nel componente padre
      } else {
        throw new Error('Errore nel riordino');
      }
    } catch (error) {
      console.error('Errore durante il riordino:', error);
      onToast?.('❌ Errore nel riordino delle cartelle', 'error');
      
      // Ripristina l'ordine originale in caso di errore
      const tree = buildFolderTree(folders);
      setFolderTree(tree);
    }
  };

  // Funzione per spostare una cartella dentro/fuori
  const moveFolderTo = async (folderId: string, newParentId: string | null) => {
    const folderName = folderTree.find(f => f.id === folderId)?.name || 'Cartella';
    const targetName = newParentId ? folderTree.find(f => f.id === newParentId)?.name : 'Livello Principale';
    
    try {
      const response = await fetch('/api/folders/move', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folderId,
          newParentId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore durante lo spostamento');
      }

      onToast?.(`✅ "${folderName}" spostata in "${targetName}" con successo`, 'success');
      onReorder();
      setShowMoveModal(false);
      setSelectedFolder(null);
      setSearchTerm('');
    } catch (error) {
      console.error('Errore durante lo spostamento:', error);
      onToast?.(`❌ Errore nello spostamento di "${folderName}": ${error instanceof Error ? error.message : 'Errore sconosciuto'}`, 'error');
    }
  };

  // Funzione per aprire il modal di spostamento
  const openMoveModal = (folderId: string) => {
    setSelectedFolder(folderId);
    
    // Calcola le cartelle di destinazione disponibili (algoritmo corretto)
    const getAvailableTargets = (currentId: string): FolderTreeNode[] => {
      const getAllDescendants = (nodeId: string): Set<string> => {
        const descendants = new Set<string>();
        
        // Funzione ricorsiva per trovare tutti i discendenti
        const findDescendants = (id: string) => {
          const flattenTree = (nodes: FolderTreeNode[]): FolderTreeNode[] => {
            const result: FolderTreeNode[] = [];
            const traverse = (nodeList: FolderTreeNode[]) => {
              nodeList.forEach(node => {
                result.push(node);
                if (node.children.length > 0) {
                  traverse(node.children);
                }
              });
            };
            traverse(nodes);
            return result;
          };
          
          const allNodes = flattenTree(folderTree);
          
          allNodes.forEach(node => {
            if (node.parent_folder_id === id) {
              descendants.add(node.id);
              findDescendants(node.id); // Ricorsione per i discendenti
            }
          });
        };
        
        findDescendants(nodeId);
        return descendants;
      };
      
      const descendants = getAllDescendants(currentId);
      
      const flattenTree = (nodes: FolderTreeNode[]): FolderTreeNode[] => {
        const result: FolderTreeNode[] = [];
        const traverse = (nodeList: FolderTreeNode[]) => {
          nodeList.forEach(node => {
            result.push(node);
            if (node.children.length > 0) {
              traverse(node.children);
            }
          });
        };
        traverse(nodes);
        return result;
      };
      
      const allNodes = flattenTree(folderTree);
      
      // Filtra nodi validi: non se stesso, non i suoi discendenti
      // CORREZIONE: Ora una cartella con figli può essere spostata, 
      // purché non venga spostata in un suo discendente (per evitare loop)
      return allNodes.filter(node => 
        node.id !== currentId && !descendants.has(node.id)
      ).sort((a, b) => {
        // Ordina per livello e poi per nome
        if (a.level !== b.level) {
          return a.level - b.level;
        }
        return a.name.localeCompare(b.name);
      });
    };
    
    setAvailableTargets(getAvailableTargets(folderId));
    setShowMoveModal(true);
  };

  // Funzione per renderizzare l'albero delle cartelle nel modal di spostamento
  const renderMoveTargetTree = (targets: FolderTreeNode[]): React.ReactNode => {
    if (targets.length === 0) return null;

    // Raggruppa per genitore
    const groupedTargets = targets.reduce((acc, target) => {
      const parentId = target.parent_folder_id || 'root';
      if (!acc[parentId]) acc[parentId] = [];
      acc[parentId].push(target);
      return acc;
    }, {} as Record<string, FolderTreeNode[]>);

    // Renderizza ricorsivamente
    const renderGroup = (parentId: string, level: number = 0): React.ReactNode => {
      const children = groupedTargets[parentId] || [];
      if (children.length === 0) return null;

      return children
        .sort((a, b) => a.position - b.position)
        .map((target) => (
          <div key={target.id} className="select-none">
            <button
              onClick={() => moveFolderTo(selectedFolder!, target.id)}
              className={`w-full flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm ${
                level === 0 ? 'bg-blue-50 border-blue-200' : 'bg-white'
              }`}
              style={{ marginLeft: `${level * 20}px` }}
            >
              {/* Connettore visivo per la gerarchia */}
              {level > 0 && (
                <div className="flex items-center mr-2">
                  <div className="w-4 h-4 border-l-2 border-b-2 border-gray-300 rounded-bl-lg"></div>
                </div>
              )}
              
              {/* Icona cartella */}
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
                level === 0 ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
                <FolderIcon className={`w-5 h-5 ${
                  level === 0 ? 'text-blue-600' : 'text-gray-600'
                }`} />
              </div>
              
              {/* Informazioni cartella */}
              <div className="text-left min-w-0 flex-1">
                <div className="font-semibold text-gray-900 truncate">
                  {target.name}
                </div>
                <div className="text-sm text-gray-500 flex items-center">
                  <span className="mr-2">Livello {target.level + 1}</span>
                  {target.children.length > 0 && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-600 rounded-full text-xs">
                      {target.children.length} sottocartelle
                    </span>
                  )}
                </div>
              </div>
              
              {/* Freccia per indicare azione */}
              <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRightIcon className="w-4 h-4 text-gray-400" />
              </div>
            </button>
            
            {/* Sottocartelle */}
            <div className="ml-4 mt-1">
              {renderGroup(target.id, level + 1)}
            </div>
          </div>
        ));
    };

    return (
      <div className="space-y-2">
        {renderGroup('root', 0)}
      </div>
    );
  };

  // Funzione per renderizzare l'albero delle cartelle
  const renderFolderTree = (nodes: FolderTreeNode[], level: number = 0): React.ReactNode => {
    return nodes.map((node, index) => {
      const isExpanded = expandedFolders.has(node.id);
      const hasChildren = node.children.length > 0;
      
      // Correzione: i nodi passati sono già i fratelli del livello corrente
      // quindi possiamo usare direttamente index e nodes.length
      const isFirst = index === 0;
      const isLast = index === nodes.length - 1;
      
      return (
        <div key={node.id} className="select-none">
          {/* Nodo principale */}
          <div 
            className={`flex items-center py-3 px-4 rounded-lg hover:bg-gray-50 group transition-all duration-200 ${
              level === 0 ? 'bg-blue-50 border border-blue-200 shadow-sm' : 'bg-white border border-gray-200'
            } ${selectedFolder === node.id ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}
            style={{ marginLeft: `${level * 24}px` }}
          >
            {/* Indicatore di gerarchia */}
            <div className="flex items-center mr-3">
              {hasChildren ? (
                <button
                  onClick={() => toggleFolder(node.id)}
                  className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                  title={isExpanded ? 'Comprimi sottocartelle' : 'Espandi sottocartelle'}
                >
                  {isExpanded ? (
                    <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              ) : (
                <div className="w-6 h-6 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
                </div>
              )}
            </div>
            
            {/* Icona cartella */}
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 transition-colors ${
              level === 0 ? 'bg-blue-100 shadow-sm' : 'bg-gray-100'
            }`}>
              <FolderIcon className={`w-5 h-5 ${
                level === 0 ? 'text-blue-600' : 'text-gray-600'
              }`} />
            </div>
            
            {/* Informazioni cartella */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h4 className="font-semibold text-gray-900 truncate" title={node.name}>
                  {node.name}
                </h4>
                <span className="px-2 py-1 bg-blue-100 text-xs font-medium text-blue-700 rounded-full shadow-sm">
                  #{node.position}
                </span>
                {level > 0 && (
                  <span className="px-2 py-1 bg-yellow-100 text-xs font-medium text-yellow-700 rounded-full shadow-sm">
                    L{level + 1}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 mt-1">
                <p className="text-sm text-gray-500">
                  {hasChildren ? `${node.children.length} sottocartelle` : 'Nessuna sottocartella'}
                </p>
                {hasChildren && (
                  <span className="text-xs text-gray-400">•</span>
                )}
                <span className="text-xs text-gray-400">
                  {level === 0 ? 'Cartella principale' : `Sottocartella di livello ${level + 1}`}
                </span>
              </div>
            </div>
            
            {/* Controlli */}
            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {/* Pulsante sposta */}
              <button
                onClick={() => openMoveModal(node.id)}
                className="p-2 rounded-lg bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 transition-all duration-200 shadow-sm"
                title="Sposta cartella in un'altra posizione"
              >
                <ArrowRightIcon className="w-4 h-4" />
              </button>
              
              {/* Separatore */}
              <div className="w-px h-6 bg-gray-300"></div>
              
              {/* Pulsanti riordino */}
              <button
                onClick={() => moveFolder(node.id, 'up', node.parent_folder_id)}
                disabled={isFirst}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  isFirst
                    ? 'bg-gray-50 border border-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 shadow-sm'
                }`}
                title={isFirst ? 'Già in prima posizione' : 'Sposta in alto tra le cartelle dello stesso livello'}
              >
                <ChevronUpIcon className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => moveFolder(node.id, 'down', node.parent_folder_id)}
                disabled={isLast}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  isLast
                    ? 'bg-gray-50 border border-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 shadow-sm'
                }`}
                title={isLast ? 'Già in ultima posizione' : 'Sposta in basso tra le cartelle dello stesso livello'}
              >
                <ChevronDownIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Sottocartelle */}
          {hasChildren && isExpanded && (
            <div className="mt-2 ml-6 pl-4 border-l-2 border-gray-200">
              {renderFolderTree(node.children, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[9999] p-4" role="dialog" aria-modal="true" aria-labelledby="folder-modal-title">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl mx-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="folder-modal-title" className="text-xl font-semibold text-gray-900">🗂️ Gestione Cartelle</h2>
              <p className="text-sm text-gray-600 mt-1">
                Visualizza e gestisci la gerarchia delle cartelle in modo intuitivo
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
              title="Chiudi"
              aria-label="Chiudi finestra di gestione cartelle"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Legenda migliorata */}
          <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Guida ai controlli
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="flex items-center">
                <div className="p-1.5 bg-blue-50 border border-blue-200 rounded mr-3">
                  <ChevronUpIcon className="w-3 h-3 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">Riordina</div>
                  <div className="text-gray-500">Cambia posizione tra fratelli</div>
                </div>
              </div>
              <div className="flex items-center">
                <div className="p-1.5 bg-green-50 border border-green-200 rounded mr-3">
                  <ArrowRightIcon className="w-3 h-3 text-green-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">Sposta</div>
                  <div className="text-gray-500">Cambia cartella genitore</div>
                </div>
              </div>
              <div className="flex items-center">
                <div className="p-1.5 bg-gray-50 border border-gray-200 rounded mr-3">
                  <ChevronRightIcon className="w-3 h-3 text-gray-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">Espandi</div>
                  <div className="text-gray-500">Mostra/nascondi sottocartelle</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contenuto */}
        <div className="flex-1 overflow-y-auto p-6">
          {folderTree.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <FolderIcon className="w-12 h-12 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Nessuna cartella da gestire</h3>
              <p className="text-gray-500 max-w-md mx-auto mb-6">
                Crea delle cartelle per iniziare ad organizzare i tuoi link in modo strutturato e facilmente accessibile
              </p>
              <div className="flex items-center justify-center space-x-4 text-sm text-gray-400">
                <div className="flex items-center">
                  <PlusIcon className="w-4 h-4 mr-1" />
                  <span>Crea cartelle</span>
                </div>
                <span>•</span>
                <div className="flex items-center">
                  <Bars3Icon className="w-4 h-4 mr-1" />
                  <span>Organizza link</span>
                </div>
                <span>•</span>
                <div className="flex items-center">
                  <FolderIcon className="w-4 h-4 mr-1" />
                  <span>Gestisci gerarchia</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {renderFolderTree(folderTree)}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              title="Chiudi finestra"
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>

      {/* Modal di spostamento */}
      {showMoveModal && selectedFolder && (
        <Portal>
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[10000] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-auto max-h-[85vh] flex flex-col animate-in fade-in-0 zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Sposta Cartella</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Scegli la nuova posizione per &quot;{folderTree.find(f => f.id === selectedFolder)?.name || 'cartella selezionata'}&quot;
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowMoveModal(false);
                    setSelectedFolder(null);
                    setSearchTerm('');
                  }}
                  className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {/* Barra di ricerca */}
              {availableTargets.length > 3 && (
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Cerca cartelle di destinazione..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              )}
              
              <div className="p-6">
                <div className="space-y-3">
                  {/* Opzione per spostare al livello principale */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Sposta al livello principale</h4>
                    <button
                      onClick={() => moveFolderTo(selectedFolder!, null)}
                      className="w-full flex items-center p-4 rounded-lg border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 transition-all duration-200 shadow-sm"
                    >
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4 shadow-sm">
                        <HomeIcon className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-gray-900">📁 Livello Principale</div>
                        <div className="text-sm text-gray-600">
                          {folderTree.find(f => f.id === selectedFolder)?.parent_folder_id 
                            ? 'Sposta questa cartella al livello principale (rimuovi dalla cartella genitore)'
                            : 'Questa cartella è già al livello principale'
                          }
                        </div>
                      </div>
                    </button>
                  </div>
                  
                  {/* Separatore */}
                  {availableTargets.filter(target => 
                    target.name.toLowerCase().includes(searchTerm.toLowerCase())
                  ).length > 0 && (
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">oppure sposta in</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Opzioni per spostare in altre cartelle con gerarchia */}
                  {(() => {
                    const filteredTargets = availableTargets.filter(target => 
                      target.name.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                    
                    if (filteredTargets.length === 0 && searchTerm) {
                      return (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                          <h4 className="text-lg font-medium text-gray-900 mb-2">Nessun risultato</h4>
                          <p className="text-gray-500">Nessuna cartella corrisponde a &quot;{searchTerm}&quot;</p>
                        </div>
                      );
                    }
                    
                    if (filteredTargets.length === 0) {
                      return (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FolderIcon className="w-8 h-8 text-gray-400" />
                          </div>
                          <h4 className="text-lg font-medium text-gray-900 mb-2">Nessuna destinazione disponibile</h4>
                          <p className="text-gray-500">Tutte le altre cartelle sono già sottocartelle o discendenti di questa cartella</p>
                        </div>
                      );
                    }
                    
                    return (
                      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                          <FolderIcon className="w-4 h-4 mr-2" />
                          Gerarchia delle cartelle
                        </h4>
                        {renderMoveTargetTree(filteredTargets)}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                💡 <strong>Suggerimento:</strong> Non puoi spostare una cartella in una sua sottocartella
              </div>
              <button
                onClick={() => {
                  setShowMoveModal(false);
                  setSelectedFolder(null);
                  setSearchTerm('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annulla
              </button>
            </div>
          </div>
          </div>
        </Portal>
      )}
    </div>
    </Portal>
  );
}
