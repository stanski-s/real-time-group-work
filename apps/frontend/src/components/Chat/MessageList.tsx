'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSocketStore } from '../../store/socket';
import api from '../../lib/axios';

interface MessageListProps {
  channelId: string;
}

export default function MessageList({ channelId }: MessageListProps) {
  const queryClient = useQueryClient();
  const { socket, joinChannel, leaveChannel } = useSocketStore();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', channelId],
    queryFn: async () => {
      const res = await api.get(`/messages/${channelId}`);
      return res.data.messages;
    },
  });

  useEffect(() => {
    if (!socket) return;

    joinChannel(channelId);

    const handleNewMessage = (message: any) => {
      queryClient.setQueryData(['messages', channelId], (oldData: any) => {
        if (!oldData) return [message];
        if (oldData.find((m: any) => m.id === message.id)) return oldData;
        return [...oldData, message];
      });
    };

    socket.on('new_message', handleNewMessage);

    return () => {
      socket.off('new_message', handleNewMessage);
      leaveChannel(channelId);
    };
  }, [channelId, socket, joinChannel, leaveChannel, queryClient]);

  if (isLoading) return <div className="text-gray-500">Ładowanie wiadomości...</div>;

  return (
    <div className="space-y-6">
      {messages.map((msg: any) => (
        <div key={msg.id} className="flex items-start gap-4 hover:bg-gray-800/30 p-2 rounded-lg transition-colors">
          <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-indigo-500/20 flex items-center justify-center">
            {msg.author.image ? (
              <img src={msg.author.image} alt={msg.author.name} className="h-full w-full rounded-xl object-cover" />
            ) : (
              <span className="text-indigo-400 font-bold">{msg.author.name?.charAt(0).toUpperCase() || '?'}</span>
            )}
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-gray-200">{msg.author.name}</span>
              <span className="text-xs text-gray-500">
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-gray-300 mt-1">{msg.content}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
