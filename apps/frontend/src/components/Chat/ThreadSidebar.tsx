'use client';

import { X, SendHorizontal } from 'lucide-react';
import MessageItem from './MessageItem';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';
import { useState, useEffect, useRef } from 'react';
import { useSocketStore } from '../../store/socket';
import { useAuthStore } from '../../store/auth';

interface ThreadSidebarProps {
  message: any;
  entityType: 'message' | 'directMessage';
  channelId?: string;
  workspaceId?: string;
  otherUserId?: string;
  onClose: () => void;
}

export default function ThreadSidebar({ 
  message, 
  entityType, 
  channelId,
  workspaceId,
  otherUserId,
  onClose 
}: ThreadSidebarProps) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { socket } = useSocketStore();
  const { user } = useAuthStore();

  const { data: replies = [], isLoading } = useQuery({
    queryKey: ['thread', message.id],
    queryFn: async () => {
      const url = entityType === 'message' 
        ? `/messages/${channelId}/thread/${message.id}` 
        : `/dms/${workspaceId}/thread/${message.id}`;
      const res = await api.get(url);
      return res.data.replies;
    }
  });

  const sendReply = useMutation({
    mutationFn: async () => {
      const url = entityType === 'message' 
        ? `/messages/${channelId}` 
        : `/dms/${workspaceId}/${otherUserId}`;
      await api.post(url, { content, parentId: message.id });
    },
    onSuccess: () => {
      setContent('');
    }
  });

  useEffect(() => {
    if (!socket) return;
    
    const handleNewReply = (replyMsg: any) => {
      if (replyMsg.parentId === message.id) {
        queryClient.setQueryData(['thread', message.id], (old: any) => {
          if (!old) return [replyMsg];
          if (old.some((m: any) => m.id === replyMsg.id)) return old;
          return [...old, replyMsg];
        });
      }
    };

    const handleReactionAdded = ({ entityId, emoji, userId, id }: any) => {
      queryClient.setQueryData(['thread', message.id], (old: any) => {
        if (!old) return old;
        return old.map((m: any) => m.id === entityId ? { ...m, reactions: [...(m.reactions || []), { id, emoji, userId }] } : m);
      });
      if (message.id === entityId) {
      }
    };

    const handleReactionRemoved = ({ entityId, id }: any) => {
      queryClient.setQueryData(['thread', message.id], (old: any) => {
        if (!old) return old;
        return old.map((m: any) => m.id === entityId ? { ...m, reactions: m.reactions?.filter((r: any) => r.id !== id) } : m);
      });
    };

    if (entityType === 'message') {
      socket.on('new_thread_reply', handleNewReply);
    } else {
      socket.on('new_dm_thread_reply', handleNewReply);
    }
    
    socket.on('reaction_added', handleReactionAdded);
    socket.on('reaction_removed', handleReactionRemoved);

    return () => {
      socket.off('new_thread_reply', handleNewReply);
      socket.off('new_dm_thread_reply', handleNewReply);
      socket.off('reaction_added', handleReactionAdded);
      socket.off('reaction_removed', handleReactionRemoved);
    };
  }, [socket, message.id, entityType, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [replies]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || sendReply.isPending) return;
    sendReply.mutate();
  };

  return (
    <div className="w-80 flex-shrink-0 bg-[#1a1d21] border-l border-gray-800 flex flex-col z-10 shadow-lg">
      <div className="flex h-14 items-center justify-between border-b border-gray-800/50 px-4">
        <h2 className="font-bold text-white text-base">Wątek</h2>
        <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 flex flex-col">
        <div className="border-b border-gray-800 pb-4 mb-4">
          <MessageItem msg={message} entityType={entityType} />
        </div>
        
        <div className="flex-1 space-y-4">
          {isLoading ? (
            <div className="text-gray-500 text-sm">Ładowanie wątku...</div>
          ) : (
            replies.map((reply: any) => (
              <MessageItem key={reply.id} msg={reply} entityType={entityType} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="p-4 border-t border-gray-800">
        <form onSubmit={handleSubmit} className="relative rounded-xl border border-gray-700 bg-gray-800 shadow-sm focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Odpowiedz..."
            className="w-full resize-none bg-transparent py-3 pl-3 pr-10 text-gray-100 placeholder-gray-500 focus:outline-none min-h-[44px] max-h-32 text-sm"
            rows={1}
          />
          <button
            type="submit"
            disabled={!content.trim() || sendReply.isPending}
            className="absolute bottom-2 right-2 rounded-lg p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
          >
            <SendHorizontal className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
