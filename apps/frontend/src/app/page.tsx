'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../lib/axios';
import { MessageSquare, Hash, Plus, Settings, LogOut, Loader2 } from 'lucide-react';

export default function Index() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  const { data: workspaces = [], isLoading, refetch } = useQuery({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const res = await api.get('/workspaces');
      return res.data.workspaces;
    },
    enabled: !!user,
  });

  const createWorkspace = useMutation({
    mutationFn: async (name: string) => {
      const res = await api.post('/workspaces', { name });
      return res.data;
    },
    onSuccess: () => {
      setNewWorkspaceName('');
      refetch();
    },
  });

  const logout = useMutation({
    mutationFn: async () => await api.post('/auth/logout'),
    onSuccess: () => {
      setUser(null);
      router.push('/login');
    }
  });

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const activeWorkspace = workspaces.find((w: any) => w.id === activeWorkspaceId) || workspaces[0];

  if (workspaces.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 p-4">
        <div className="w-full max-w-md rounded-2xl bg-gray-800 p-8 text-center shadow-2xl border border-gray-700">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/20 mb-6">
            <MessageSquare className="h-8 w-8 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Witaj w klonie Slacka!</h1>
          <p className="mt-2 text-gray-400">Nie należysz jeszcze do żadnej przestrzeni roboczej.</p>
          
          <div className="mt-8 space-y-4">
            <input
              type="text"
              placeholder="Nazwa Twojej nowej firmy"
              className="w-full rounded-xl border border-gray-600 bg-gray-700/50 px-4 py-3 text-white placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
            />
            <button
              onClick={() => createWorkspace.mutate(newWorkspaceName)}
              disabled={!newWorkspaceName || createWorkspace.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {createWorkspace.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
              Stwórz przestrzeń roboczą
            </button>
          </div>
          <button onClick={() => logout.mutate()} className="mt-6 text-sm text-gray-500 hover:text-white transition-colors">
            Wyloguj się
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-900 text-gray-100 font-sans">
      
      {/* Bardzo wąski pasek przełączania Workspaces */}
      <div className="w-16 flex-shrink-0 bg-gray-950 flex flex-col items-center py-4 gap-4 border-r border-gray-800/50 shadow-xl z-20">
        {workspaces.map((w: any) => (
          <button
            key={w.id}
            onClick={() => setActiveWorkspaceId(w.id)}
            className={`flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold transition-all duration-200 ${
              activeWorkspace?.id === w.id 
                ? 'bg-indigo-600 text-white shadow-lg ring-2 ring-indigo-400 ring-offset-2 ring-offset-gray-950 scale-105' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white hover:scale-105'
            }`}
            title={w.name}
          >
            {w.name.charAt(0).toUpperCase()}
          </button>
        ))}
        <div className="mt-auto flex flex-col gap-4">
          <button onClick={() => logout.mutate()} title="Wyloguj" className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-800 text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-all duration-200">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Sidebar dla kanałów aktywnego Workspace */}
      <div className="w-64 flex-shrink-0 bg-[#1a1d21] border-r border-gray-800 flex flex-col z-10 shadow-lg">
        <div className="flex h-14 items-center justify-between border-b border-gray-800/50 px-4 hover:bg-gray-800/30 cursor-pointer transition-colors">
          <h2 className="font-bold text-white text-lg truncate">{activeWorkspace?.name}</h2>
          <button className="text-gray-400 hover:text-white transition-colors">
            <Settings className="h-4 w-4" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 px-3">
          <div className="flex items-center justify-between group mb-2 cursor-pointer">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-300 transition-colors">Kanały</h3>
            <button className="text-gray-500 opacity-0 group-hover:opacity-100 hover:text-white transition-opacity">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          
          <div className="space-y-[2px]">
            {/* Tutaj domyślnie wyświetlimy kanał general, który tworzy się z workspacem */}
            <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[15px] font-medium bg-indigo-500/10 text-indigo-300">
              <Hash className="h-4 w-4 opacity-70" />
              <span>general</span>
            </button>
          </div>
        </div>
      </div>

      {/* Główne okno czatu */}
      <div className="flex flex-1 flex-col bg-[#1a1d21]">
        <div className="flex h-14 items-center border-b border-gray-800/50 px-6 shadow-sm">
          <Hash className="h-5 w-5 text-gray-400 mr-2" />
          <h2 className="font-bold text-white text-base">general</h2>
        </div>
        
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-800 shadow-inner">
              <MessageSquare className="h-10 w-10 text-gray-500" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-300">To jest początek kanału #general</h3>
              <p className="text-sm mt-1">Czat i Websockety dodamy w kolejnym kroku!</p>
            </div>
          </div>
        </div>

        {/* Pole wpisywania */}
        <div className="p-4 bg-[#1a1d21]">
          <div className="rounded-xl border border-gray-600 bg-[#222529] focus-within:border-gray-400 focus-within:ring-1 focus-within:ring-gray-400 transition-all shadow-sm">
            <input
              type="text"
              disabled
              placeholder="Napisz wiadomość na #general (wkrótce...)"
              className="w-full bg-transparent px-4 py-3 text-white placeholder-gray-500 focus:outline-none disabled:opacity-50 text-[15px]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
