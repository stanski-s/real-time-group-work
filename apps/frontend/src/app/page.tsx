'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/auth';
import { useSocketStore } from '../store/socket';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../lib/axios';
import { MessageSquare, Hash, Plus, Settings, LogOut, Loader2, UserPlus } from 'lucide-react';
import MessageList from '../components/Chat/MessageList';
import MessageInput from '../components/Chat/MessageInput';
import DirectMessageList from '../components/Chat/DirectMessageList';
import DirectMessageInput from '../components/Chat/DirectMessageInput';
import ThreadSidebar from '../components/Chat/ThreadSidebar';

export default function Index() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const { connect, disconnect, onlineUsers } = useSocketStore();
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [activeDmUserId, setActiveDmUserId] = useState<string | null>(null);
  const [activeThreadMessage, setActiveThreadMessage] = useState<any>(null);
  const [activeThreadType, setActiveThreadType] = useState<'message' | 'directMessage' | null>(null);
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
    } else {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [user, router, connect, disconnect]);

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

  const createChannel = useMutation({
    mutationFn: async (name: string) => {
      const targetWorkspaceId = activeWorkspaceId || workspaces?.[0]?.id;
      const res = await api.post('/channels', { name, workspaceId: targetWorkspaceId });
      return res.data;
    },
    onSuccess: (data) => {
      setNewChannelName('');
      setIsCreatingChannel(false);
      setActiveChannelId(data.channel.id);
      refetch();
    },
    onError: (err: any) => {
      console.error(err);
      alert(err.response?.data?.error || 'Wystąpił błąd przy tworzeniu kanału');
      setIsCreatingChannel(false);
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
  
  const activeChannel = activeWorkspace?.channels?.find((c: any) => c.id === activeChannelId) 
    || activeWorkspace?.channels?.[0];

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
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                navigator.clipboard.writeText(`http://localhost:3001/join/${activeWorkspace?.id}`);
                alert('Skopiowano link z zaproszeniem do schowka!');
              }}
              title="Zaproś znajomych" 
              className="text-gray-400 hover:text-white transition-colors"
            >
              <UserPlus className="h-4 w-4" />
            </button>
            <button className="text-gray-400 hover:text-white transition-colors">
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 px-3">
          <div className="flex items-center justify-between group mb-2 cursor-pointer">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-300 transition-colors">Kanały</h3>
            <button 
              onClick={() => setIsCreatingChannel(true)}
              className="text-gray-500 opacity-0 group-hover:opacity-100 hover:text-white transition-opacity"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          
          <div className="space-y-[2px]">
            {activeWorkspace?.channels?.map((channel: any) => (
              <button 
                key={channel.id}
                onClick={() => {
                  setActiveChannelId(channel.id);
                  setActiveDmUserId(null);
                  setActiveThreadMessage(null);
                  setActiveThreadType(null);
                }}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[15px] font-medium transition-colors ${
                  activeChannel?.id === channel.id
                    ? 'bg-indigo-500/10 text-indigo-300'
                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                }`}
              >
                <Hash className="h-4 w-4 opacity-70" />
                <span>{channel.name}</span>
              </button>
            ))}
            {isCreatingChannel && (
              <div className="px-2 mt-2">
                <input 
                  autoFocus
                  type="text" 
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newChannelName.trim() && !createChannel.isPending) {
                      createChannel.mutate(newChannelName);
                    }
                    if (e.key === 'Escape') setIsCreatingChannel(false);
                  }}
                  onBlur={() => {
                    if (!createChannel.isPending) {
                      setIsCreatingChannel(false);
                    }
                  }}
                  placeholder="nowy-kanal"
                  disabled={createChannel.isPending}
                  className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded px-2 py-1 focus:outline-none focus:border-indigo-500 shadow-inner"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Główne okno czatu */}
      <div className="flex flex-1 flex-col bg-[#1a1d21]">
        <div className="flex h-14 items-center border-b border-gray-800/50 px-6 shadow-sm">
          {activeChannelId ? (
            <>
              <Hash className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="font-bold text-white text-base">{activeChannel?.name}</h2>
            </>
          ) : activeDmUserId ? (
            <>
              <div className="h-6 w-6 rounded bg-indigo-500/20 flex items-center justify-center mr-2">
                <span className="text-indigo-400 font-bold text-xs">
                  {activeWorkspace?.members?.find((m: any) => m.userId === activeDmUserId)?.user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <h2 className="font-bold text-white text-base">
                {activeWorkspace?.members?.find((m: any) => m.userId === activeDmUserId)?.user.name} {activeDmUserId === user?.id && '(Ty)'}
              </h2>
            </>
          ) : null}
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 flex flex-col-reverse">
          {activeChannelId && <MessageList channelId={activeChannelId} onReply={(msg) => { setActiveThreadMessage(msg); setActiveThreadType('message'); }} />}
          {activeDmUserId && activeWorkspace?.id && <DirectMessageList workspaceId={activeWorkspace.id} otherUserId={activeDmUserId} onReply={(msg) => { setActiveThreadMessage(msg); setActiveThreadType('directMessage'); }} />}
        </div>

        {activeChannelId && <MessageInput channelId={activeChannelId} />}
        {activeDmUserId && activeWorkspace?.id && <DirectMessageInput workspaceId={activeWorkspace.id} otherUserId={activeDmUserId} />}
      </div>

      {/* Prawy Sidebar dla Członków LUB Wątku */}
      {activeThreadMessage && activeThreadType ? (
        <ThreadSidebar
          message={activeThreadMessage}
          entityType={activeThreadType}
          channelId={activeChannelId || undefined}
          workspaceId={activeWorkspaceId || undefined}
          otherUserId={activeDmUserId || undefined}
          onClose={() => {
            setActiveThreadMessage(null);
            setActiveThreadType(null);
          }}
        />
      ) : (
        <div className="w-64 flex-shrink-0 bg-[#1a1d21] border-l border-gray-800 flex flex-col z-10 shadow-lg hidden lg:flex">
          <div className="flex h-14 items-center border-b border-gray-800/50 px-4">
            <h2 className="font-bold text-white text-base">Członkowie zespołu</h2>
          </div>
        
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-2">
          {activeWorkspace?.members?.map((m: any) => (
            <div 
              key={m.id} 
              onClick={() => {
                setActiveChannelId(null);
                setActiveDmUserId(m.userId);
                setActiveThreadMessage(null);
                setActiveThreadType(null);
              }}
              className={`flex items-center gap-3 p-2 rounded-md hover:bg-gray-800/50 cursor-pointer transition-colors group ${activeDmUserId === m.userId ? 'bg-gray-800/50 ring-1 ring-gray-700' : ''}`}
            >
              <div className="relative">
                <div className="h-8 w-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                  {m.user.image ? (
                    <img src={m.user.image} alt={m.user.name} className="h-full w-full rounded-lg object-cover" />
                  ) : (
                    <span className="text-indigo-400 font-bold text-sm">{m.user.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                {/* Kropka statusu Online/Offline */}
                <div className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-[#1a1d21] transition-colors ${onlineUsers.includes(m.userId) ? 'bg-green-500' : 'bg-gray-500'}`}></div>
              </div>
              <span className="text-gray-300 text-sm font-medium group-hover:text-white transition-colors">{m.user.name}</span>
            </div>
          ))}
        </div>
      </div>
      )}
    </div>
  );
}
