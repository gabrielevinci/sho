'use client';

import { useState } from 'react';
import { ChevronsUpDown, PlusCircle, Check } from 'lucide-react';
import { createWorkspace, switchWorkspace } from './actions';

type Workspace = {
  id: string;
  name: string;
};

export default function WorkspaceSwitcher({
  workspaces,
  activeWorkspace,
}: {
  workspaces: Workspace[];
  activeWorkspace: Workspace | undefined;
}) {
  const [isOpen, setIsOpen] = useState(false);

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
            <form action={createWorkspace} onSubmit={() => setIsOpen(false)}>
              <div className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4 text-gray-400" />
                <input
                  name="name"
                  placeholder="Crea nuovo workspace..."
                  className="flex-grow bg-transparent text-sm placeholder-gray-400 focus:outline-none"
                />
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}