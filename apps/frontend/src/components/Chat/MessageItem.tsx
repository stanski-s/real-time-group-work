'use client';

import { MessageSquareReply } from 'lucide-react';
import ReactionMenu from './ReactionMenu';
import { useAuthStore } from '../../store/auth';
import { useMutation } from '@tanstack/react-query';
import api from '../../lib/axios';
import { Message, Reaction } from '../../types';

interface MessageItemProps {
  msg: Message;
  entityType: 'message' | 'directMessage';
  onReply?: () => void;
}

export default function MessageItem({ msg, entityType, onReply }: MessageItemProps) {
  const { user } = useAuthStore();

  const toggleReaction = useMutation({
    mutationFn: async (emoji: string) => {
      const existing = msg.reactions?.find((r: Reaction) => r.emoji === emoji && r.userId === user?.id);
      if (existing) {
        await api.delete('/reactions', { data: { emoji, entityId: msg.id, entityType } });
      } else {
        await api.post('/reactions', { emoji, entityId: msg.id, entityType });
      }
    }
  });

  const groupedReactions = msg.reactions?.reduce((acc: Record<string, string[]>, r: Reaction) => {
    acc[r.emoji] = acc[r.emoji] || [];
    acc[r.emoji].push(r.userId);
    return acc;
  }, {}) || {};

  return (
    <div className="flex items-start gap-4 hover:bg-gray-800/30 p-2 rounded-lg transition-colors group relative">
      {/* Actions (Hover) */}
      <div className="absolute right-4 -top-3 hidden group-hover:flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-lg p-1 shadow-sm">
        <ReactionMenu onReact={(emoji) => toggleReaction.mutate(emoji)} />
        {onReply && (
          <button onClick={onReply} className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors" title="Odpowiedz w wątku">
            <MessageSquareReply className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-indigo-500/20 flex items-center justify-center overflow-hidden">
        {msg.author.image ? (
          <img src={msg.author.image} alt={msg.author.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-indigo-400 font-bold">{msg.author.name?.charAt(0).toUpperCase() || '?'}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-bold text-gray-200">{msg.author.name}</span>
          <span className="text-xs text-gray-500">
            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <p className="text-gray-300 mt-1 break-words">{msg.content}</p>
        
        {/* Reactions List */}
        {Object.keys(groupedReactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {Object.entries(groupedReactions).map(([emoji, userIds]) => {
              const hasReacted = userIds.includes(user?.id || '');
              return (
                <button
                  key={emoji}
                  onClick={() => toggleReaction.mutate(emoji)}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border transition-colors ${
                    hasReacted 
                      ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-200' 
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <span>{emoji}</span>
                  <span className="font-medium">{userIds.length}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Replies indicator */}
        {(msg._count?.replies ?? 0) > 0 && onReply && (
          <button 
            onClick={onReply}
            className="mt-2 text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            {msg._count?.replies} {msg._count?.replies === 1 ? 'odpowiedź' : 'odpowiedzi'}
          </button>
        )}
      </div>
    </div>
  );
}
