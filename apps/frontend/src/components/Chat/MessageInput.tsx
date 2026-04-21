'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Send, Loader2 } from 'lucide-react';
import api from '../../lib/axios';

interface MessageInputProps {
  channelId: string;
}

export default function MessageInput({ channelId }: MessageInputProps) {
  const [content, setContent] = useState('');

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const res = await api.post(`/messages/${channelId}`, { content });
      return res.data;
    },
    onSuccess: () => {
      setContent('');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    sendMessage.mutate(content);
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-[#1a1d21]">
      <div className="flex items-end gap-2 rounded-xl border border-gray-600 bg-[#222529] focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all shadow-sm pr-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder="Napisz wiadomość na #general"
          className="w-full bg-transparent px-4 py-3 text-white placeholder-gray-500 focus:outline-none resize-none max-h-32 min-h-[50px] text-[15px]"
          rows={1}
        />
        <button
          type="submit"
          disabled={!content.trim() || sendMessage.isPending}
          className="mb-2 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
        >
          {sendMessage.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </form>
  );
}
