'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSocketStore } from '../../store/socket';
import api from '../../lib/axios';
import MessageItem from './MessageItem';
import { Message } from '../../types';

interface MessageListProps {
  channelId: string;
  onReply?: (msg: Message) => void;
}

export default function MessageList({ channelId, onReply }: MessageListProps) {
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

    const handleNewMessage = (message: Message) => {
      queryClient.setQueryData(['messages', channelId], (oldData: Message[] | undefined) => {
        if (!oldData) return [message];
        if (oldData.find((m) => m.id === message.id)) return oldData;
        return [...oldData, message];
      });
    };

    const handleReactionAdded = ({ entityId, emoji, userId, id }: { entityId: string, emoji: string, userId: string, id: string }) => {
      queryClient.setQueryData(['messages', channelId], (oldData: Message[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map((m) => m.id === entityId ? { ...m, reactions: [...(m.reactions || []), { id, emoji, userId }] } : m);
      });
    };

    const handleReactionRemoved = ({ entityId, id }: { entityId: string, id: string }) => {
      queryClient.setQueryData(['messages', channelId], (oldData: Message[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map((m) => m.id === entityId ? { ...m, reactions: m.reactions?.filter((r) => r.id !== id) } : m);
      });
    };

    const handleNewThreadReply = (message: Message) => {
      queryClient.setQueryData(['messages', channelId], (oldData: Message[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map((m) => m.id === message.parentId ? { ...m, _count: { replies: (m._count?.replies || 0) + 1 } } : m);
      });
    };

    socket.on('new_message', handleNewMessage);
    socket.on('reaction_added', handleReactionAdded);
    socket.on('reaction_removed', handleReactionRemoved);
    socket.on('new_thread_reply', handleNewThreadReply);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('reaction_added', handleReactionAdded);
      socket.off('reaction_removed', handleReactionRemoved);
      socket.off('new_thread_reply', handleNewThreadReply);
      leaveChannel(channelId);
    };
  }, [channelId, socket, joinChannel, leaveChannel, queryClient]);

  if (isLoading) return <div className="text-gray-500">Ładowanie wiadomości...</div>;

  return (
    <div className="space-y-6">
      {messages.map((msg: Message) => (
        <MessageItem key={msg.id} msg={msg} entityType="message" onReply={onReply ? () => onReply(msg) : undefined} />
      ))}
    </div>
  );
}
