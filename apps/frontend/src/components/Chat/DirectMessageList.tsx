'use client';

import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';
import { useSocketStore } from '../../store/socket';
import { useAuthStore } from '../../store/auth';

export default function DirectMessageList({ workspaceId, otherUserId }: { workspaceId: string, otherUserId: string }) {
  const { socket } = useSocketStore();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading } = useQuery({
    queryKey: ['dms', workspaceId, otherUserId],
    queryFn: async () => {
      const res = await api.get(`/dms/${workspaceId}/${otherUserId}`);
      return res.data.messages;
    },
    enabled: !!workspaceId && !!otherUserId,
  });

  useEffect(() => {
    if (!socket || !user) return;

    const roomId = [user.id, otherUserId].sort().join('_');

    socket.emit('joinDm', `${workspaceId}_${roomId}`);

    const handleNewDm = (newMessage: any) => {
      if (
        (newMessage.authorId === user.id && newMessage.receiverId === otherUserId) ||
        (newMessage.authorId === otherUserId && newMessage.receiverId === user.id)
      ) {
        queryClient.setQueryData(['dms', workspaceId, otherUserId], (old: any) => {
          if (!old) return [newMessage];
          if (old.some((m: any) => m.id === newMessage.id)) return old;
          return [...old, newMessage];
        });
      }
    };

    socket.on('new_dm', handleNewDm);

    return () => {
      socket.off('new_dm', handleNewDm);
      socket.emit('leaveDm', `${workspaceId}_${roomId}`);
    };
  }, [socket, workspaceId, otherUserId, user, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (isLoading) {
    return <div className="text-gray-500 text-sm">Wczytywanie historii wiadomości...</div>;
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
        <div className="text-6xl">👋</div>
        <p className="text-lg">To początek Waszej prywatnej rozmowy.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {messages.map((msg: any) => (
        <div key={msg.id} className="flex gap-4 group">
          <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-indigo-500/20 flex items-center justify-center overflow-hidden">
            {msg.author.image ? (
              <img src={msg.author.image} alt={msg.author.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-indigo-400 font-bold">{msg.author.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-gray-100">{msg.author.name}</span>
              <span className="text-xs text-gray-500">
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-gray-300 mt-1 break-words">{msg.content}</p>
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
