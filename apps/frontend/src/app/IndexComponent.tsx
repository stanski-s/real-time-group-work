'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/auth';
import { useSocketStore } from '../store/socket';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';
import { MessageSquare, Hash, Plus, Settings, LogOut, Loader2, UserPlus, Trash2, Shield, Check, Users, UserX, Send, Clock } from 'lucide-react';
import MessageList from '../components/Chat/MessageList';
import MessageInput from '../components/Chat/MessageInput';
import DirectMessageList from '../components/Chat/DirectMessageList';
import DirectMessageInput from '../components/Chat/DirectMessageInput';
import ThreadSidebar from '../components/Chat/ThreadSidebar';
import { Workspace, Channel, Message, WorkspaceMember } from '../types';

export default function IndexComponent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, setUser } = useAuthStore();
  const { connect, disconnect, onlineUsers, socket } = useSocketStore();
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [activeDmUserId, setActiveDmUserId] = useState<string | null>(null);
  const [activeThreadMessage, setActiveThreadMessage] = useState<Message | null>(null);
  const [activeThreadType, setActiveThreadType] = useState<'message' | 'directMessage' | null>(null);
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [workspaceViews, setWorkspaceViews] = useState<Record<string, { channelId: string | null; dmUserId: string | null }>>({});
  const [activeView, setActiveView] = useState<'workspace' | 'friends'>('workspace');
  const [friendsTab, setFriendsTab] = useState<'online' | 'all' | 'pending' | 'add'>('online');
  const [friendEmail, setFriendEmail] = useState('');
  const [addFriendStatus, setAddFriendStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<{ id: string; name: string } | null>(null);
  const [friendToDelete, setFriendToDelete] = useState<{ id: string; name: string; email: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    staleTime: 1000 * 60 * 5,
  });

  const { data: friendsData = { friends: [] }, refetch: refetchFriends } = useQuery({
    queryKey: ['friends'],
    queryFn: async () => {
      const res = await api.get('/friends');
      return res.data;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const { data: requestsData = { requests: [] }, refetch: refetchRequests } = useQuery({
    queryKey: ['friends', 'requests'],
    queryFn: async () => {
      const res = await api.get('/friends/requests');
      return res.data;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const { data: conversationsData = { conversations: [] }, refetch: refetchConversations } = useQuery({
    queryKey: ['dms', 'conversations'],
    queryFn: async () => {
      const res = await api.get('/dms/conversations');
      return res.data;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const { data: activeDmUser } = useQuery({
    queryKey: ['users', activeDmUserId],
    queryFn: async () => {
      const res = await api.get(`/dms/user/${activeDmUserId}`);
      return res.data;
    },
    enabled: !!activeDmUserId,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (!socket) return;

    const handleFriendRequest = () => {
      refetchRequests();
    };

    const handleFriendRequestAccepted = () => {
      refetchFriends();
      refetchRequests();
    };

    const handleFriendshipRemoved = () => {
      refetchFriends();
    };

    const handleNewDmGlobally = () => {
      refetchConversations();
    };

    socket.on('friend_request_received', handleFriendRequest);
    socket.on('friend_request_accepted', handleFriendRequestAccepted);
    socket.on('friend_request_declined', handleFriendRequest);
    socket.on('friendship_removed', handleFriendshipRemoved);
    socket.on('new_dm', handleNewDmGlobally);

    return () => {
      socket.off('friend_request_received', handleFriendRequest);
      socket.off('friend_request_accepted', handleFriendRequestAccepted);
      socket.off('friend_request_declined', handleFriendRequest);
      socket.off('friendship_removed', handleFriendshipRemoved);
      socket.off('new_dm', handleNewDmGlobally);
    };
  }, [socket, refetchFriends, refetchRequests, refetchConversations]);

  const createWorkspace = useMutation({
    mutationFn: async (name: string) => {
      const res = await api.post('/workspaces', { name });
      return res.data;
    },
    onSuccess: (data) => {
      setNewWorkspaceName('');
      setIsCreatingWorkspace(false);
      if (data?.workspace?.id) {
        setActiveWorkspaceId(data.workspace.id);
        setActiveView('workspace');
      }
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
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
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      refetch();
    },
    onError: (err: unknown) => {
      console.error(err);
      setErrorMessage((err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Wystąpił błąd przy tworzeniu kanału');
      setIsCreatingChannel(false);
    }
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const targetWorkspaceId = activeWorkspaceId || workspaces?.[0]?.id;
      const res = await api.delete(`/workspaces/${targetWorkspaceId}/members/${memberId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      refetch();
      setMemberToDelete(null);
    },
    onError: (err: unknown) => {
      console.error(err);
      setErrorMessage((err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Wystąpił błąd przy usuwaniu członka');
    }
  });

  const changeRole = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: 'admin' | 'member' }) => {
      const targetWorkspaceId = activeWorkspaceId || workspaces?.[0]?.id;
      const res = await api.patch(`/workspaces/${targetWorkspaceId}/members/${memberId}/role`, { role });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      refetch();
    },
    onError: (err: unknown) => {
      console.error(err);
      setErrorMessage((err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Wystąpił błąd przy zmianie roli');
    }
  });

  const sendFriendRequest = useMutation({
    mutationFn: async (email: string) => {
      const res = await api.post('/friends/request', { email });
      return res.data;
    },
    onSuccess: () => {
      setAddFriendStatus({ type: 'success', message: 'Pomyślnie wysłano zaproszenie do znajomych!' });
      setFriendEmail('');
      queryClient.invalidateQueries({ queryKey: ['friends', 'requests'] });
      refetchRequests();
    },
    onError: (err: any) => {
      const errorMsg = err.response?.data?.error || 'Wystąpił błąd podczas wysyłania zaproszenia';
      setAddFriendStatus({ type: 'error', message: errorMsg });
    }
  });

  const respondToFriendRequest = useMutation({
    mutationFn: async ({ requestId, action }: { requestId: string; action: 'ACCEPT' | 'DECLINE' }) => {
      const res = await api.post(`/friends/request/${requestId}/respond`, { action });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends', 'requests'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      refetchRequests();
      refetchFriends();
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.error || 'Wystąpił błąd przy rozpatrywaniu zaproszenia');
    }
  });

  const removeFriend = useMutation({
    mutationFn: async (friendId: string) => {
      const res = await api.delete(`/friends/${friendId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      refetchFriends();
      if (activeDmUserId && friendToDelete && activeDmUserId === friendToDelete.id) {
        setActiveDmUserId(null);
      }
      setFriendToDelete(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.error || 'Wystąpił błąd przy usuwaniu znajomego');
      setFriendToDelete(null);
    }
  });

  // 1. Initialize active workspace and channel on first load
  useEffect(() => {
    if (workspaces.length > 0 && !activeWorkspaceId) {
      const defaultWorkspaceId = workspaces[0].id;
      setActiveWorkspaceId(defaultWorkspaceId);
      const firstChannelId = workspaces[0].channels?.[0]?.id || null;
      setActiveChannelId(firstChannelId);
    }
  }, [workspaces, activeWorkspaceId]);

  // 2. Track last active channel/DM for each workspace
  useEffect(() => {
    if (activeView === 'friends') return;
    if (!activeWorkspaceId) return;
    
    const currentWorkspace = workspaces.find((w: Workspace) => w.id === activeWorkspaceId);
    if (!currentWorkspace) return;
    
    const isChannelInWorkspace = activeChannelId && currentWorkspace.channels?.some((c: Channel) => c.id === activeChannelId);
    const isDmInWorkspace = activeDmUserId && currentWorkspace.members?.some((m: WorkspaceMember) => m.userId === activeDmUserId);
    
    if (isChannelInWorkspace || isDmInWorkspace || (!activeChannelId && !activeDmUserId)) {
      setWorkspaceViews(prev => ({
        ...prev,
        [activeWorkspaceId]: { channelId: activeChannelId, dmUserId: activeDmUserId }
      }));
    }
  }, [activeChannelId, activeDmUserId, activeWorkspaceId, workspaces, activeView]);

  // 3. Restore or set default channel when switching workspace
  useEffect(() => {
    if (activeView === 'friends') return;
    if (!activeWorkspaceId) return;
    
    const currentWorkspace = workspaces.find((w: Workspace) => w.id === activeWorkspaceId);
    if (!currentWorkspace) return;
    
    const isChannelInWorkspace = activeChannelId && currentWorkspace.channels?.some((c: Channel) => c.id === activeChannelId);
    const isDmInWorkspace = activeDmUserId && currentWorkspace.members?.some((m: WorkspaceMember) => m.userId === activeDmUserId);
    
    if (!isChannelInWorkspace && !isDmInWorkspace) {
      const savedView = workspaceViews[activeWorkspaceId];
      if (savedView) {
        setActiveChannelId(savedView.channelId);
        setActiveDmUserId(savedView.dmUserId);
      } else {
        const firstChannelId = currentWorkspace.channels?.[0]?.id || null;
        setActiveChannelId(firstChannelId);
        setActiveDmUserId(null);
      }
      setActiveThreadMessage(null);
      setActiveThreadType(null);
    }
  }, [activeWorkspaceId, workspaces, workspaceViews, activeChannelId, activeDmUserId, activeView]);

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  const activeWorkspace = workspaces.find((w: Workspace) => w.id === activeWorkspaceId) || workspaces[0];
  
  const activeChannel = activeWorkspace?.channels?.find((c: Channel) => c.id === activeChannelId) 
    || activeWorkspace?.channels?.[0];

  const currentUserMember = activeWorkspace?.members?.find((m: WorkspaceMember) => m.userId === user?.id);
  const isCurrentUserAdmin = currentUserMember?.role === 'admin';

  const friends = friendsData?.friends || [];
  const requests = requestsData?.requests || [];
  
  const isFriend = friends.some((f: any) => f.id === activeDmUserId);
  const isRequestPending = requests.some((r: any) => 
    (r.senderId === user?.id && r.receiverId === activeDmUserId && r.status === 'PENDING') ||
    (r.senderId === activeDmUserId && r.receiverId === user?.id && r.status === 'PENDING')
  );

  const activeConversations = conversationsData?.conversations || [];
  const conversations = [...activeConversations];
  if (activeDmUserId && activeDmUser && !conversations.some((c: any) => c.id === activeDmUserId)) {
    conversations.unshift({
      id: activeDmUser.id,
      name: activeDmUser.name,
      email: activeDmUser.email,
      image: activeDmUser.image
    });
  }

  const pendingReceivedCount = requests.filter((r: any) => r.receiverId === user?.id && r.status === 'PENDING').length;

  const handleStartChat = (friendId: string) => {
    setActiveDmUserId(friendId);
    setActiveChannelId(null);
    setActiveThreadMessage(null);
    setActiveThreadType(null);
    setActiveView('friends');
  };

  if (workspaces.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 p-4">
        <div className="w-full max-w-md rounded-2xl bg-gray-800 p-8 text-center shadow-2xl border border-gray-700">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-black/45 mb-6 border border-cyan-500/25 overflow-hidden shadow-2xl shadow-cyan-500/20">
            <img src="/TypeSpace.png" alt="TypeSpace Logo" className="h-full w-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-white">Witaj w TypeSpace!</h1>
          <p className="mt-2 text-gray-400">Nie należysz jeszcze do żadnej przestrzeni roboczej.</p>
          
          <div className="mt-8 space-y-4">
            <input
              type="text"
              placeholder="Nazwa Twojej nowej firmy"
              className="w-full rounded-xl border border-gray-600 bg-gray-700/50 px-4 py-3 text-white placeholder-gray-450 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
            />
            <button
              onClick={() => createWorkspace.mutate(newWorkspaceName)}
              disabled={!newWorkspaceName || createWorkspace.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 font-semibold text-white hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 transition-colors shadow-lg hover:shadow-cyan-500/20 active:scale-[0.99]"
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
      <div className="w-16 flex-shrink-0 bg-gray-955 flex flex-col items-center py-4 gap-4 border-r border-gray-800/50 shadow-xl z-20">
        {/* Globalny przycisk Znajomi */}
        <button
          onClick={() => setActiveView('friends')}
          className={`relative flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-200 ${
            activeView === 'friends'
              ? 'bg-cyan-600 text-white shadow-lg ring-2 ring-cyan-400 ring-offset-2 ring-offset-gray-950 scale-105'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white hover:scale-105'
          }`}
          title="Znajomi"
        >
          <Users className="h-5 w-5" />
          {pendingReceivedCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-gray-950 animate-pulse">
              {pendingReceivedCount}
            </span>
          )}
        </button>

        {/* Separator */}
        <div className="w-8 h-[2px] bg-gray-800 rounded my-1" />

        {workspaces.map((w: Workspace) => (
          <button
            key={w.id}
            onClick={() => {
              setActiveWorkspaceId(w.id);
              setActiveView('workspace');
            }}
            className={`flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold transition-all duration-200 ${
              activeView === 'workspace' && activeWorkspace?.id === w.id 
                ? 'bg-cyan-600 text-white shadow-lg ring-2 ring-cyan-400 ring-offset-2 ring-offset-gray-955 scale-105' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white hover:scale-105'
            }`}
            title={w.name}
          >
            {w.name.charAt(0).toUpperCase()}
          </button>
        ))}
        <button
          onClick={() => setIsCreatingWorkspace(true)}
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-dashed border-gray-700 text-gray-500 hover:border-gray-450 hover:text-white hover:bg-gray-800 transition-all duration-200 hover:scale-105"
          title="Stwórz nową przestrzeń roboczą"
        >
          <Plus className="h-5 w-5" />
        </button>
        <div className="mt-auto flex flex-col gap-4">
          <button onClick={() => logout.mutate()} title="Wyloguj" className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-800 text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-all duration-200">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Sidebar dla kanałów aktywnego Workspace LUB listy globalnych DMs */}
      <div className="w-64 flex-shrink-0 bg-[#1a1d21] border-r border-gray-800 flex flex-col z-10 shadow-lg">
        {activeView === 'workspace' ? (
          <>
            <div className="flex h-14 items-center justify-between border-b border-gray-850 px-4 hover:bg-gray-800/30 cursor-pointer transition-colors">
              <h2 className="font-bold text-white text-lg truncate">{activeWorkspace?.name}</h2>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(`http://localhost:3001/join/${activeWorkspace?.id}`);
                    setCopiedInvite(true);
                    setTimeout(() => setCopiedInvite(false), 2000);
                  }}
                  title={copiedInvite ? undefined : "Zaproś znajomych"} 
                  className="relative text-gray-400 hover:text-white transition-colors p-1.5 rounded hover:bg-gray-800/60"
                >
                  {copiedInvite && (
                    <div className="absolute top-full right-0 mt-2 px-2.5 py-1 text-xs font-semibold text-white bg-cyan-600 rounded-md shadow-lg whitespace-nowrap z-50 animate-fade-in-up">
                      Skopiowano link!
                      <div className="absolute bottom-full right-2 -mb-1 border-4 border-transparent border-b-cyan-600"></div>
                    </div>
                  )}
                  {copiedInvite ? (
                    <Check className="h-4.5 w-4.5 text-green-400 transition-all duration-200 scale-110" />
                  ) : (
                    <UserPlus className="h-4.5 w-4.5" />
                  )}
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto py-4 px-3">
              <div className="flex items-center justify-between group mb-2 cursor-pointer">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-300 transition-colors">Kanały</h3>
                {isCurrentUserAdmin && (
                  <button 
                    onClick={() => setIsCreatingChannel(true)}
                    className="text-gray-400 hover:text-white transition-colors p-0.5 rounded hover:bg-gray-800"
                    title="Dodaj kanał"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              <div className="space-y-[2px]">
                {activeWorkspace?.channels?.map((channel: Channel) => (
                  <button 
                    key={channel.id}
                    onClick={() => {
                      setActiveChannelId(channel.id);
                      setActiveDmUserId(null);
                      setActiveThreadMessage(null);
                      setActiveThreadType(null);
                      setActiveView('workspace');
                    }}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[15px] font-medium transition-colors ${
                      activeView === 'workspace' && activeChannelId === channel.id
                        ? 'bg-cyan-500/10 text-cyan-300'
                        : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                    }`}
                  >
                    <Hash className="h-4 w-4 opacity-70" />
                    <span>{channel.name}</span>
                  </button>
                ))}
                {isCreatingChannel && (
                  <div className="px-2 mt-4">
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
                      placeholder="nowy-kanał"
                      disabled={createChannel.isPending}
                      className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded px-2 py-1 focus:outline-none focus:border-cyan-500 shadow-inner"
                    />
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex h-14 items-center border-b border-gray-850 px-4">
              <h2 className="font-bold text-white text-base truncate">Prywatne wiadomości</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto py-4 px-2 space-y-4">
              <button
                onClick={() => {
                  setActiveDmUserId(null);
                  setActiveThreadMessage(null);
                  setActiveThreadType(null);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  activeDmUserId === null
                    ? 'bg-cyan-600 text-white shadow-lg'
                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Znajomi</span>
              </button>

              <button
                onClick={() => {
                  if (user?.id) {
                    setActiveDmUserId(user.id);
                    setActiveChannelId(null);
                    setActiveThreadMessage(null);
                    setActiveThreadType(null);
                  }
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  activeDmUserId === user?.id
                    ? 'bg-cyan-600 text-white shadow-lg'
                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                }`}
              >
                <div className="relative flex-shrink-0">
                  <div className={`h-5 w-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                    activeDmUserId === user?.id ? 'bg-white/20 text-white' : 'bg-cyan-500/15 text-cyan-400'
                  }`}>
                    {user?.image ? (
                      <img src={user.image} alt={user.name || ''} className="h-full w-full rounded-md object-cover" />
                    ) : (
                      (user?.name ? user.name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || '')
                    )}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border ${
                    activeDmUserId === user?.id ? 'border-cyan-650 bg-green-500' : 'border-[#1a1d21] bg-green-500'
                  }`} />
                </div>
                <span className="truncate">{user?.name || user?.email} (Ty)</span>
              </button>

              <div className="h-px bg-gray-800/60 my-2 mx-2" />

              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2 px-3">
                  Wiadomości bezpośrednie
                </h3>
                <div className="space-y-[2px]">
                  {conversations.filter((chat: any) => chat.id !== user?.id).map((chat: any) => (
                    <button
                      key={chat.id}
                      onClick={() => {
                        setActiveDmUserId(chat.id);
                        setActiveChannelId(null);
                        setActiveThreadMessage(null);
                        setActiveThreadType(null);
                      }}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors border ${
                        activeDmUserId === chat.id
                          ? 'bg-gray-800/60 text-white border-gray-700/50'
                          : 'text-gray-400 hover:bg-gray-800/30 hover:text-gray-200 border-transparent'
                      }`}
                    >
                      <div className="relative flex-shrink-0">
                        <div className="h-7 w-7 rounded-lg bg-cyan-500/15 flex items-center justify-center">
                          {chat.image ? (
                            <img src={chat.image} alt={chat.name} className="h-full w-full rounded-lg object-cover" />
                          ) : (
                            <span className="text-cyan-400 font-bold text-xs">{chat.name ? chat.name.charAt(0).toUpperCase() : chat.email.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-[#1a1d21] ${
                          onlineUsers.includes(chat.id) ? 'bg-green-500' : 'bg-gray-500'
                        }`} />
                      </div>
                      <span className="truncate">{chat.name || chat.email}</span>
                    </button>
                  ))}
                  {conversations.filter((chat: any) => chat.id !== user?.id).length === 0 && (
                    <div className="text-[11px] text-gray-500 px-3 py-2 italic font-medium">Brak aktywnych konwersacji.</div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {activeView === 'friends' && activeDmUserId === null ? (
        <div className="flex flex-1 flex-col bg-[#1a1d21]">
          {/* Header paska znajomych */}
          <div className="flex h-14 items-center justify-between border-b border-gray-850 px-6 shadow-sm flex-shrink-0">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-400" />
              <h2 className="font-bold text-white text-base">Znajomi</h2>
              <div className="h-4 w-[1px] bg-gray-800 mx-2" />
              
              {/* Zakładki */}
              <div className="flex gap-1 text-sm font-medium">
                <button
                  onClick={() => setFriendsTab('online')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    friendsTab === 'online'
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                  }`}
                >
                  Aktywni
                </button>
                <button
                  onClick={() => setFriendsTab('all')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    friendsTab === 'all'
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                  }`}
                >
                  Wszyscy
                </button>
                <button
                  onClick={() => setFriendsTab('pending')}
                  className={`relative px-3 py-1.5 rounded-lg transition-colors ${
                    friendsTab === 'pending'
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                  }`}
                >
                  Oczekujące
                  {pendingReceivedCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-1 ring-gray-955">
                      {pendingReceivedCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setFriendsTab('add')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                    friendsTab === 'add'
                      ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                      : 'text-green-500 hover:bg-green-600/10'
                  }`}
                >
                  Dodaj znajomego
                </button>
              </div>
            </div>
          </div>
          
          {/* Główna treść zakładki */}
          <div className="flex-1 overflow-y-auto p-6">
            {friendsTab === 'online' && (
              <div className="space-y-2 max-w-4xl">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
                  Aktywni znajomi — {friends.filter((f: any) => onlineUsers.includes(f.id)).length}
                </div>
                {friends.filter((f: any) => onlineUsers.includes(f.id)).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <div className="h-16 w-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-4">
                      <Users className="h-8 w-8 text-cyan-400/60" />
                    </div>
                    <p className="text-gray-400 text-sm font-sans">Nikt ze znajomych nie jest teraz aktywny.</p>
                  </div>
                ) : (
                  friends.filter((f: any) => onlineUsers.includes(f.id)).map((friend: any) => (
                    <div key={friend.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-800/20 border border-gray-855 hover:bg-gray-800/50 hover:border-gray-700/50 transition-all duration-200 group">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="h-10 w-10 rounded-xl bg-cyan-500/15 flex items-center justify-center font-bold text-cyan-400 text-sm">
                            {friend.image ? (
                              <img src={friend.image} alt={friend.name} className="h-full w-full rounded-xl object-cover" />
                            ) : (
                              friend.name ? friend.name.charAt(0).toUpperCase() : friend.email.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-[#1a1d21] bg-green-500"></div>
                        </div>
                        <div>
                          <div className="font-semibold text-white text-sm flex items-center gap-2">
                            {friend.name || 'Użytkownik bez nazwy'}
                          </div>
                          <div className="text-xs text-gray-450">{friend.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleStartChat(friend.id)}
                          className="p-2 rounded-lg bg-gray-800 hover:bg-gray-750 text-gray-300 hover:text-white transition-colors"
                          title="Rozpocznij czat"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setFriendToDelete({
                              id: friend.id,
                              name: friend.name || '',
                              email: friend.email
                            });
                          }}
                          className="p-2 rounded-lg bg-gray-800 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                          title="Usuń znajomego"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
            
            {friendsTab === 'all' && (
              <div className="space-y-2 max-w-4xl">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
                  Wszyscy znajomi — {friends.length}
                </div>
                {friends.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <div className="h-16 w-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-4">
                      <Users className="h-8 w-8 text-cyan-400/60" />
                    </div>
                    <p className="text-gray-400 text-sm font-sans">Nie masz jeszcze żadnych znajomych.</p>
                    <button
                      onClick={() => setFriendsTab('add')}
                      className="mt-4 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors font-sans"
                    >
                      Dodaj pierwszego znajomego
                    </button>
                  </div>
                ) : (
                  friends.map((friend: any) => {
                    const isOnline = onlineUsers.includes(friend.id);
                    return (
                      <div key={friend.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-800/20 border border-gray-855 hover:bg-gray-800/50 hover:border-gray-700/50 transition-all duration-200 group">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="h-10 w-10 rounded-xl bg-cyan-500/15 flex items-center justify-center font-bold text-cyan-400 text-sm">
                              {friend.image ? (
                                <img src={friend.image} alt={friend.name} className="h-full w-full rounded-xl object-cover" />
                              ) : (
                                friend.name ? friend.name.charAt(0).toUpperCase() : friend.email.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-[#1a1d21] ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                          </div>
                          <div>
                            <div className="font-semibold text-white text-sm flex items-center gap-2">
                              {friend.name || 'Użytkownik bez nazwy'}
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isOnline ? 'bg-green-500/10 text-green-400' : 'bg-gray-850 text-gray-400'}`}>
                                {isOnline ? 'aktywny' : 'nieaktywny'}
                              </span>
                            </div>
                            <div className="text-xs text-gray-450">{friend.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleStartChat(friend.id)}
                            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-750 text-gray-300 hover:text-white transition-colors"
                            title="Rozpocznij czat"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setFriendToDelete({
                                id: friend.id,
                                name: friend.name || '',
                                email: friend.email
                              });
                            }}
                            className="p-2 rounded-lg bg-gray-800 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                            title="Usuń znajomego"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
            
            {friendsTab === 'pending' && (
              <div className="space-y-6 max-w-4xl">
                {requests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <div className="h-16 w-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-4">
                      <Clock className="h-8 w-8 text-cyan-400/60" />
                    </div>
                    <p className="text-gray-400 text-sm font-sans">Brak oczekujących zaproszeń.</p>
                  </div>
                ) : (
                  <>
                    {requests.filter((r: any) => r.receiverId === user?.id && r.status === 'PENDING').length > 0 && (
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                          Otrzymane zaproszenia — {requests.filter((r: any) => r.receiverId === user?.id && r.status === 'PENDING').length}
                        </div>
                        <div className="space-y-2">
                          {requests.filter((r: any) => r.receiverId === user?.id && r.status === 'PENDING').map((req: any) => (
                            <div key={req.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-800/20 border border-gray-855 hover:bg-gray-800/50 hover:border-gray-700/50 transition-all group">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-cyan-500/15 flex items-center justify-center font-bold text-cyan-400 text-sm">
                                  {req.sender.image ? (
                                    <img src={req.sender.image} alt={req.sender.name} className="h-full w-full rounded-xl object-cover" />
                                  ) : (
                                    req.sender.name ? req.sender.name.charAt(0).toUpperCase() : req.sender.email.charAt(0).toUpperCase()
                                  )}
                                </div>
                                <div>
                                  <div className="font-semibold text-white text-sm">{req.sender.name || 'Użytkownik bez nazwy'}</div>
                                  <div className="text-xs text-gray-455">{req.sender.email}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => respondToFriendRequest.mutate({ requestId: req.id, action: 'ACCEPT' })}
                                  disabled={respondToFriendRequest.isPending}
                                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white transition-colors"
                                  title="Akceptuj"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => respondToFriendRequest.mutate({ requestId: req.id, action: 'DECLINE' })}
                                  disabled={respondToFriendRequest.isPending}
                                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white transition-colors"
                                  title="Odrzuć"
                                >
                                  <UserX className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {requests.filter((r: any) => r.senderId === user?.id && r.status === 'PENDING').length > 0 && (
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                          Wysłane zaproszenia — {requests.filter((r: any) => r.senderId === user?.id && r.status === 'PENDING').length}
                        </div>
                        <div className="space-y-2">
                          {requests.filter((r: any) => r.senderId === user?.id && r.status === 'PENDING').map((req: any) => (
                            <div key={req.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-800/10 border border-gray-855 hover:bg-gray-800/20 hover:border-gray-700/50 transition-all">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-gray-850 flex items-center justify-center font-bold text-gray-400 text-sm">
                                  {req.receiver.image ? (
                                    <img src={req.receiver.image} alt={req.receiver.name} className="h-full w-full rounded-xl object-cover" />
                                  ) : (
                                    req.receiver.name ? req.receiver.name.charAt(0).toUpperCase() : req.receiver.email.charAt(0).toUpperCase()
                                  )}
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-300 text-sm">{req.receiver.name || 'Użytkownik bez nazwy'}</div>
                                  <div className="text-xs text-gray-500">{req.receiver.email}</div>
                                </div>
                              </div>
                              <div>
                                <button
                                  onClick={() => respondToFriendRequest.mutate({ requestId: req.id, action: 'DECLINE' })}
                                  disabled={respondToFriendRequest.isPending}
                                  className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-750 text-gray-400 hover:text-white text-xs font-medium transition-colors"
                                  title="Anuluj zaproszenie"
                                >
                                  Anuluj
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            
            {friendsTab === 'add' && (
              <div className="max-w-md font-sans">
                <h3 className="text-base font-bold text-white mb-1">DODAJ ZNAJOMEGO</h3>
                <p className="text-xs text-gray-400 mb-6">
                  Możesz dodać znajomego przy użyciu jego adresu e-mail. Pamiętaj o wielkości liter!
                </p>
                
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const trimmedEmail = friendEmail.trim();
                    if (trimmedEmail.toLowerCase() === user?.email?.toLowerCase()) {
                      setAddFriendStatus({ type: 'error', message: 'Nie możesz wysłać zaproszenia do samego siebie' });
                      return;
                    }
                    if (trimmedEmail && !sendFriendRequest.isPending) {
                      sendFriendRequest.mutate(trimmedEmail);
                    }
                  }}
                  className="space-y-4"
                >
                  <div className="relative flex items-center">
                    <input
                      type="email"
                      placeholder="Wpisz adres e-mail znajomego..."
                      value={friendEmail}
                      onChange={(e) => {
                        setFriendEmail(e.target.value);
                        if (addFriendStatus) setAddFriendStatus(null);
                      }}
                      className="w-full bg-gray-900 border border-gray-700 focus:border-cyan-500 text-gray-200 text-sm rounded-xl px-4 py-3.5 outline-none shadow-inner transition-all duration-200 focus:shadow-[0_0_15px_rgba(6,182,212,0.15)] placeholder-gray-500"
                      required
                    />
                    <button
                      type="submit"
                      disabled={!friendEmail.trim() || sendFriendRequest.isPending}
                      className="absolute right-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {sendFriendRequest.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Send className="h-3 w-3" />
                      )}
                      Wyślij
                    </button>
                  </div>
                  
                  {addFriendStatus && (
                    <div
                      className={`p-3 rounded-lg text-xs font-medium ${
                        addFriendStatus.type === 'success'
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      } animate-fade-in`}
                    >
                      {addFriendStatus.message}
                    </div>
                  )}
                </form>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 bg-[#1a1d21] overflow-hidden">
          {/* Główny obszar wiadomości czatu */}
          <div className="flex flex-1 flex-col min-w-0">
            {/* Header czatu */}
            <div className="flex h-14 items-center border-b border-gray-850 px-6 shadow-sm flex-shrink-0">
              {activeChannelId ? (
                <>
                  <Hash className="h-5 w-5 text-gray-400 mr-2" />
                  <h2 className="font-bold text-white text-base">{activeChannel?.name}</h2>
                </>
              ) : activeDmUserId && activeDmUser ? (
                <>
                  <div className="relative flex-shrink-0 mr-2">
                    <div className="h-6 w-6 rounded bg-cyan-500/15 flex items-center justify-center">
                      {activeDmUser.image ? (
                        <img src={activeDmUser.image} alt={activeDmUser.name} className="h-full w-full rounded object-cover" />
                      ) : (
                        <span className="text-cyan-400 font-bold text-xs">
                          {activeDmUser.name ? activeDmUser.name.charAt(0).toUpperCase() : activeDmUser.email.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-[#1a1d21] ${
                      onlineUsers.includes(activeDmUserId) ? 'bg-green-500' : 'bg-gray-500'
                    }`} />
                  </div>
                  <div className="flex flex-col">
                    <h2 className="font-bold text-white text-sm leading-tight">
                      {activeDmUser.name || activeDmUser.email}
                    </h2>
                    <span className="text-[10px] text-gray-400">
                      {onlineUsers.includes(activeDmUserId) ? 'Aktywny(a)' : 'Niedostępny(a)'}
                    </span>
                  </div>
                </>
              ) : null}
            </div>
            
            {/* Lista wiadomości */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col-reverse">
              {activeChannelId && <MessageList channelId={activeChannelId} onReply={(msg) => { setActiveThreadMessage(msg); setActiveThreadType('message'); }} />}
              {activeDmUserId && <DirectMessageList otherUserId={activeDmUserId} onReply={(msg) => { setActiveThreadMessage(msg); setActiveThreadType('directMessage'); }} />}
            </div>

            {/* Input wiadomości */}
            {activeChannelId && <MessageInput channelId={activeChannelId} />}
            {activeDmUserId && <DirectMessageInput otherUserId={activeDmUserId} />}
          </div>

          {/* Prawy Sidebar dla Członków LUB Wątku LUB Profilu Znajomego */}
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
          ) : activeView === 'friends' && activeDmUserId && activeDmUser ? (
            /* Dedykowany prawy sidebar dla profilu użytkownika w DMs */
            <div className="w-60 flex-shrink-0 bg-[#1a1d21] border-l border-gray-800 flex flex-col z-10 shadow-lg hidden lg:flex">
              <div className="flex h-14 items-center border-b border-gray-850 px-4">
                <h2 className="font-bold text-white text-base">
                  {isFriend ? 'Profil znajomego' : 'Profil użytkownika'}
                </h2>
              </div>
            
              <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col items-center text-center space-y-4">
                <div className="relative">
                  <div className="h-20 w-20 rounded-2xl bg-cyan-500/15 flex items-center justify-center text-3xl font-bold text-cyan-400">
                    {activeDmUser.image ? (
                      <img src={activeDmUser.image} alt={activeDmUser.name} className="h-full w-full rounded-2xl object-cover" />
                    ) : (
                      activeDmUser.name ? activeDmUser.name.charAt(0).toUpperCase() : activeDmUser.email.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-[#1a1d21] ${
                    onlineUsers.includes(activeDmUserId) ? 'bg-green-500' : 'bg-gray-500'
                  }`} />
                </div>

                <div className="space-y-1">
                  <h3 className="font-bold text-white text-lg leading-tight truncate w-48">
                    {activeDmUser.name || 'Użytkownik bez nazwy'}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {onlineUsers.includes(activeDmUserId) ? 'Aktywny(a)' : 'Niedostępny(a)'}
                  </p>
                </div>

                <div className="w-full h-[1px] bg-gray-800 my-2" />

                <div className="w-full space-y-3 text-left">
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-0.5">Adres e-mail</h4>
                    <p className="text-sm text-gray-300 truncate">{activeDmUser.email}</p>
                  </div>
                  
                  {activeDmUserId !== user?.id && (
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-0.5 font-sans">Zarządzanie relacjami</h4>
                      {isFriend ? (
                        <button
                          onClick={() => {
                            setFriendToDelete({
                              id: activeDmUser.id,
                              name: friendToDelete ? friendToDelete.name : (activeDmUser.name || ''),
                              email: activeDmUser.email
                            });
                          }}
                          disabled={removeFriend.isPending}
                          className="mt-2 flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-semibold w-full justify-center transition-colors"
                        >
                          {removeFriend.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserX className="h-3.5 w-3.5" />}
                          Usuń ze znajomych
                        </button>
                      ) : isRequestPending ? (
                        <div className="mt-2 flex items-center gap-1.5 px-3 py-2 bg-gray-800 text-gray-400 border border-gray-700 rounded-lg text-xs font-semibold w-full justify-center">
                          <Clock className="h-3.5 w-3.5" />
                          Zaproszenie oczekujące…
                        </div>
                      ) : (
                        <button
                          onClick={() => sendFriendRequest.mutate(activeDmUser.email)}
                          disabled={sendFriendRequest.isPending}
                          className="mt-2 flex items-center gap-1.5 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold w-full justify-center transition-colors shadow-md hover:shadow-cyan-500/20"
                        >
                          {sendFriendRequest.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                          Wyślij zaproszenie
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Standardowy prawy sidebar dla członków workspace */
            <div className="w-64 flex-shrink-0 bg-[#1a1d21] border-l border-gray-800 flex flex-col z-10 shadow-lg hidden lg:flex">
              <div className="flex h-14 items-center border-b border-gray-850 px-4">
                <h2 className="font-bold text-white text-base">Członkowie zespołu</h2>
              </div>
            
              <div className="flex-1 overflow-y-auto py-4 px-3 space-y-2">
                {activeWorkspace?.members?.map((m: WorkspaceMember) => (
                  <div 
                    key={m.id} 
                    onClick={() => {
                      setActiveChannelId(null);
                      setActiveDmUserId(m.userId);
                      setActiveThreadMessage(null);
                      setActiveThreadType(null);
                      setActiveView('friends');
                    }}
                    className={`flex items-center gap-3 p-2 rounded-md hover:bg-gray-800/50 cursor-pointer transition-colors group ${activeDmUserId === m.userId ? 'bg-gray-800/50 ring-1 ring-gray-700' : ''}`}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="h-8 w-8 rounded-lg bg-cyan-500/15 flex items-center justify-center">
                        {m.user.image ? (
                          <img src={m.user.image} alt={m.user.name} className="h-full w-full rounded-lg object-cover" />
                        ) : (
                          <span className="text-cyan-400 font-bold text-sm">{m.user.name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      {/* Kropka statusu Online/Offline */}
                      <div className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-[#1a1d21] transition-colors ${onlineUsers.includes(m.userId) ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                    </div>
                    <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                      <span className="text-gray-300 text-sm font-medium group-hover:text-white transition-colors truncate">{m.user.name} {m.userId === user?.id && '(Ty)'}</span>
                      
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isCurrentUserAdmin && m.userId !== user?.id ? (
                          <select
                            value={m.role}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation();
                              changeRole.mutate({ memberId: m.id, role: e.target.value as 'admin' | 'member' });
                            }}
                            disabled={changeRole.isPending}
                            className="text-[11px] bg-gray-800 text-gray-300 border border-gray-700 rounded px-1 py-0.5 font-medium outline-none focus:border-cyan-500 transition-colors"
                          >
                            <option value="member">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          m.role === 'admin' && (
                            <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider">Admin</span>
                          )
                        )}

                        {isCurrentUserAdmin && m.userId !== user?.id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMemberToDelete({ id: m.id, name: m.user.name });
                            }}
                            disabled={removeMember.isPending}
                            className="text-gray-500 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                            title="Usuń użytkownika z workspace"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal tworzenia nowego Workspace */}
      {isCreatingWorkspace && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="w-full max-w-md bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-2xl mx-4 transform transition-all animate-scale-up">
            <h3 className="text-xl font-bold text-white mb-2 font-sans">Stwórz nową przestrzeń roboczą</h3>
            <p className="text-sm text-gray-400 mb-6 font-sans">
              Przestrzeń robocza to miejsce, gdzie Twój zespół komunikuje się w kanałach i wiadomościach prywatnych.
            </p>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="np. Projekt Alpha, Marketing"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                autoFocus
                className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:border-cyan-500 shadow-inner font-sans"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newWorkspaceName.trim() && !createWorkspace.isPending) {
                    createWorkspace.mutate(newWorkspaceName);
                  }
                  if (e.key === 'Escape') {
                    setIsCreatingWorkspace(false);
                    setNewWorkspaceName('');
                  }
                }}
              />
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingWorkspace(false);
                    setNewWorkspaceName('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white rounded-lg hover:bg-gray-700/50 transition-colors font-sans"
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  disabled={!newWorkspaceName.trim() || createWorkspace.isPending}
                  onClick={() => createWorkspace.mutate(newWorkspaceName)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg disabled:opacity-50 disabled:hover:bg-cyan-600 transition-colors font-sans shadow-md hover:shadow-cyan-500/20"
                >
                  {createWorkspace.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Stwórz przestrzeń
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal potwierdzenia usunięcia użytkownika */}
      {memberToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="w-full max-w-md bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-2xl mx-4 transform transition-all animate-scale-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-bold text-white font-sans">Usuń członka zespołu</h3>
            </div>
            
            <p className="text-sm text-gray-300 mb-6 font-sans leading-relaxed">
              Czy na pewno chcesz usunąć użytkownika <span className="font-bold text-white">{memberToDelete.name}</span> z tej przestrzeni roboczej? Straci on dostęp do wszystkich kanałów i wiadomości w tej przestrzeni.
            </p>

            <div className="flex justify-end gap-3 font-sans">
              <button
                type="button"
                onClick={() => setMemberToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white rounded-lg hover:bg-gray-700/50 transition-colors"
                disabled={removeMember.isPending}
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={() => removeMember.mutate(memberToDelete.id)}
                disabled={removeMember.isPending}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg disabled:opacity-50 transition-colors"
              >
                {removeMember.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Usuń użytkownika
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal potwierdzenia usunięcia znajomego */}
      {friendToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="w-full max-w-md bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-2xl mx-4 transform transition-all animate-scale-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
                <UserX className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-bold text-white font-sans">Usuń ze znajomych</h3>
            </div>
            
            <p className="text-sm text-gray-300 mb-6 font-sans leading-relaxed">
              Czy na pewno chcesz usunąć użytkownika <span className="font-bold text-white">{friendToDelete.name || friendToDelete.email}</span> ze znajomych? Ta operacja zakończy wasze połączenie, ale możecie wysłać ponowne zaproszenie w przyszłości.
            </p>

            <div className="flex justify-end gap-3 font-sans">
              <button
                type="button"
                onClick={() => setFriendToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white rounded-lg hover:bg-gray-700/50 transition-colors"
                disabled={removeFriend.isPending}
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={() => removeFriend.mutate(friendToDelete.id)}
                disabled={removeFriend.isPending}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg disabled:opacity-50 transition-colors"
              >
                {removeFriend.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Usuń ze znajomych
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ogólnych błędów / powiadomień */}
      {errorMessage && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="w-full max-w-md bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-2xl mx-4 transform transition-all animate-scale-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
                <Shield className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-bold text-white font-sans">Wystąpił błąd</h3>
            </div>
            
            <p className="text-sm text-gray-300 mb-6 font-sans leading-relaxed">
              {errorMessage}
            </p>

            <div className="flex justify-end font-sans">
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl transition-all shadow-lg hover:shadow-cyan-500/20 active:scale-95"
              >
                Rozumiem
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
