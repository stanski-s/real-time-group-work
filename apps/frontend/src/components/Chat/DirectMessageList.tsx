'use client';

import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';
import { useSocketStore } from '../../store/socket';
import { useAuthStore } from '../../store/auth';
import MessageItem from './MessageItem';

interface DirectMessageListProps {
  workspaceId: string;
  otherUserId: string;
  onReply?: (msg: any) => void;
}

export default function DirectMessageList({ workspaceId, otherUserId, onReply }: DirectMessageListProps) {
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

    const handleReactionAdded = ({ entityId, emoji, userId, id }: any) => {
      queryClient.setQueryData(['dms', workspaceId, otherUserId], (old: any) => {
        if (!old) return old;
        return old.map((m: any) => m.id === entityId ? { ...m, reactions: [...(m.reactions || []), { id, emoji, userId }] } : m);
      });
    };

    const handleReactionRemoved = ({ entityId, id }: any) => {
      queryClient.setQueryData(['dms', workspaceId, otherUserId], (old: any) => {
        if (!old) return old;
        return old.map((m: any) => m.id === entityId ? { ...m, reactions: m.reactions?.filter((r: any) => r.id !== id) } : m);
      });
    };

    const handleNewDmThreadReply = (message: any) => {
      queryClient.setQueryData(['dms', workspaceId, otherUserId], (old: any) => {
        if (!old) return old;
        return old.map((m: any) => m.id === message.parentId ? { ...m, _count: { replies: (m._count?.replies || 0) + 1 } } : m);
      });
    };

    socket.on('new_dm', handleNewDm);
    socket.on('reaction_added', handleReactionAdded);
    socket.on('reaction_removed', handleReactionRemoved);
    socket.on('new_dm_thread_reply', handleNewDmThreadReply);

    return () => {
      socket.off('new_dm', handleNewDm);
      socket.off('reaction_added', handleReactionAdded);
      socket.off('reaction_removed', handleReactionRemoved);
      socket.off('new_dm_thread_reply', handleNewDmThreadReply);
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
        <MessageItem key={msg.id} msg={msg} entityType="directMessage" onReply={onReply ? () => onReply(msg) : undefined} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
