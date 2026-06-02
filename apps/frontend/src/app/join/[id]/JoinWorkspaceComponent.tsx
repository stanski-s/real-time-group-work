'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '../../../store/auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../../lib/axios';
import { Loader2, LogIn } from 'lucide-react';

export default function JoinWorkspaceComponent() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();
  const id = params.id as string;

  useEffect(() => {
    if (!user) {
      router.push(`/login?redirect=/join/${id}`);
    }
  }, [user, router, id]);

  const { data: workspace, isLoading } = useQuery({
    queryKey: ['workspacePreview', id],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${id}/preview`);
      return res.data.workspace;
    },
    enabled: !!user && !!id,
    retry: false,
  });

  const joinWorkspace = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/workspaces/${id}/join`);
      return res.data;
    },
    onSuccess: () => {
      router.push('/');
    },
  });

  if (!user || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 p-4">
        <div className="w-full max-w-md rounded-2xl bg-gray-800 p-8 text-center shadow-2xl border border-gray-700">
          <h1 className="text-2xl font-bold text-white mb-2">Nie znaleziono</h1>
          <p className="text-gray-400">Przestrzeń robocza nie istnieje lub link jest nieprawidłowy.</p>
          <button onClick={() => router.push('/')} className="mt-6 text-cyan-400 hover:text-white transition-colors">
            Wróć na stronę główną
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-md rounded-2xl bg-gray-800 p-8 text-center shadow-2xl border border-gray-700">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-black/45 mb-6 border border-cyan-500/25 overflow-hidden shadow-2xl shadow-cyan-500/20">
          <img src="/TypeSpace.png" alt="TypeSpace Logo" className="h-full w-full object-cover" />
        </div>
        <h1 className="text-2xl font-bold text-white">Zostałeś zaproszony!</h1>
        <p className="mt-2 text-gray-400">Dołącz do przestrzeni roboczej:</p>
        <h2 className="mt-4 text-3xl font-extrabold text-cyan-400">{workspace.name}</h2>
        
        <div className="mt-8 space-y-4">
          <button
            onClick={() => joinWorkspace.mutate()}
            disabled={joinWorkspace.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 font-semibold text-white hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors shadow-lg hover:shadow-cyan-500/20 active:scale-[0.99]"
          >
            {joinWorkspace.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
            Dołącz do zespołu
          </button>
        </div>
      </div>
    </div>
  );
}
