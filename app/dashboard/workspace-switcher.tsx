'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { ChevronsUpDown, PlusCircle, Check, Loader2 } from 'lucide-react';
import { createWorkspace, switchWorkspace } from './actions';

type Workspace = {
  id: string;
  name: string;
};

/*
 * CreateButton: Un sub-componente che usa l'hook useFormStatus.
 * Questo è il pattern professionale per mostrare uno stato di caricamento
 * all'interno di un form gestito da Server Actions, senza bisogno di state management complesso.
 */
function CreateButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="p-1.5 text-gray-500 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
      aria-label="Crea workspace"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
    </button>
  );
}

export default function WorkspaceSwitcher({
  workspaces,
  activeWorkspace,
}: {
  workspaces: Workspace[];
  activeWorkspace: Workspace | undefined;
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Funzione per gestire la chiusura del dropdown dopo l'invio del form.
  // Un piccolo ritardo migliora la percezione dell'utente, dando tempo al feedback visivo.
  const handleFormSubmit = () => {
    setTimeout(() => {
      setIsOpen(false);
    }, 500);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-lg font-semibold text-gray-800 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50"
      >
        <span>{activeWorkspace?.name || 'Seleziona Workspace'}</span>
        <ChevronsUpDown className="h-4 w-4 text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
          <div className="p-2">
            <p className="px-2 py-1 text-xs font-semibold text-gray-500">I TUOI WORKSPACE</p>
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => {
                  switchWorkspace(ws.id);
                  setIsOpen(false);
                }}
                className="w-full text-left flex items-center justify-between px-2 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100"
              >
                <span>{ws.name}</span>
                {ws.id === activeWorkspace?.id && <Check className="h-4 w-4 text-blue-600" />}
              </button>
            ))}
          </div>
          <div className="border-t border-gray-200 p-2">
            <form action={createWorkspace} onSubmit={handleFormSubmit} className="flex items-center gap-1">
              <input
                name="name"
                placeholder="Nuovo workspace..."
                required
                minLength={2}
                className="flex-grow bg-transparent px-2 py-1 text-sm placeholder-gray-400 focus:outline-none"
              />
              <CreateButton />
            </form>
          </div>
        </div>
      )}
    </div>
  );
}