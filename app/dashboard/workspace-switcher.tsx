'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { ChevronsUpDown, PlusCircle, Check, Loader2, Pencil, X } from 'lucide-react';
import { createWorkspace, switchWorkspace, updateWorkspaceName } from './actions';

type Workspace = {
  id: string;
  name: string;
};

// Componente per il bottone di creazione
function CreateButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="p-1.5 text-gray-500 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Crea workspace">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
    </button>
  );
}

export default function WorkspaceSwitcher({ workspaces, activeWorkspace }: { workspaces: Workspace[], activeWorkspace: Workspace | undefined }) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [switchingToId, setSwitchingToId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const switcherRef = useRef<HTMLDivElement>(null);

  const handleFormSubmit = () => {
    setTimeout(() => setIsOpen(false), 500);
  };

  const handleEditSubmit = () => {
    setEditingId(null);
  };

  const handleWorkspaceSwitch = (workspaceId: string) => {
    setSwitchingToId(workspaceId);
    startTransition(async () => {
      try {
        await switchWorkspace(workspaceId);
      } catch (error) {
        console.error('Errore durante il cambio workspace:', error);
        setSwitchingToId(null);
        // Qui potresti aggiungere un toast di errore se hai il sistema di toast
      }
    });
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const form = e.currentTarget.closest('form');
      if (form) {
        form.requestSubmit();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingId(null);
    }
  };

  const handleCreateKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const form = e.currentTarget.closest('form');
      if (form) {
        form.requestSubmit();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  // Close workspace switcher when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={switcherRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="flex items-center gap-2 px-3 py-2 text-lg font-semibold text-gray-800 bg-white border border-gray-200 rounded-2xl shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isPending}
      >
        <span>{activeWorkspace?.name || 'Seleziona Workspace'}</span>
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
        ) : (
          <ChevronsUpDown className="h-4 w-4 text-gray-500" />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 w-72 bg-white border border-gray-200 rounded-3xl shadow-lg z-10">
          <div className="p-2">
            <p className="px-2 py-1 text-xs font-semibold text-gray-500">I TUOI WORKSPACE</p>
            {workspaces.map((ws) => (
              <div key={ws.id} className="rounded-md hover:bg-gray-100">
                {editingId === ws.id ? (
                  // --- VISTA DI MODIFICA ---
                  <form action={updateWorkspaceName} onSubmit={handleEditSubmit} className="flex items-center p-2">
                    <input type="hidden" name="workspaceId" value={ws.id} />
                    <input
                      name="newName"
                      defaultValue={ws.name}
                      autoFocus
                      onKeyDown={handleEditKeyDown}
                      className="flex-grow bg-transparent text-sm font-semibold text-gray-900 focus:outline-none"
                    />
                    <button type="submit" className="p-1 text-green-600 hover:text-green-800"><Check className="h-4 w-4" /></button>
                    <button type="button" onClick={() => setEditingId(null)} className="p-1 text-red-600 hover:text-red-800"><X className="h-4 w-4" /></button>
                  </form>
                ) : (
                  // --- VISTA DI VISUALIZZAZIONE ---
                  <div className="flex items-center justify-between px-2 py-2 text-sm text-gray-700">
                    <button 
                      onClick={() => handleWorkspaceSwitch(ws.id)} 
                      className="flex-grow text-left flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={switchingToId === ws.id}
                    >
                      <span>{ws.name}</span>
                      {switchingToId === ws.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      ) : (
                        ws.id === activeWorkspace?.id && <Check className="h-4 w-4 text-blue-600" />
                      )}
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setEditingId(ws.id); }} 
                      className="p-1 text-gray-400 hover:text-gray-700"
                      disabled={switchingToId === ws.id}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="border-t border-gray-200 p-2">
            <form action={createWorkspace} onSubmit={handleFormSubmit} className="flex items-center gap-1">
              <input 
                name="name" 
                placeholder="Nuovo workspace..." 
                required 
                minLength={2} 
                onKeyDown={handleCreateKeyDown}
                className="flex-grow bg-transparent px-2 py-1 text-sm placeholder-gray-400 text-gray-900 focus:outline-none"
              />
              <CreateButton />
            </form>
          </div>
        </div>
      )}
    </div>
  );
}